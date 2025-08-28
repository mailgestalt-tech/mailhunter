// src/app/actions/send-report-action.ts (Upgraded Version)
'use server';

import { google } from 'googleapis';

interface SendReportInput {
  recipient: string;
  reportContent: string; // Plain text fallback
  htmlContent: string;   // The new HTML report
}

// Function to create and encode a multipart email message
function createRawMessage(recipient: string, from: string, subject: string, textBody: string, htmlBody: string): string {
  const boundary = `----=_Part_${Math.random().toString(36).substr(2, 16)}`;
  
  const emailLines = [
    `From: "Geist Hunt" <${from}>`,
    `To: ${recipient}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    htmlBody,
    '',
    `--${boundary}--`,
  ];
  
  const email = emailLines.join('\r\n');
  return Buffer.from(email).toString('base64url');
}

export async function sendReport(input: SendReportInput): Promise<{ success: boolean; error?: string }> {
  const { recipient, reportContent, htmlContent } = input;
  const userEmail = process.env.GMAIL_USER_EMAIL;

  if (!userEmail) {
    return { success: false, error: 'GMAIL_USER_EMAIL environment variable is not set.' };
  }

  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

    const gmail = google.gmail({ version: 'v1', auth });

    const rawMessage = createRawMessage(
      recipient,
      userEmail,
      'Your Email Analysis Report from Geist Hunt',
      reportContent,
      htmlContent
    );

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: rawMessage },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to send email via Gmail API:', error);
    return { success: false, error: 'Failed to send the analysis report via Gmail API.' };
  }
}
