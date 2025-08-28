import { NextResponse } from 'next/server';

import { fetchLatestEmail } from '@/app/actions/fetch-email-action'; 
import { analyzeEmail } from '@/ai/flows/analyze-email-flow'; 
import { sendReport } from '@/app/actions/send-report-action';
import { generateHtmlReport } from '@/app/services/report-formatter';

// Helper to find the original recipient from the forwarded email body
function getOriginalRecipient(body: string): string | null {
    const forwardedContentMatch = body.match(/---------- Forwarded message ---------([\s\S]*)/);
    if (!forwardedContentMatch || !forwardedContentMatch[1]) return null;
    const toRegex = /To:.*?<([^>]+)>/i;
    const match = forwardedContentMatch[1].match(toRegex);
    return match ? match[1] : null;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        if (!body.message) {
            console.log('[Webhook] Received empty/test notification. Acknowledging.');
            return NextResponse.json({ success: true, message: "Empty notification." });
        }
        
        console.log('[Webhook] Notification received. Searching for latest #checkspam email...');

        const { success, data: email, error } = await fetchLatestEmail();

        if (error) {
            console.error("[Webhook] Error fetching email:", error);
            return NextResponse.json({ success: false, message: "Error fetching email." });
        }

        if (!success || !email) {
            console.log('[Webhook] Woken up, but no new #checkspam emails found.');
            return NextResponse.json({ success: true, message: "No new emails to process." });
        }
        
        const originalRecipient = getOriginalRecipient(email.body);
        const recipient = originalRecipient || process.env.GMAIL_USER_EMAIL;

        if (!recipient) {
            console.error("[Webhook] Error: Could not determine recipient.");
            return NextResponse.json({ success: false, message: "Could not find a recipient." });
        }

        console.log(`[Webhook] Found and processing email for: ${recipient}`);
        const analysisResult = await analyzeEmail(email);
        console.log(`[Webhook] Analysis complete. Verdict: ${analysisResult.threatVerdict}`);
        const htmlReport = await generateHtmlReport(analysisResult);

        await sendReport({
            recipient: recipient,
            reportContent: analysisResult.report,
            htmlContent: htmlReport
        });

        console.log(`[Webhook] Successfully sent report to: ${recipient}`);
        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("[Webhook] An unexpected error occurred:", err);
        return NextResponse.json({ success: true, message: "Acknowledged after error." });
    }
}
