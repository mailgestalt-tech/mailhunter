'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { fetchLatestEmail } from '@/app/actions/fetch-email-action';
import { sendReport } from '@/app/actions/send-report-action';
import { analyzeEmail } from '@/ai/flows/analyze-email-flow';
import { AnalyzeEmailOutput } from '@/ai/flows/types';
import { Loader2, Mail, Send, TestTube2 } from 'lucide-react';

interface EmailData {
  id: string;
  sender: string;
  subject: string;
  body: string;
  htmlBody?: string;
  authResults?: string; // For SPF/DKIM/DMARC
}

export default function AnalysisPage() {
  const [email, setEmail] = useState<EmailData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeEmailOutput | null>(null);
  const [error, setError] = useState<string>('');
  const [isFetching, startFetching] = useTransition();
  const [isAnalyzing, startAnalyzing] = useTransition();
  const [isSending, startSending] = useTransition();

  const handleFetchEmail = () => {
    startFetching(async () => {
      setError('');
      setEmail(null);
      setAnalysisResult(null);
      const result = await fetchLatestEmail();
      if (result.success && result.data) {
        setEmail(result.data);
      } else if (result.success && !result.data) {
        setError('No unread emails with "#checkspam" found.');
      } else {
        setError(result.error || 'Failed to fetch email.');
      }
    });
  };
  
  const handleAnalyzeEmail = () => {
    if (!email) return;

    startAnalyzing(async () => {
      setError('');
      setAnalysisResult(null);
      try {
        const result = await analyzeEmail({
          sender: email.sender,
          subject: email.subject,
          body: email.body,
          htmlBody: email.htmlBody,
          authResults: email.authResults, // Pass the new header info
        });
        setAnalysisResult(result);
      } catch (e: any) {
        setError(e.message || 'An error occurred during analysis.');
      }
    });
  };
  
  const handleSendReport = () => {
    if (!email || !analysisResult) return;

    startSending(async () => {
      setError('');
      const fullReport = `
Geist Hunt Analysis Report
==============================
Final Verdict: ${analysisResult.threatVerdict}
Threat Score: ${analysisResult.threatScore}/10
==============================

${analysisResult.report}
      `;

      const result = await sendReport({ recipient: email.sender, reportContent: fullReport });
      if (!result.success) {
        setError(result.error || 'Failed to send report.');
      } else {
        alert('Report sent successfully!');
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold font-headline">Analysis Console</h1>
        <p className="text-muted-foreground">Internal tool for fetching, analyzing, and reporting on emails.</p>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Fetch Email</CardTitle>
              <CardDescription>
                Fetch the latest unread email with "#checkspam" in the body to begin analysis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleFetchEmail} disabled={isFetching}>
                {isFetching ? <Loader2 className="animate-spin" /> : <Mail />}
                {isFetching ? 'Fetching...' : 'Fetch Latest Email'}
              </Button>
            </CardContent>
          </Card>
          
          {error && <p className="text-destructive text-center p-4 bg-destructive/10 rounded-md">{error}</p>}
          
          {email && (
            <Card>
                <CardHeader>
                    <CardTitle>Step 2: Review & Analyze</CardTitle>
                    <CardDescription>From: {email.sender}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <h3 className="font-bold">{email.subject}</h3>
                    <pre className="p-4 bg-muted rounded-md whitespace-pre-wrap font-code text-sm max-h-96 overflow-y-auto">
                    {email.body}
                    </pre>
                    <Button onClick={handleAnalyzeEmail} disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="animate-spin" /> : <TestTube2 />}
                        {isAnalyzing ? 'Run Full Analysis' : 'Run Full Analysis'}
                    </Button>
                </CardContent>
            </Card>
          )}

          {analysisResult && (
            <Card>
                <CardHeader>
                    <CardTitle>Step 3: Review Report & Send</CardTitle>
                    <CardDescription>
                        Verdict: <span className={`font-bold ${
                            analysisResult.threatVerdict === 'DANGEROUS' ? 'text-destructive' :
                            analysisResult.threatVerdict === 'SUSPICIOUS' ? 'text-yellow-500' :
                            'text-green-500'
                        }`}>{analysisResult.threatVerdict}</span> (Score: {analysisResult.threatScore}/10)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        value={analysisResult.report}
                        readOnly
                        rows={30}
                        className="font-code bg-muted text-xs"
                    />
                     <Button onClick={handleSendReport} disabled={isSending}>
                        {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                        {isSending ? 'Sending...' : 'Send Report to Sender'}
                    </Button>
                </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}