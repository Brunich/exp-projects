import type { ReminderEmailDraft, ReminderSender } from "../email-reminders";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export interface SendReminderResult {
  clientId: string;
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

export async function sendReminderEmails(
  drafts: ReminderEmailDraft[],
  sender: ReminderSender,
): Promise<SendReminderResult[]> {
  const config = getSmtpConfig();
  if (!config) {
    return drafts.map((draft) => ({
      clientId: draft.clientId,
      to: draft.to,
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

  const results: SendReminderResult[] = [];

  for (const draft of drafts) {
    try {
      await transport.sendMail({
        from: `"${sender.name}" <${config.from}>`,
        replyTo: sender.email,
        to: draft.to,
        subject: draft.subject,
        text: draft.body,
      });

      results.push({
        clientId: draft.clientId,
        to: draft.to,
        sent: true,
      });
    } catch (error) {
      results.push({
        clientId: draft.clientId,
        to: draft.to,
        sent: false,
        error: error instanceof Error ? error.message : "Send failed",
      });
    }
  }

  return results;
}
