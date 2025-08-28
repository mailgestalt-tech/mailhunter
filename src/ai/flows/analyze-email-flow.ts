'use server';

import { AnalyzeEmailInput, AnalyzeEmailOutput } from './types';
import { getUrlScanReport } from '@/app/services/url-service';
import { getDomainIntel } from '@/app/services/domain-service';
import { getDomainVerdict } from '@/app/services/ip-service';
import { URL } from 'url';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Setup for the Gemini Model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE, },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE, },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE, },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE, },
];
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings });

interface AdvancedAnalyzeEmailInput extends AnalyzeEmailInput { authResults?: string; }
interface ParsedEmailContent { originalSender: string; originalSubject: string; originalBody: string; }

function decodeQuotedPrintable(text: string): string { try { return text.replace(/=\r?\n/g, '').replace(/=([a-fA-F0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))); } catch { return text; } }
function parseForwardedEmail(fullBody: string): ParsedEmailContent | null { const forwardedHeaderRegex = /---------- Forwarded message ---------/i; const match = fullBody.match(forwardedHeaderRegex); if (!match || typeof match.index === 'undefined') return null; const forwardedContent = fullBody.substring(match.index); const fromRegex = /From:.*?<([^>]+)>/i; const subjectRegex = /Subject: (.*)/i; const fromMatch = forwardedContent.match(fromRegex); const subjectMatch = forwardedContent.match(subjectRegex); const originalSender = fromMatch ? fromMatch[1] : 'Unknown'; const originalSubject = subjectMatch ? subjectMatch[1].trim() : 'Unknown'; const bodyStartIndex = forwardedContent.indexOf('\n\n'); const originalBody = bodyStartIndex !== -1 ? forwardedContent.substring(bodyStartIndex + 2) : forwardedContent; return { originalSender, originalSubject, originalBody }; }
async function getDomainDeepDive(domain: string): Promise<string> {
    if (!domain || /google\.com|googleapis\.com|tiktok\.com|apple\.com|microsoft\.com|gmail\.com/.test(domain)) return `Skipped analysis for reputable domain: ${domain}.`;
    const [domainReputation, vtVerdict] = await Promise.all([ getDomainIntel(domain), getDomainVerdict(domain) ]);
    return [`- VT Verdict: ${vtVerdict}`, `- Domain Age: ${domainReputation.whois.created || 'Unknown'}`, `- Registrar: ${domainReputation.whois.registrar || 'Unknown'}`].join('\n');
}

export async function analyzeEmail(input: AdvancedAnalyzeEmailInput): Promise<AnalyzeEmailOutput> {
    const forwardedInfo = parseForwardedEmail(input.body);
    let contentToAnalyze: string;
    let contextHeader = '';

    if (forwardedInfo) {
        contentToAnalyze = decodeQuotedPrintable(forwardedInfo.originalBody);
        contextHeader = `This is a forwarded email from sender ${forwardedInfo.originalSender}.`;
    } else {
        let decodedBody = decodeQuotedPrintable(input.body);
        const signatureRegex = new RegExp(`(--|Sent from my)[\\s\\S]*${input.sender}|${input.sender}|#checkspam`, 'gi');
        contentToAnalyze = decodedBody.replace(signatureRegex, '').trim();
        contextHeader = `This is a direct submission from a user.`;
    }
    
    try {
        // --- STAGE 1: AI EXTRACTS THE INVESTIGATION PLAN ---
        console.log("[AI Stage 1] Asking AI to create an investigation plan...");
        const extractionPrompt = `
          Analyze the following email text and create an investigation plan.
          Identify the single most important "call to action" URL.
          Identify the original sender's domain if this is a forward.
          Your response MUST be a valid JSON object. Example:
          { "senderDomainToScan": "domain1.com", "primaryUrlToScan": "https://url.com/path" }
          
          Context: ${contextHeader}
          Email Content:
          ---
          ${contentToAnalyze.substring(0, 4000)}
          ---
        `;
        const extractionResult = await aiModel.generateContent(extractionPrompt);
        const extractionText = extractionResult.response.text().replace("```json", "").replace("```", "").trim();
        const plan = JSON.parse(extractionText);
        
        const senderDomainToScan: string | null = plan.senderDomainToScan;
        const primaryUrlToScan: string | null = plan.primaryUrlToScan;

        console.log(`[Investigation] Plan: Scan sender '${senderDomainToScan}', Scan URL '${primaryUrlToScan}'`);
        const technicalData: string[] = [];

        // --- STAGE 2: TOOLS EXECUTE THE PLAN ---
        const investigationPromises = [];

        if (senderDomainToScan) {
            investigationPromises.push(
                getDomainDeepDive(senderDomainToScan).then(report => {
                    technicalData.push(`**Sender Domain Analysis (${senderDomainToScan})**\n${report}`);
                })
            );
        }
        
        if (primaryUrlToScan) {
            investigationPromises.push(
                getUrlScanReport(primaryUrlToScan).then(async scanResult => {
                    if (scanResult.error) {
                        technicalData.push(`**URL Sandbox Analysis**\n- urlscan.io Error: ${scanResult.error}`);
                    } else if (scanResult.final_domain) {
                        const initialDomain = new URL(primaryUrlToScan).hostname;
                        let report = `
**URL Sandbox Analysis (urlscan.io)**
- Initial URL Host: ${initialDomain}
- Final Landing Domain: ${scanResult.final_domain}
- Final IP: ${scanResult.final_ip || 'N/A'}
- Page Title: ${scanResult.page_title || 'N/A'}
                        `.trim();
                        
                        if (scanResult.final_domain !== initialDomain.replace('www.','')) {
                            report += `\n- PIVOT: URL redirected to a new domain.`;
                            const payloadReport = await getDomainDeepDive(scanResult.final_domain);
                            report += `\n\n**Deep Dive on Final Domain (${scanResult.final_domain})**\n${payloadReport}`;
                        }
                        technicalData.push(report);
                    }
                })
            );
        }
        
        await Promise.all(investigationPromises);
        
        // --- STAGE 3: AI SYNTHESIZES THE FINAL REPORT ---
        console.log("[AI Stage 2] Asking AI to synthesize final report...");
        const synthesisPrompt = `
          You are a senior cybersecurity analyst. Write a concise, definitive threat intelligence brief based on the provided technical data.

          **Technical Reports:**
          ---
          ${technicalData.join('\n\n')}
          ---

          Your response MUST be a valid JSON object: 
          { 
            "threatVerdict": "SAFE/SUSPICIOUS/DANGEROUS", 
            "threatScore": 0-30, 
            "report": "Your brief markdown report here. Start with an executive summary, then list the key evidence." 
          }
        `;
        const synthesisResult = await aiModel.generateContent(synthesisPrompt);
        const synthesisText = synthesisResult.response.text().replace("```json", "").replace("```", "").trim();
        const finalVerdict = JSON.parse(synthesisText);

        return {
            threatVerdict: finalVerdict.threatVerdict || 'SUSPICIOUS',
            threatScore: Math.min(Math.max(finalVerdict.threatScore || 15, 0), 30),
            report: finalVerdict.report || "AI synthesis failed."
        };
    } catch (e: any) {
        console.error("[AI Analysis] A critical error occurred:", e);
        return {
            threatVerdict: 'SUSPICIOUS',
            threatScore: 15,
            report: `An error occurred during the AI analysis pipeline: ${e.message}. Please review the email manually.`
        };
    }
}