// src/app/api/gmail-webhook/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { analyzeEmail } from '@/ai/flows/analyze-email-flow'; 
import { sendReport } from '@/app/actions/send-report-action';
import { generateHtmlReport } from '@/app/services/report-formatter';

// Function to get a specific message's details
async function getMessageDetails(auth: any, messageId: string) {
    const gmail = google.gmail({ version: 'v1', auth });
    const messageRes = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
    const payload = messageRes.data.payload;

    if (!payload || !payload.headers) return null;

    // Helper to extract email body (you probably have this elsewhere, consolidate if you can)
    const getBody = (p: any): string => {
        if (p.body?.data) return Buffer.from(p.body.data, 'base64').toString('utf-8');
        if (p.parts) {
            const plainPart = p.parts.find((part: any) => part.mimeType === 'text/plain');
            if (plainPart?.body?.data) return Buffer.from(plainPart.body.data, 'base64').toString('utf-8');
        }
        return '';
    };
    const getHtmlBody = (p: any): string => {
        if (p.body?.data && p.mimeType === 'text/html') return Buffer.from(p.body.data, 'base64').toString('utf-8');
        if (p.parts) {
            const htmlPart = p.parts.find((part: any) => part.mimeType === 'text/html');
            if (htmlPart?.body?.data) return Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
        }
        return '';
    };
    
    // Find who to send the report to
    const getOriginalRecipient = (body: string): string | null => {
        const forwardedContentMatch = body.match(/---------- Forwarded message ---------([\s\S]*)/);
        if (!forwardedContentMatch || !forwardedContentMatch[1]) return null;
        const toRegex = /To:.*?<([^>]+)>/i;
        const match = forwardedContentMatch[1].match(toRegex);
        return match ? match[1] : null;
    };

    const body = getBody(payload);
    const originalRecipient = getOriginalRecipient(body);
    const recipient = originalRecipient || process.env.GMAIL_USER_EMAIL;

    if (!body.includes('#checkspam') || !recipient) {
        return null; // Ignore if it doesn't have our tag or we can't find a recipient
    }

    // Mark as read immediately
    await gmail.users.messages.modify({
        userId: 'me', id: messageId, requestBody: { removeLabelIds: ['UNREAD'] }
    });

    return {
      sender: payload.headers.find(h => h.name === 'From')?.value || 'Unknown',
      subject: payload.headers.find(h => h.name === 'Subject')?.value || 'No Subject',
      body: body,
      htmlBody: getHtmlBody(payload),
      recipient: recipient,
    };
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const messageData = JSON.parse(Buffer.from(body.message.data, 'base64').toString('utf-8'));
        const userEmail = messageData.emailAddress;
        const historyId = messageData.historyId;

        // Create an authenticated client
        const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
        auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
        const gmail = google.gmail({ version: 'v1', auth });

        // Get the history of changes since the last notification
        const historyRes = await gmail.users.history.list({
            userId: 'me',
            startHistoryId: historyId,
            historyTypes: ['messageAdded'],
        });

        const messages = historyRes.data.history?.flatMap(h => h.messagesAdded?.map(m => m.message) || []) || [];
        if (messages.length === 0) {
            return NextResponse.json({ success: true, message: "No new messages to process." });
        }

        for (const message of messages) {
            if (!message?.id) continue;
            
            const emailDetails = await getMessageDetails(auth, message.id);
            if (!emailDetails) {
              console.log(`[Webhook] Ignoring message ${message.id} (no #checkspam or recipient).`);
              continue;
            }

            console.log(`[Webhook] Processing email for: ${emailDetails.recipient}`);
            const analysisResult = await analyzeEmail(emailDetails);
            const htmlReport = await generateHtmlReport(analysisResult);

            await sendReport({
                recipient: emailDetails.recipient,
                reportContent: analysisResult.report,
                htmlContent: htmlReport
            });
            console.log(`[Webhook] Report sent successfully to: ${emailDetails.recipient}`);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Webhook] Error:', error.message);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}