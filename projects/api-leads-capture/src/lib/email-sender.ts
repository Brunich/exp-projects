export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendEmailResult {
  to: string;
  sent: boolean;
  error?: string;
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !user || !pass || !from) return null;

  const port = Number(process.env.SMTP_PORT ?? "587");
  if (!Number.isFinite(port) || port <= 0) return null;

  return { host, port, user, pass, from };
}

export function isSmtpConfigured(): boolean {
  return getSmtpConfig() !== null;
}

export function parseDigestRecipients(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const raw = env.DIGEST_RECIPIENTS?.trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export async function sendEmails(
  messages: SendEmailInput[],
): Promise<SendEmailResult[]> {
  const config = getSmtpConfig();
  if (!config) {
    return messages.map((message) => ({
      to: message.to,
      sent: false,
      error: "SMTP is not configured",
    }));
  }

  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const results: SendEmailResult[] = [];

  for (const message of messages) {
    try {
      await transport.sendMail({
        from: config.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      });

      results.push({ to: message.to, sent: true });
    } catch (error) {
      results.push({
        to: message.to,
        sent: false,
        error: error instanceof Error ? error.message : "Send failed",
      });
    }
  }

  return results;
}
