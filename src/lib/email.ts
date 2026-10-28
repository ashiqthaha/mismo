import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "Mismo <mismo@localhost>";
// Mail comes from a no-reply address; replies go to a real inbox instead.
const defaultReplyTo = process.env.EMAIL_REPLY_TO || undefined;
const client = apiKey ? new Resend(apiKey) : null;

export function emailEnabled(): boolean {
  return client !== null;
}

/**
 * Sends an email through Resend. Without an API key (local development) it prints the email instead.
 * `replyTo` is the person whose action caused the email; otherwise replies go to EMAIL_REPLY_TO.
 */
export async function sendEmail(msg: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string | null;
}): Promise<void> {
  const replyTo = msg.replyTo || defaultReplyTo;
  if (!client) {
    console.log(`\n[email] to: ${msg.to}\n[email] reply-to: ${replyTo ?? "(none)"}\n[email] subject: ${msg.subject}\n${msg.text}\n`);
    return;
  }
  const { error } = await client.emails.send({
    from,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
    ...(replyTo ? { replyTo } : {}),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** A plain, readable email body with one button. */
export function emailHtml(title: string, body: string, button?: { label: string; url: string }): string {
  const action = button
    ? `<p style="margin:24px 0"><a href="${escapeHtml(button.url)}" style="background:#0f766e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(button.label)}</a></p>`
    : "";
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1c1917">
<h2 style="margin:0 0 12px;font-size:20px">${escapeHtml(title)}</h2>
<p style="margin:0;font-size:15px;line-height:1.5">${escapeHtml(body)}</p>
${action}
<p style="margin-top:32px;font-size:12px;color:#78716c">Mismo · your home's upkeep and projects</p>
</div>`;
}
