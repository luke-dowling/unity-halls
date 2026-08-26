import { Resend } from "resend";

let resend: Resend | null = null;
function getResendClient(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendVerificationEmail({
  to,
  name,
  verifyUrl,
}: {
  to: string;
  name: string;
  verifyUrl: string;
}): Promise<void> {
  await getResendClient().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Verify your email for Unity Halls",
    text: `Hi ${name},\n\nConfirm your email address to finish creating your Unity Halls account:\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't sign up, you can ignore this email.`,
    html: `
      <p>Hi ${name},</p>
      <p>Confirm your email address to finish creating your Unity Halls account:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours. If you didn't sign up, you can ignore this email.</p>
    `,
  });
}
