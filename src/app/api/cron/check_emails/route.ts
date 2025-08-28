// src/app/api/cron/check-emails/route.ts (Final Corrected Version)
import { NextResponse } from 'next/server';
import { fetchLatestEmail } from '@/app/actions/fetch-email-action'; 
import { analyzeEmail } from '@/ai/flows/analyze-email-flow'; 
import { sendReport } from '@/app/actions/send-report-action';
import { generateHtmlReport } from '@/app/services/report-formatter';

// A more robust helper to find the original recipient
function getOriginalRecipient(body: string): string | null {
    // Look for the "To:" header specifically within the forwarded message block
    const forwardedContentMatch = body.match(/---------- Forwarded message ---------(.*)/s);
    if (!forwardedContentMatch || !forwardedContentMatch[1]) return null;
    
    const toRegex = /To:.*?<([^>]+)>/i;
    const match = forwardedContentMatch[1].match(toRegex);
    return match ? match[1] : null;
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const { success, data: email, error } = await fetchLatestEmail();

        if (error) {
            console.error("Cron Job Error fetching email:", error);
            return NextResponse.json({ success: false, message: "Error fetching email." });
        }

        if (!success || !email) {
            return NextResponse.json({ success: true, message: "No new emails to process." });
        }
        
        const originalRecipient = getOriginalRecipient(email.body);
        const recipient = originalRecipient || process.env.GMAIL_USER_EMAIL;

        if (!recipient) {
            console.error("Cron Job Error: Could not determine any recipient (original or fallback).");
            return NextResponse.json({ success: false, message: "Could not find a recipient." });
        }

        console.log(`[Cron Job] Processing email for: ${recipient}`);

        const analysisResult = await analyzeEmail(email);

        // --- THE FIX IS HERE ---
        // We must 'await' the result of the async function to get the string
        const htmlReport = await generateHtmlReport(analysisResult);

        // Now, 'htmlReport' is a string, which is the correct type for 'sendReport'
        await sendReport({
            recipient: recipient,
            reportContent: analysisResult.report,
            htmlContent: htmlReport
        });

        console.log(`[Cron Job] Successfully processed and sent report to: ${recipient}`);
        return NextResponse.json({ success: true, message: `Report sent to ${recipient}.` });

    } catch (err: any) {
        console.error("An unexpected error occurred in the cron job:", err);
        return NextResponse.json({ success: false, message: "Internal Server Error" });
    }
}