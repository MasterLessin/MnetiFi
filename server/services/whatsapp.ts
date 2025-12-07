import type { Tenant, WifiUser, Plan, Transaction } from "@shared/schema";

interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface WhatsAppConfig {
  provider: "meta" | "twilio" | "mock";
  apiKey?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
}

export class WhatsAppService {
  private config: WhatsAppConfig;
  private tenant: Tenant;

  constructor(tenant: Tenant, config?: WhatsAppConfig) {
    this.tenant = tenant;
    this.config = config || { provider: "mock" };
  }

  async sendMessage(phoneNumber: string, message: string): Promise<WhatsAppResult> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    
    console.log(`[WhatsApp] Sending to ${formattedPhone}: ${message.substring(0, 50)}...`);

    switch (this.config.provider) {
      case "meta":
        return this.sendViaMeta(formattedPhone, message);
      case "twilio":
        return this.sendViaTwilio(formattedPhone, message);
      case "mock":
      default:
        return this.sendMock(formattedPhone, message);
    }
  }

  private async sendViaMeta(phone: string, message: string): Promise<WhatsAppResult> {
    try {
      const accessToken = this.config.apiKey;
      const phoneNumberId = this.config.phoneNumberId;
      
      if (!accessToken || !phoneNumberId) {
        return { success: false, error: "Meta WhatsApp API credentials not configured" };
      }

      const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone.replace("+", ""),
          type: "text",
          text: {
            preview_url: false,
            body: message,
          },
        }),
      });

      const data = await response.json();
      
      if (data.messages?.[0]?.id) {
        console.log(`[WhatsApp] Meta message sent: ${data.messages[0].id}`);
        return { 
          success: true, 
          messageId: data.messages[0].id 
        };
      }

      console.error("[WhatsApp] Meta API error:", data);
      return { 
        success: false, 
        error: data.error?.message || "Failed to send WhatsApp message" 
      };
    } catch (error) {
      console.error("[WhatsApp] Meta request error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Meta WhatsApp request failed",
      };
    }
  }

  private async sendViaTwilio(phone: string, message: string): Promise<WhatsAppResult> {
    try {
      const accountSid = this.config.apiKey;
      const authToken = this.config.phoneNumberId;
      const fromNumber = this.config.businessAccountId || "+14155238886";

      if (!accountSid || !authToken) {
        return { success: false, error: "Twilio WhatsApp credentials not configured" };
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
      
      const formData = new URLSearchParams();
      formData.append("To", `whatsapp:${phone}`);
      formData.append("From", `whatsapp:${fromNumber}`);
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
        console.error("[WhatsApp] Twilio error:", errorData);
        return {
          success: false,
          error: errorData.message || `Twilio API error: ${response.status}`,
        };
      }

      const data = await response.json();
      console.log(`[WhatsApp] Twilio message sent: ${data.sid}`);
      
      return {
        success: true,
        messageId: data.sid,
      };
    } catch (error) {
      console.error("[WhatsApp] Twilio request error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Twilio WhatsApp request failed",
      };
    }
  }

  private async sendMock(phone: string, message: string): Promise<WhatsAppResult> {
    console.log(`[WhatsApp Mock] To: ${phone}`);
    console.log(`[WhatsApp Mock] Message: ${message}`);
    
    return { 
      success: true, 
      messageId: `WA_MOCK_${Date.now()}_${Math.random().toString(36).substring(7)}` 
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

  async sendPaymentConfirmation(user: WifiUser, transaction: Transaction, plan: Plan): Promise<WhatsAppResult> {
    const message = `*MnetiFi WiFi - Payment Received*\n\nAmount: Ksh ${transaction.amount}\nPlan: ${plan.name}\nDuration: ${this.formatDuration(plan.durationSeconds)}\nReceipt: ${transaction.mpesaReceiptNumber || "Processing"}\n\nThank you for your payment!`;
    
    return this.sendMessage(user.phoneNumber, message);
  }

  async sendExpiryReminder(user: WifiUser, hoursRemaining: number): Promise<WhatsAppResult> {
    const message = `*MnetiFi WiFi - Expiry Reminder*\n\nYour WiFi plan expires in *${hoursRemaining} hours*.\n\nRecharge now to stay connected! Visit our portal or dial *123# to purchase a new plan.`;
    
    return this.sendMessage(user.phoneNumber, message);
  }

  async sendExpiryNotification(user: WifiUser): Promise<WhatsAppResult> {
    const message = `*MnetiFi WiFi - Plan Expired*\n\nYour WiFi plan has expired.\n\nRecharge now to restore your connection. Visit our portal or dial *123# to purchase a new plan.`;
    
    return this.sendMessage(user.phoneNumber, message);
  }

  async sendVoucherCode(phoneNumber: string, code: string, planName: string, duration: string): Promise<WhatsAppResult> {
    const message = `*MnetiFi WiFi - Your Access Code*\n\nVoucher Code: *${code}*\nPlan: ${planName}\nValidity: ${duration}\n\nConnect to our hotspot and enter this code to get started.`;
    
    return this.sendMessage(phoneNumber, message);
  }

  async sendWelcome(user: WifiUser): Promise<WhatsAppResult> {
    const message = `*Welcome to MnetiFi WiFi!*\n\nYour account has been created successfully.\n\nConnect to our hotspot and select a plan to get started. Need help? Reply to this message or call our support line.`;
    
    return this.sendMessage(user.phoneNumber, message);
  }

  async sendSuspensionNotice(user: WifiUser, reason: string): Promise<WhatsAppResult> {
    const message = `*MnetiFi WiFi - Account Suspended*\n\nYour WiFi account has been suspended.\n\nReason: ${reason}\n\nPlease contact support for assistance.`;
    
    return this.sendMessage(user.phoneNumber, message);
  }

  async sendReactivationNotice(user: WifiUser): Promise<WhatsAppResult> {
    const message = `*MnetiFi WiFi - Account Reactivated*\n\nYour WiFi account has been reactivated.\n\nYou can now connect and browse. Thank you for your patience!`;
    
    return this.sendMessage(user.phoneNumber, message);
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

export function createWhatsAppService(tenant: Tenant, config?: WhatsAppConfig): WhatsAppService {
  return new WhatsAppService(tenant, config);
}

export const WhatsAppTemplates = {
  paymentConfirmation: (amount: number, planName: string, duration: string, receipt: string) =>
    `*MnetiFi WiFi - Payment Received*\n\nAmount: Ksh ${amount}\nPlan: ${planName}\nDuration: ${duration}\nReceipt: ${receipt}\n\nThank you!`,
  
  expiryReminder: (hours: number) =>
    `*MnetiFi WiFi - Expiry Reminder*\n\nYour plan expires in *${hours} hours*. Recharge now!`,
  
  expiryNotification: () =>
    `*MnetiFi WiFi - Plan Expired*\n\nYour plan has expired. Recharge to reconnect.`,
  
  voucherCode: (code: string, planName: string, duration: string) =>
    `*MnetiFi WiFi - Access Code*\n\nCode: *${code}*\nPlan: ${planName}\nValidity: ${duration}`,
  
  welcome: () =>
    `*Welcome to MnetiFi WiFi!*\n\nConnect to our hotspot and select a plan to get started.`,
};
