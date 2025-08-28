// src/app/api/gmail-webhook/route.ts (Final Recipient Logic)
import { NextResponse } from 'next/server';

import { fetchLatestEmail } from '@/app/actions/fetch-email-action'; 
import { analyzeEmail } from '@/ai/flows/analyze-email-flow'; 
import { sendReport } from '@/app/actions/send-report-action';
import { generateHtmlReport } from '@/app/services/report-formatter';

function getOriginalRecipient(body: string): string | null {
    const forwardedContentMatch = body.match(/---------- Forwarded message ---------([\s\S]*)/);
    if (!forwardedContentMatch || !forwardedContentMatch[1]) return null;
    const toRegex = /To:.*?<([^>]+)>/i;
    const match = forwardedContentMatch[1].match(toRegex);
    return match ? match[1] : null;
}

// A more robust function to extract just the email address
function getEmailFromHeader(headerValue: string): string | null {
    if (!headerValue) return null;
    const match = headerValue.match(/[\w\.\-]+@[\w\.\-]+\.\w+/);
    return match ? match[0] : null;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        if (!body.message) {
            return NextResponse.json({ success: true, message: "Empty notification." });
        }
        
        console.log('[Webhook] Notification received. Searching for latest #checkspam email...');
        const { success, data: email, error } = await fetchLatestEmail();

        if (error || !email) {
            console.log('[Webhook] Woken up, but no new #checkspam emails found or an error occurred.');
            return NextResponse.json({ success: true, message: "No new emails to process." });
        }
        
        // --- DEFINITIVE RECIPIENT LOGIC ---
        const originalRecipient = getOriginalRecipient(email.body);
        const directSender = getEmailFromHeader(email.sender);
        
        const recipient = originalRecipient || directSender;

        // If after all that, we STILL don't have a recipient, we cannot proceed.
        if (!recipient) {
            console.error("[Webhook] CRITICAL ERROR: Could not determine a valid recipient from the email headers. Halting processing.");
            // We still return success to prevent Pub/Sub from retrying a broken email.
            return NextResponse.json({ success: true, message: "Could not determine recipient." });
        }

        console.log(`[Webhook] Found and processing email for: ${recipient}`);
        const analysisResult = await analyzeEmail(email);
        const htmlReport = await generateHtmlReport(analysisResult);

        await sendReport({
            recipient: recipient,
            htmlContent: htmlReport
        });

        console.log(`[Webhook] Successfully sent report to: ${recipient}`);
        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("[Webhook] An unexpected error occurred:", err);
        return NextResponse.json({ success: true, message: "Acknowledged after error." });
    }
}
