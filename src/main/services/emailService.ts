import { getDatabase } from '../database/connection';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
}

export const emailService = {
  /**
   * Get email configuration from database
   */
  async getConfig(): Promise<EmailConfig | null> {
    const db = getDatabase();
    const result = await db
      .prepare("SELECT value FROM app_settings WHERE key = 'email_config'")
      .get() as { value: string } | undefined;

    if (!result) {
      return null;
    }

    try {
      return JSON.parse(result.value) as EmailConfig;
    } catch {
      return null;
    }
  },

  /**
   * Save email configuration to database
   */
  async saveConfig(config: EmailConfig): Promise<void> {
    const db = getDatabase();
    const configJson = JSON.stringify(config);

    await db.prepare(`
      INSERT INTO app_settings (key, value)
      VALUES ('email_config', ?)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `).run(configJson);
  },

  /**
   * Test email configuration by attempting to connect
   * Note: Requires nodemailer to be installed
   */
  async testConnection(config: EmailConfig): Promise<{ success: boolean; error?: string }> {
    try {
      // Dynamic import to avoid errors if nodemailer is not installed
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.password,
        },
      });

      await transporter.verify();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      if (errorMessage.includes("Cannot find module 'nodemailer'")) {
        return { success: false, error: 'Email support requires nodemailer. Run: npm install nodemailer' };
      }
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Send an email
   * Note: Requires nodemailer to be installed
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    attachments?: Array<{ filename: string; content: Buffer }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const config = await this.getConfig();
      if (!config) {
        return { success: false, error: 'Email not configured' };
      }

      // Dynamic import to avoid errors if nodemailer is not installed
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.password,
        },
      });

      await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to,
        subject,
        html,
        attachments,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
      if (errorMessage.includes("Cannot find module 'nodemailer'")) {
        return { success: false, error: 'Email support requires nodemailer. Run: npm install nodemailer' };
      }
      return { success: false, error: errorMessage };
    }
  },

  /**
   * Generate invoice email HTML
   */
  generateInvoiceEmailHtml(
    invoiceNumber: string,
    businessName: string,
    customerName: string,
    totalAmount: string,
    dueDate?: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0D9488, #0F766E); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .label { color: #6b7280; }
          .value { font-weight: 600; color: #111827; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Bigtal</h1>
          </div>
          <div class="content">
            <p>Dear ${customerName},</p>
            <p>Please find attached your invoice from ${businessName}.</p>

            <div class="invoice-details">
              <div class="detail-row">
                <span class="label">Invoice Number:</span>
                <span class="value">${invoiceNumber}</span>
              </div>
              <div class="detail-row">
                <span class="label">Amount Due:</span>
                <span class="value">${totalAmount}</span>
              </div>
              ${dueDate ? `
              <div class="detail-row">
                <span class="label">Due Date:</span>
                <span class="value">${dueDate}</span>
              </div>
              ` : ''}
            </div>

            <p>If you have any questions, please don't hesitate to contact us.</p>
            <p>Thank you for your business!</p>
          </div>
          <div class="footer">
            <p>Sent via Bigtal, Small Business Managment.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },
};
