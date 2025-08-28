import { NextRequest, NextResponse } from 'next/server';
import { fetchLatestEmail } from '@/app/actions/fetch-email-action';
import { analyzeEmail } from '@/ai/flows/analyze-email-flow';
import { sendReport } from '@/app/actions/send-report-action';

// --- ADDED: Import the HTML report generator ---
import { generateHtmlReport } from '@/app/services/report-formatter';

// Helper to find the original recipient from the forwarded email body
function getOriginalRecipient(body: string): string | null {
    const forwardedContentMatch = body.match(/---------- Forwarded message ---------([\s\S]*)/);
    if (!forwardedContentMatch || !forwardedContentMatch[1]) return null;
    const toRegex = /To:.*?<([^>]+)>/i;
    const match = forwardedContentMatch[1].match(toRegex);
    return match ? match[1] : null;
}

export async function GET(req: NextRequest) {
  // --- ADDED: Essential security check for a cron job ---
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log('Processing email job started...');

    // 1. Fetch the latest email
    const emailResult = await fetchLatestEmail();
    if (!emailResult.success) {
      console.error('Error fetching email:', emailResult.error);
      return NextResponse.json({ success: false, message: `Error fetching email: ${emailResult.error}` }, { status: 500 });
    }

    if (!emailResult.data) {
      console.log('No new emails with "checkspam" found to process.');
      return NextResponse.json({ success: true, message: 'No new emails to process.' });
    }

    const email = emailResult.data;
    console.log(`Found email from: ${email.sender}, Subject: ${email.subject}`);

    // 2. Analyze the email
    console.log('Step 2: Analyzing email content...');
    const analysisResult = await analyzeEmail(email);
    console.log(`Analysis complete. Verdict: ${analysisResult.threatVerdict}`);

    // --- START OF THE FIX ---

    // 3. Determine the true recipient
    const recipient = getOriginalRecipient(email.body) || process.env.GMAIL_USER_EMAIL;
    if (!recipient) {
        console.error("Cron Job Error: Could not determine any recipient.");
        return NextResponse.json({ success: false, message: "Could not determine recipient." });
    }

    // 4. Generate BOTH plain text and HTML reports
    console.log('Step 3: Generating reports...');
    const plainTextReport = analysisResult.report; // Use the raw report from the analysis
    const htmlReport = await generateHtmlReport(analysisResult);

    // 5. Send the multipart email
    console.log(`Step 4: Sending report to ${recipient}...`);
    const sendResult = await sendReport({
        recipient: recipient,
        reportContent: plainTextReport, // The plain text fallback
        htmlContent: htmlReport,        // The required HTML content
    });

    // --- END OF THE FIX ---

    if (!sendResult.success) {
      console.error('Error sending report:', sendResult.error);
      return NextResponse.json({ success: false, message: `Error sending report: ${sendResult.error}` }, { status: 500 });
    }

    console.log(`Report sent successfully to ${recipient}.`);
    return NextResponse.json({ success: true, message: 'Email processed and report sent successfully.' });

  } catch (error: any) {
    console.error('An unexpected error occurred during email processing:', error);
    return NextResponse.json({ success: false, message: `An unexpected error occurred: ${error.message}` }, { status: 500 });
  }
}
