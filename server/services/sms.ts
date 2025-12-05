import type { Tenant, WifiUser, Plan, Transaction } from "@shared/schema";

interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SmsConfig {
  provider: "africas_talking" | "twilio" | "mock";
  apiKey?: string;
  username?: string;
  senderId?: string;
}

export class SmsService {
  private config: SmsConfig;
  private tenant: Tenant;

  constructor(tenant: Tenant, config?: SmsConfig) {
    this.tenant = tenant;
    this.config = config || { provider: "mock" };
  }

  async sendSms(phoneNumber: string, message: string): Promise<SmsResult> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    
    console.log(`[SMS] Sending to ${formattedPhone}: ${message.substring(0, 50)}...`);

    switch (this.config.provider) {
      case "africas_talking":
        return this.sendViaAfricasTalking(formattedPhone, message);
      case "twilio":
        return this.sendViaTwilio(formattedPhone, message);
      case "mock":
      default:
        return this.sendMock(formattedPhone, message);
    }
  }

  private async sendViaAfricasTalking(phone: string, message: string): Promise<SmsResult> {
    try {
      const apiKey = this.config.apiKey;
      const username = this.config.username || "sandbox";
      
      if (!apiKey) {
        return { success: false, error: "Africa's Talking API key not configured" };
      }

      const isSandbox = username === "sandbox";
      const baseUrl = isSandbox 
        ? "https://api.sandbox.africastalking.com"
        : "https://api.africastalking.com";

      const response = await fetch(`${baseUrl}/version1/messaging`, {
        method: "POST",
        headers: {
          "apiKey": apiKey,
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: new URLSearchParams({
          username,
          to: phone,
          message,
          from: this.config.senderId || "",
        }),
      });

      const data = await response.json();
      
      if (data.SMSMessageData?.Recipients?.[0]?.status === "Success") {
        return { 
          success: true, 
          messageId: data.SMSMessageData.Recipients[0].messageId 
        };
      }

      return { 
        success: false, 
        error: data.SMSMessageData?.Message || "Failed to send SMS" 
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  }

  private async sendViaTwilio(phone: string, message: string): Promise<SmsResult> {
    try {
      const accountSid = this.config.apiKey;
      const authToken = this.config.username; // Using username field to store auth token for Twilio
      const fromNumber = this.config.senderId || "+15005550006"; // Twilio phone number

      if (!accountSid || !authToken) {
        return { success: false, error: "Twilio credentials not configured" };
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      
      const formData = new URLSearchParams();
      formData.append("To", phone);
      formData.append("From", fromNumber);
      formData.append("Body", message);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[SMS] Twilio error:", errorData);
        return {
          success: false,
          error: errorData.message || `Twilio API error: ${response.status}`,
        };
      }

      const data = await response.json();
      console.log(`[SMS] Twilio message sent: ${data.sid}`);
      
      return {
        success: true,
        messageId: data.sid,
      };
    } catch (error) {
      console.error("[SMS] Twilio request error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Twilio request failed",
      };
    }
  }

  private async sendMock(phone: string, message: string): Promise<SmsResult> {
    console.log(`[SMS Mock] To: ${phone}`);
    console.log(`[SMS Mock] Message: ${message}`);
    
    return { 
      success: true, 
      messageId: `MOCK_${Date.now()}_${Math.random().toString(36).substring(7)}` 
    };
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, "");
    
    if (cleaned.startsWith("0")) {
      cleaned = "254" + cleaned.slice(1);
    } else if (cleaned.startsWith("+")) {
      cleaned = cleaned.slice(1);
    } else if (!cleaned.startsWith("254")) {
      cleaned = "254" + cleaned;
    }

    return "+" + cleaned;
  }

  async sendPaymentConfirmation(user: WifiUser, transaction: Transaction, plan: Plan): Promise<SmsResult> {
    const message = `MnetiFi: Payment of Ksh ${transaction.amount} received! Your ${plan.name} plan is now active. Expires in ${this.formatDuration(plan.durationSeconds)}. Receipt: ${transaction.mpesaReceiptNumber || "Processing"}`;
    
    return this.sendSms(user.phoneNumber, message);
  }

  async sendExpiryReminder(user: WifiUser, hoursRemaining: number): Promise<SmsResult> {
    const message = `MnetiFi: Your WiFi plan expires in ${hoursRemaining} hours. Recharge now to stay connected! Visit our portal or dial *123# to purchase a new plan.`;
    
    return this.sendSms(user.phoneNumber, message);
  }

  async sendExpiryNotification(user: WifiUser): Promise<SmsResult> {
    const message = `MnetiFi: Your WiFi plan has expired. Recharge now to restore your connection. Visit our portal or dial *123# to purchase a new plan.`;
    
    return this.sendSms(user.phoneNumber, message);
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<SmsResult> {
    const message = `MnetiFi: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    
    return this.sendSms(phoneNumber, message);
  }

  async sendWelcome(user: WifiUser): Promise<SmsResult> {
    const message = `Welcome to MnetiFi WiFi! Your account has been created. Connect to our hotspot and select a plan to get started. Need help? Call support.`;
    
    return this.sendSms(user.phoneNumber, message);
  }

  async sendSuspensionNotice(user: WifiUser, reason: string): Promise<SmsResult> {
    const message = `MnetiFi: Your WiFi account has been suspended. Reason: ${reason}. Please contact support for assistance.`;
    
    return this.sendSms(user.phoneNumber, message);
  }

  async sendReactivationNotice(user: WifiUser): Promise<SmsResult> {
    const message = `MnetiFi: Your WiFi account has been reactivated. You can now connect and browse. Thank you for your patience!`;
    
    return this.sendSms(user.phoneNumber, message);
  }

  private formatDuration(seconds: number): string {
    if (seconds < 3600) {
      return `${Math.round(seconds / 60)} minutes`;
    } else if (seconds < 86400) {
      return `${Math.round(seconds / 3600)} hours`;
    } else if (seconds < 604800) {
      return `${Math.round(seconds / 86400)} days`;
    } else {
      return `${Math.round(seconds / 604800)} weeks`;
    }
  }
}

export function createSmsService(tenant: Tenant, config?: SmsConfig): SmsService {
  return new SmsService(tenant, config);
}

export const SmsTemplates = {
  paymentConfirmation: (amount: number, planName: string, duration: string, receipt: string) =>
    `MnetiFi: Payment of Ksh ${amount} received! Your ${planName} plan is now active. Expires in ${duration}. Receipt: ${receipt}`,
  
  expiryReminder: (hours: number) =>
    `MnetiFi: Your WiFi plan expires in ${hours} hours. Recharge now to stay connected!`,
  
  expiryNotification: () =>
    `MnetiFi: Your WiFi plan has expired. Recharge now to restore your connection.`,
  
  otp: (code: string) =>
    `MnetiFi: Your verification code is ${code}. Valid for 5 minutes.`,
  
  welcome: () =>
    `Welcome to MnetiFi WiFi! Connect to our hotspot and select a plan to get started.`,
};
