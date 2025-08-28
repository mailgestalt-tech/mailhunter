
import { NextRequest, NextResponse } from 'next/server';
import { fetchLatestEmail } from '@/app/actions/fetch-email-action';
import { analyzeEmail } from '@/ai/flows/analyze-email-flow';
import { sendReport } from '@/app/actions/send-report-action';

export async function GET(req: NextRequest) {
  try {
    console.log('Processing email job started...');

    // 1. Fetch the latest email
    console.log('Step 1: Fetching latest email with "checkspam" in subject...');
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
    const analysisResult = await analyzeEmail({
      sender: email.sender,
      subject: email.subject,
      body: email.body,
      htmlBody: email.htmlBody,
    });
    console.log(`Analysis complete. Verdict: ${analysisResult.threatVerdict}`);

    // 3. Send the report
    console.log('Step 3: Preparing and sending the report...');
    const fullReport = `
Geist Hunt Analysis Report
==============================
Final Verdict: ${analysisResult.threatVerdict}
Threat Score: ${analysisResult.threatScore}/10
==============================

${analysisResult.report}
    `.trim();

    // The recipient should be the original sender of the email being analyzed.
    const originalSender = email.sender; 
    const sendResult = await sendReport({ recipient: originalSender, reportContent: fullReport });

    if (!sendResult.success) {
      console.error('Error sending report:', sendResult.error);
      return NextResponse.json({ success: false, message: `Error sending report: ${sendResult.error}` }, { status: 500 });
    }

    console.log(`Report sent successfully to ${originalSender}.`);
    return NextResponse.json({ success: true, message: 'Email processed and report sent successfully.' });

  } catch (error: any) {
    console.error('An unexpected error occurred during email processing:', error);
    return NextResponse.json({ success: false, message: `An unexpected error occurred: ${error.message}` }, { status: 500 });
  }
}
