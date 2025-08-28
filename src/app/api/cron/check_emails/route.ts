// src/app/api/cron/check-emails/route.ts (Final Corrected Version)
import { NextResponse } from 'next/server';
import { fetchLatestEmail } from '@/app/actions/fetch-email-action'; 
import { analyzeEmail } from '@/ai/flows/analyze-email-flow'; 
import { sendReport } from '@/app/actions/send-report-action';
import { generateHtmlReport } from '@/app/services/report-formatter';

// A more robust helper to find the original recipient
function getOriginalRecipient(body: string): string | null {
    // --- THIS IS THE FIX ---
    // Replaced `(.*)/s` with `([\s\S]*)` for universal JavaScript compatibility.
    const forwardedContentMatch = body.match(/---------- Forwarded message ---------([\s\S]*)/);
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
        console.log('[Cron Job] Starting...');
        const { success, data: email, error } = await fetchLatestEmail();

        if (error) {
            console.error("[Cron Job] Error fetching email:", error);
            return NextResponse.json({ success: false, message: "Error fetching email." });
        }

        if (!success || !email) {
            console.log('[Cron Job] No new emails to process.');
            return NextResponse.json({ success: true, message: "No new emails to process." });
        }
        
        const originalRecipient = getOriginalRecipient(email.body);
        const recipient = originalRecipient || process.env.GMAIL_USER_EMAIL;

        if (!recipient) {
            console.error("[Cron Job] Error: Could not determine any recipient (original or fallback).");
            return NextResponse.json({ success: false, message: "Could not find a recipient." });
        }

        console.log(`[Cron Job] Processing email for: ${recipient}`);

        const analysisResult = await analyzeEmail(email);
        console.log(`[Cron Job] Analysis complete. Verdict: ${analysisResult.threatVerdict}`);

        const htmlReport = await generateHtmlReport(analysisResult);
        console.log('[Cron Job] HTML report generated.');

        await sendReport({
            recipient: recipient,
            reportContent: analysisResult.report,
            htmlContent: htmlReport
        });

        console.log(`[Cron Job] Successfully processed and sent report to: ${recipient}`);
        return NextResponse.json({ success: true, message: `Report sent to ${recipient}.` });

    } catch (err: any) {
        console.error("[Cron Job] An unexpected error occurred:", err);
        return NextResponse.json({ success: false, message: "Internal Server Error" });
    }
}
