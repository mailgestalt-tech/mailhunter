'use server';

import { google } from 'googleapis';

interface SendReportInput {
  recipient: string;
  reportContent: string;
}

// Function to create and encode the raw email message
function createRawMessage(recipient: string, from: string, subject: string, body: string): string {
  const emailLines = [
    `From: "Geist Hunt" <${from}>`,
    `To: ${recipient}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ];
  const email = emailLines.join('\r\n');
  return Buffer.from(email).toString('base64url');
}

export async function sendReport(input: SendReportInput): Promise<{ success: boolean; error?: string }> {
  const { recipient, reportContent } = input;
  // Get the 'From' address from the environment variables
  const userEmail = process.env.GMAIL_USER_EMAIL;

  if (!userEmail) {
    return { success: false, error: 'GMAIL_USER_EMAIL environment variable is not set.' };
  }

  try {
    // Use the OAuth 2.0 authentication method
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:9002/api/auth/callback/google' // The correct redirect URI
    );

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: 'v1', auth });

    const rawMessage = createRawMessage(
      recipient,
      userEmail,
      'Your Email Analysis Report from Geist Hunt',
      reportContent
    );

    await gmail.users.messages.send({
      userId: 'me', // 'me' refers to the authenticated user (mailgestalt@gmail.com)
      requestBody: {
        raw: rawMessage,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to send email via Gmail API:', error);
    return { success: false, error: 'Failed to send the analysis report via Gmail API.' };
  }
}