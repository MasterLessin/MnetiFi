import type { Tenant, WifiUser, Plan, Transaction } from "@shared/schema";

interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: string;
  balance?: string;
}

interface MobitechResponse {
  status_code: string;
  status_desc: string;
  message_id: number | string;
  mobile_number: string;
  network_id: string;
  message_cost: string;
  credit_balance: string;
}

interface MobitechBalanceResponse {
  status_code: string;
  status_desc: string;
  credit_balance: string;
}

interface DeliveryReport {
  messageId: string;
  dlrTime: string;
  dlrStatus: number;
  dlrDesc: string;
  tat?: number;
  network?: number;
  destaddr: string;
  sourceaddr: string;
  origin?: string;
}

const MOBITECH_BASE_URL = "https://app.mobitechtechnologies.com";
const SENDER_NAME = "MNETIFI";

export class SmsService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.MOBITECH_API_KEY || "";
  }

  async sendSms(phoneNumber: string, message: string): Promise<SmsResult> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    
    console.log(`[SMS] Sending to ${formattedPhone}: ${message.substring(0, 50)}...`);

    if (!this.apiKey) {
      console.log("[SMS] No API key configured, using mock mode");
      return this.sendMock(formattedPhone, message);
    }

    return this.sendViaMobitech(formattedPhone, message);
  }

  private async sendViaMobitech(phone: string, message: string): Promise<SmsResult> {
    try {
      const response = await fetch(`${MOBITECH_BASE_URL}/sms/sendsms`, {
        method: "POST",
        headers: {
          "h_api_key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: phone,
          response_type: "json",
          sender_name: SENDER_NAME,
          service_id: 0,
          message: message,
        }),
      });

      const data = await response.json() as MobitechResponse[];
      
      if (Array.isArray(data) && data.length > 0) {
        const result = data[0];
        
        if (result.status_code === "1000") {
          console.log(`[SMS] Mobitech message sent: ${result.message_id}, cost: ${result.message_cost}`);
          return {
            success: true,
            messageId: String(result.message_id),
            cost: result.message_cost,
            balance: result.credit_balance,
          };
        }

        console.error(`[SMS] Mobitech error: ${result.status_code} - ${result.status_desc}`);
        return {
          success: false,
          error: `${result.status_code}: ${result.status_desc}`,
        };
      }

      return { success: false, error: "Invalid response from Mobitech" };
    } catch (error) {
      console.error("[SMS] Mobitech request error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Mobitech request failed",
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

  async getBalance(): Promise<{ success: boolean; balance?: string; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: "API key not configured" };
    }

    try {
      const response = await fetch(`${MOBITECH_BASE_URL}/sms/getbalance`, {
        method: "GET",
        headers: {
          "h_api_key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json() as MobitechBalanceResponse;
      
      if (data.status_code === "1000") {
        return { success: true, balance: data.credit_balance };
      }

      return { success: false, error: data.status_desc };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get balance",
      };
    }
  }

  async validatePhoneNumber(phone: string): Promise<{ valid: boolean; network?: string; formatted?: string }> {
    const formatted = this.formatPhoneNumber(phone);
    
    if (!this.apiKey) {
      return { valid: true, formatted };
    }

    try {
      const response = await fetch(
        `${MOBITECH_BASE_URL}/sms/mobile?mobile=${formatted.replace('+', '')}&return=json`,
        {
          method: "GET",
          headers: {
            "h_api_key": this.apiKey,
          },
        }
      );

      const data = await response.json();
      return {
        valid: true,
        network: data.network_name || "Unknown",
        formatted,
      };
    } catch (error) {
      return { valid: false };
    }
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

  async sendOtp(phoneNumber: string, otp: string): Promise<SmsResult> {
    const message = `MnetiFi: Your verification code is ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    return this.sendSms(phoneNumber, message);
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

  async sendIspOtp(phoneNumber: string, otp: string, ispName: string): Promise<SmsResult> {
    const message = `MnetiFi Platform: Your verification code for ${ispName} is ${otp}. Valid for 5 minutes. Do not share this code.`;
    return this.sendSms(phoneNumber, message);
  }

  async sendIspPaymentConfirmation(phoneNumber: string, amount: number, ispName: string, planName: string): Promise<SmsResult> {
    const message = `MnetiFi: Payment of Ksh ${amount} received for ${ispName}. Your ${planName} subscription is now active. Thank you!`;
    return this.sendSms(phoneNumber, message);
  }

  async sendIspExpiryReminder(phoneNumber: string, ispName: string, daysRemaining: number): Promise<SmsResult> {
    const message = `MnetiFi Platform: ${ispName}, your subscription expires in ${daysRemaining} days. Renew now to avoid service interruption.`;
    return this.sendSms(phoneNumber, message);
  }

  async sendIspSuspensionNotice(phoneNumber: string, ispName: string): Promise<SmsResult> {
    const message = `MnetiFi Platform: ${ispName}, your account has been suspended due to non-payment. Please contact support to reactivate.`;
    return this.sendSms(phoneNumber, message);
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

  static processDeliveryReport(report: DeliveryReport): {
    messageId: string;
    status: "delivered" | "failed" | "pending";
    description: string;
    deliveredAt?: Date;
  } {
    const statusMap: Record<number, "delivered" | "failed" | "pending"> = {
      1: "delivered",
      2: "failed",
      3: "pending",
    };

    return {
      messageId: String(report.messageId),
      status: statusMap[report.dlrStatus] || "pending",
      description: report.dlrDesc,
      deliveredAt: report.dlrStatus === 1 ? new Date(report.dlrTime) : undefined,
    };
  }
}

let smsServiceInstance: SmsService | null = null;

export function getSmsService(): SmsService {
  if (!smsServiceInstance) {
    smsServiceInstance = new SmsService();
  }
  return smsServiceInstance;
}

export function createSmsService(): SmsService {
  return new SmsService();
}

export const SmsTemplates = {
  otp: (code: string) =>
    `MnetiFi: Your verification code is ${code}. Valid for 5 minutes.`,
  
  paymentConfirmation: (amount: number, planName: string, duration: string, receipt: string) =>
    `MnetiFi: Payment of Ksh ${amount} received! Your ${planName} plan is now active. Expires in ${duration}. Receipt: ${receipt}`,
  
  expiryReminder: (hours: number) =>
    `MnetiFi: Your WiFi plan expires in ${hours} hours. Recharge now to stay connected!`,
  
  expiryNotification: () =>
    `MnetiFi: Your WiFi plan has expired. Recharge now to restore your connection.`,
  
  welcome: () =>
    `Welcome to MnetiFi WiFi! Connect to our hotspot and select a plan to get started.`,

  ispOtp: (code: string, ispName: string) =>
    `MnetiFi Platform: Your verification code for ${ispName} is ${code}. Valid for 5 minutes.`,
  
  ispPaymentConfirmation: (amount: number, ispName: string, plan: string) =>
    `MnetiFi: Payment of Ksh ${amount} received for ${ispName}. Your ${plan} subscription is now active.`,
  
  ispExpiryReminder: (ispName: string, days: number) =>
    `MnetiFi Platform: ${ispName}, your subscription expires in ${days} days. Renew now.`,
};
