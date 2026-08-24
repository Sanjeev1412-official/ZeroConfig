import nodemailer from "nodemailer";

interface SendOtpOptions {
  to: string;
  otp: string;
}

export async function sendOtpEmail({ to, otp }: SendOtpOptions): Promise<{ success: boolean; mode: "smtp" | "console"; error?: string }> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || "ZeroConfig <sandeepsnair18397@gmail.com>";

  const isSmtpConfigured = !!(host && user && pass);

  const subject = `Your ZeroConfig Verification Code: ${otp}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 2.5rem 1.5rem; background-color: #f8fafc; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <h1 style="color: #1e293b; font-size: 1.75rem; margin: 0; font-weight: 800; letter-spacing: -0.03em;">⚡ ZeroConfig</h1>
        <p style="color: #64748b; font-size: 0.95rem; margin: 0.35rem 0 0;">Unified Ingress & Webhook Platform</p>
      </div>

      <div style="background-color: #ffffff; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); text-align: center; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a; font-size: 1.25rem; font-weight: 700; margin-top: 0;">Verification Code</h2>
        <p style="color: #475569; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.75rem;">
          Use the following 6-digit one-time code to complete your registration and secure your ZeroConfig account:
        </p>

        <div style="display: inline-block; font-size: 2.2rem; font-weight: 900; letter-spacing: 0.25em; color: #2563eb; background: #eff6ff; padding: 0.75rem 2rem; border-radius: 8px; border: 1px solid #bfdbfe; font-family: monospace;">
          ${otp}
        </div>

        <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 1.75rem; margin-bottom: 0;">
          This code will expire in 10 minutes. If you did not request this email, you can safely ignore it.
        </p>
      </div>

      <div style="text-align: center; margin-top: 2rem; color: #94a3b8; font-size: 0.8rem;">
        © ${new Date().getFullYear()} ZeroConfig Engine • Self-Hosted Local Ingress
      </div>
    </div>
  `;

  const text = `Your ZeroConfig verification code is: ${otp}\n\nThis code will expire in 10 minutes.`;

  if (isSmtpConfigured) {
    try {
      const cleanPass = pass.replace(/\s+/g, '');
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === "true" || port === 465,
        auth: {
          user: user.trim(),
          pass: cleanPass,
        },
      });

      await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });

      console.log(`[ZeroConfig Mailer] Successfully sent OTP email via SMTP to: ${to}`);
      return { success: true, mode: "smtp" };
    } catch (err: any) {
      console.error(`[ZeroConfig Mailer] SMTP delivery failed to ${to}:`, err);
      return { success: false, mode: "smtp", error: err.message };
    }
  }

  // Fallback / Development mode when SMTP is not yet configured:
  console.log(`\n=============================================================`);
  console.log(`📧 [ZeroConfig Email Delivery]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`OTP Code: ${otp}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`=============================================================\n`);

  return { success: true, mode: "console" };
}
