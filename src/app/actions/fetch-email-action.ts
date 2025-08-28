'use server';

import { google } from 'googleapis';

interface EmailData {
  id: string;
  sender: string;
  subject: string;
  body: string;
  htmlBody?: string;
  authResults?: string; // For SPF/DKIM/DMARC
}

function getBody(payload: any): string {
    if (!payload) return '';
    if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
        return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    if (payload.parts) { for (const part of payload.parts) { const body = getBody(part); if (body) return body; } }
    return '';
}

function getHtmlBody(payload: any): string {
    if (!payload) return '';
    if (payload.mimeType === 'text/html' && payload.body && payload.body.data) { return Buffer.from(payload.body.data, 'base64').toString('utf-8');}
    if (payload.mimeType === 'multipart/alternative' && payload.parts) { const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html'); if (htmlPart) return getHtmlBody(htmlPart);}
    if (payload.parts) { for (const part of payload.parts) { const body = getHtmlBody(part); if (body) return body; } }
    return '';
}

export async function fetchLatestEmail(): Promise<{ success: boolean; data?: EmailData, error?: string }> {
  try {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:9002/api/auth/callback/google'
    );

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: 'v1', auth });

    const response = await gmail.users.messages.list({
      userId: 'me',
      // The query now includes the Spam folder
      q: 'is:unread "#checkspam" in:anywhere',
      maxResults: 1,
    });

    const messages = response.data.messages;
    if (!messages || messages.length === 0) {
      return { success: true, data: undefined };
    }

    const messageId = messages[0].id!;
    const messageRes = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
    const payload = messageRes.data.payload;

    if (!payload || !payload.headers) {
      return { success: false, error: 'Invalid email payload.' };
    }

    const headers = payload.headers;
    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
    const sender = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
    const authResults = headers.find(h => h.name === 'Authentication-Results')?.value || 'none';
    const body = getBody(payload);
    const htmlBody = getHtmlBody(payload);

    await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: { removeLabelIds: ['UNREAD'] }
    });

    return {
      success: true,
      data: { id: messageId, sender, subject, body, htmlBody, authResults },
    };
  } catch (error: any) {
    console.error('Error fetching email:', error);
    return { success: false, error: error.message || 'An unknown error occurred.' };
  }
}