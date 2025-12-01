import type { Tenant } from "@shared/schema";

interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface QueryStatusResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}

interface DarajaTokenResponse {
  access_token: string;
  expires_in: string;
}

export class MpesaService {
  private baseUrl: string;
  private tenant: Tenant;

  constructor(tenant: Tenant, sandbox: boolean = true) {
    this.tenant = tenant;
    this.baseUrl = sandbox
      ? "https://sandbox.safaricom.co.ke"
      : "https://api.safaricom.co.ke";
  }

  private async getAccessToken(): Promise<string> {
    const consumerKey = this.tenant.mpesaConsumerKey;
    const consumerSecret = this.tenant.mpesaConsumerSecret;

    if (!consumerKey || !consumerSecret) {
      throw new Error("M-Pesa credentials not configured for this tenant");
    }

    const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    const response = await fetch(
      `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get M-Pesa access token: ${response.statusText}`);
    }

    const data: DarajaTokenResponse = await response.json();
    return data.access_token;
  }

  private generatePassword(): { password: string; timestamp: string } {
    const shortcode = this.tenant.mpesaShortcode;
    const passkey = this.tenant.mpesaPasskey;

    if (!shortcode || !passkey) {
      throw new Error("M-Pesa shortcode or passkey not configured");
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.Z]/g, "")
      .slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

    return { password, timestamp };
  }

  async initiateSTKPush(
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
    callbackUrl: string
  ): Promise<StkPushResponse> {
    const accessToken = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();
    const shortcode = this.tenant.mpesaShortcode;

    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    };

    const response = await fetch(
      `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`STK Push failed: ${errorText}`);
    }

    return response.json();
  }

  async queryTransactionStatus(checkoutRequestId: string): Promise<QueryStatusResponse> {
    const accessToken = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();
    const shortcode = this.tenant.mpesaShortcode;

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const response = await fetch(
      `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Query status failed: ${errorText}`);
    }

    return response.json();
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

    return cleaned;
  }

  static verifyCallbackSignature(
    body: string,
    signature: string,
    secret: string
  ): boolean {
    return true;
  }
}
