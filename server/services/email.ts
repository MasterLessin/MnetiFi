import { Resend } from 'resend';

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface EmailSettings {
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  logoUrl?: string;
  primaryColor?: string;
  footerText?: string;
}

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail
  };
}

const DEFAULT_SETTINGS: EmailSettings = {
  fromEmail: 'noreply@mnetifi.com',
  fromName: 'MnetiFi Platform',
  primaryColor: '#22d3ee',
  footerText: 'MnetiFi - Kenya\'s Leading WiFi Billing Platform'
};

function generateEmailTemplate(content: string, settings: EmailSettings = DEFAULT_SETTINGS): string {
  const primaryColor = settings.primaryColor || DEFAULT_SETTINGS.primaryColor;
  const footerText = settings.footerText || DEFAULT_SETTINGS.footerText;
  const logoUrl = settings.logoUrl || '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MnetiFi</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95)); border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, ${primaryColor}20, #a855f720); border-bottom: 1px solid rgba(255,255,255,0.1);">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    ${logoUrl ? `<img src="${logoUrl}" alt="MnetiFi" style="height: 40px; width: auto;">` : `
                    <div style="display: flex; align-items: center;">
                      <div style="width: 40px; height: 40px; background: linear-gradient(135deg, ${primaryColor}, #a855f7); border-radius: 10px; display: inline-block; margin-right: 12px;"></div>
                      <span style="font-size: 24px; font-weight: 700; color: white;">MnetiFi</span>
                    </div>
                    `}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; color: #64748b; font-size: 12px; text-align: center;">
                ${footerText}
              </p>
              <p style="margin: 8px 0 0; color: #475569; font-size: 11px; text-align: center;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export class EmailService {
  private settings: EmailSettings;

  constructor(settings?: Partial<EmailSettings>) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  async sendEmail(to: string, subject: string, htmlContent: string): Promise<EmailResult> {
    try {
      const { client, fromEmail } = await getResendClient();
      
      const html = generateEmailTemplate(htmlContent, this.settings);
      
      const result = await client.emails.send({
        from: `${this.settings.fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
        replyTo: this.settings.replyTo,
      });

      if (result.error) {
        console.error('[Email] Send error:', result.error);
        return { success: false, error: result.error.message };
      }

      console.log(`[Email] Sent to ${to}: ${subject}`);
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      console.error('[Email] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  async sendVerificationEmail(to: string, ispName: string, verificationCode: string): Promise<EmailResult> {
    const content = `
      <h1 style="margin: 0 0 24px; color: white; font-size: 28px; font-weight: 600;">
        Verify Your Email
      </h1>
      <p style="margin: 0 0 24px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
        Welcome to MnetiFi! Please use the verification code below to complete your ISP account registration for <strong style="color: white;">${ispName}</strong>.
      </p>
      <div style="background: linear-gradient(135deg, #22d3ee20, #a855f720); border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0;">
        <p style="margin: 0 0 8px; color: #94a3b8; font-size: 14px;">Your verification code:</p>
        <p style="margin: 0; color: white; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: monospace;">
          ${verificationCode}
        </p>
      </div>
      <p style="margin: 0 0 16px; color: #94a3b8; font-size: 14px;">
        This code will expire in <strong style="color: white;">10 minutes</strong>.
      </p>
      <p style="margin: 0; color: #64748b; font-size: 13px;">
        If you didn't request this verification, please ignore this email.
      </p>
    `;

    return this.sendEmail(to, `Verify your MnetiFi account - ${verificationCode}`, content);
  }

  async sendWelcomeEmail(to: string, ispName: string, subdomain: string): Promise<EmailResult> {
    const dashboardUrl = `https://${subdomain}.mnetifi.com/dashboard`;
    
    const content = `
      <h1 style="margin: 0 0 24px; color: white; font-size: 28px; font-weight: 600;">
        Welcome to MnetiFi!
      </h1>
      <p style="margin: 0 0 24px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
        Congratulations! Your ISP account <strong style="color: white;">${ispName}</strong> has been successfully created. You now have access to Kenya's leading WiFi billing platform.
      </p>
      
      <div style="background: linear-gradient(135deg, #22d3ee10, #a855f710); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.1);">
        <h2 style="margin: 0 0 16px; color: white; font-size: 18px;">Getting Started</h2>
        <ul style="margin: 0; padding-left: 20px; color: #94a3b8; line-height: 2;">
          <li>Configure your M-Pesa integration</li>
          <li>Set up your hotspot plans and pricing</li>
          <li>Add your MikroTik routers</li>
          <li>Customize your captive portal</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #22d3ee, #a855f7); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Access Your Dashboard
        </a>
      </div>

      <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center;">
        Your 24-hour free trial has started. Explore all premium features!
      </p>
    `;

    return this.sendEmail(to, `Welcome to MnetiFi - ${ispName}`, content);
  }

  async sendPaymentConfirmationEmail(
    to: string,
    ispName: string,
    amount: number,
    planName: string,
    expiryDate: Date,
    receiptNumber?: string
  ): Promise<EmailResult> {
    const formattedAmount = new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);

    const formattedExpiry = new Intl.DateTimeFormat('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(expiryDate);

    const content = `
      <h1 style="margin: 0 0 24px; color: white; font-size: 28px; font-weight: 600;">
        Payment Confirmed
      </h1>
      <p style="margin: 0 0 24px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
        Thank you for your payment! Your MnetiFi subscription for <strong style="color: white;">${ispName}</strong> has been renewed.
      </p>
      
      <div style="background: linear-gradient(135deg, #22d3ee10, #a855f710); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.1);">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Plan</td>
            <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right; font-weight: 600;">${planName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Amount</td>
            <td style="padding: 8px 0; color: #22d3ee; font-size: 14px; text-align: right; font-weight: 600;">${formattedAmount}</td>
          </tr>
          ${receiptNumber ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Receipt</td>
            <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right; font-family: monospace;">${receiptNumber}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Valid Until</td>
            <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right;">${formattedExpiry}</td>
          </tr>
        </table>
      </div>

      <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center;">
        Your subscription will automatically renew unless cancelled.
      </p>
    `;

    return this.sendEmail(to, `Payment Confirmed - ${formattedAmount} for ${planName}`, content);
  }

  async sendExpiryNoticeEmail(
    to: string,
    ispName: string,
    planName: string,
    expiryDate: Date,
    daysRemaining: number
  ): Promise<EmailResult> {
    const formattedExpiry = new Intl.DateTimeFormat('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(expiryDate);

    const urgencyColor = daysRemaining <= 1 ? '#ef4444' : daysRemaining <= 3 ? '#f59e0b' : '#22d3ee';

    const content = `
      <h1 style="margin: 0 0 24px; color: white; font-size: 28px; font-weight: 600;">
        Subscription Expiring Soon
      </h1>
      <p style="margin: 0 0 24px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
        Your MnetiFi subscription for <strong style="color: white;">${ispName}</strong> is expiring soon. Renew now to avoid service interruption.
      </p>
      
      <div style="background: ${urgencyColor}15; border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0; border: 1px solid ${urgencyColor}30;">
        <p style="margin: 0 0 8px; color: #94a3b8; font-size: 14px;">Time Remaining:</p>
        <p style="margin: 0; color: ${urgencyColor}; font-size: 48px; font-weight: 700;">
          ${daysRemaining} ${daysRemaining === 1 ? 'Day' : 'Days'}
        </p>
        <p style="margin: 16px 0 0; color: #64748b; font-size: 13px;">
          Expires: ${formattedExpiry}
        </p>
      </div>

      <div style="background: linear-gradient(135deg, #22d3ee10, #a855f710); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid rgba(255,255,255,0.1);">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Current Plan</td>
            <td style="padding: 8px 0; color: white; font-size: 14px; text-align: right; font-weight: 600;">${planName}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://mnetifi.com/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #22d3ee, #a855f7); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Renew Now
        </a>
      </div>

      <p style="margin: 0; color: #64748b; font-size: 13px; text-align: center;">
        If you don't renew, your service will be suspended after expiry.
      </p>
    `;

    return this.sendEmail(to, `Action Required: Your ${planName} subscription expires in ${daysRemaining} days`, content);
  }

  async sendPasswordResetEmail(to: string, resetToken: string, ispName?: string): Promise<EmailResult> {
    const resetUrl = `https://mnetifi.com/reset-password/${resetToken}`;
    
    const content = `
      <h1 style="margin: 0 0 24px; color: white; font-size: 28px; font-weight: 600;">
        Reset Your Password
      </h1>
      <p style="margin: 0 0 24px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
        We received a request to reset the password for your MnetiFi account${ispName ? ` (${ispName})` : ''}. Click the button below to create a new password.
      </p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #22d3ee, #a855f7); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>

      <p style="margin: 0 0 16px; color: #94a3b8; font-size: 14px;">
        This link will expire in <strong style="color: white;">1 hour</strong>.
      </p>

      <div style="background: rgba(239, 68, 68, 0.1); border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px solid rgba(239, 68, 68, 0.2);">
        <p style="margin: 0; color: #94a3b8; font-size: 13px;">
          <strong style="color: #ef4444;">Security Notice:</strong> If you didn't request this password reset, please ignore this email and your password will remain unchanged.
        </p>
      </div>

      <p style="margin: 0; color: #64748b; font-size: 12px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="color: #22d3ee; word-break: break-all;">${resetUrl}</span>
      </p>
    `;

    return this.sendEmail(to, 'Reset Your MnetiFi Password', content);
  }

  async sendAccountSuspendedEmail(to: string, ispName: string, reason: string): Promise<EmailResult> {
    const content = `
      <h1 style="margin: 0 0 24px; color: white; font-size: 28px; font-weight: 600;">
        Account Suspended
      </h1>
      <p style="margin: 0 0 24px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
        Your MnetiFi account for <strong style="color: white;">${ispName}</strong> has been suspended.
      </p>
      
      <div style="background: rgba(239, 68, 68, 0.1); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid rgba(239, 68, 68, 0.2);">
        <p style="margin: 0 0 8px; color: #64748b; font-size: 14px;">Reason:</p>
        <p style="margin: 0; color: white; font-size: 16px;">${reason}</p>
      </div>

      <p style="margin: 0 0 24px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
        To restore your account, please contact our support team or complete any outstanding payments.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="mailto:support@mnetifi.com" style="display: inline-block; background: linear-gradient(135deg, #22d3ee, #a855f7); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Contact Support
        </a>
      </div>
    `;

    return this.sendEmail(to, `Account Suspended - ${ispName}`, content);
  }

  async sendAccountReactivatedEmail(to: string, ispName: string): Promise<EmailResult> {
    const content = `
      <h1 style="margin: 0 0 24px; color: white; font-size: 28px; font-weight: 600;">
        Account Reactivated
      </h1>
      <p style="margin: 0 0 24px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
        Great news! Your MnetiFi account for <strong style="color: white;">${ispName}</strong> has been reactivated.
      </p>
      
      <div style="background: linear-gradient(135deg, #22d3ee10, #10b98110); border-radius: 12px; padding: 24px; text-align: center; margin: 32px 0; border: 1px solid rgba(16, 185, 129, 0.2);">
        <p style="margin: 0; color: #10b981; font-size: 48px;">&#10003;</p>
        <p style="margin: 8px 0 0; color: white; font-size: 18px; font-weight: 600;">All Services Restored</p>
      </div>

      <p style="margin: 0 0 24px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
        You now have full access to your dashboard and all platform features. Thank you for your continued trust in MnetiFi.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://mnetifi.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #22d3ee, #a855f7); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Go to Dashboard
        </a>
      </div>
    `;

    return this.sendEmail(to, `Account Reactivated - ${ispName}`, content);
  }
}

let emailServiceInstance: EmailService | null = null;

export function getEmailService(settings?: Partial<EmailSettings>): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService(settings);
  }
  return emailServiceInstance;
}

export function createEmailService(settings?: Partial<EmailSettings>): EmailService {
  return new EmailService(settings);
}
