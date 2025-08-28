// src/app/actions/analyze-email-action.ts (Final Corrected Version)
'use server';

import { AnalyzeEmailInput, AnalyzeEmailOutput } from './types';
import { getUrlScanReport, UrlScanResult } from '@/app/services/url-service';
import { getDomainIntel } from '@/app/services/domain-service';
import { getDomainVerdict } from '@/app/services/ip-service';
import { URL } from 'url';

interface AdvancedAnalyzeEmailInput extends AnalyzeEmailInput {
  authResults?: string;
  htmlBody?: string;
}

interface ParsedEmailContent { originalSender: string; originalSubject: string; originalBody: string; originalHtmlBody?: string; }
interface DomainAnalysisResult { score: number; report: string[]; isSuspicious: boolean; }

function decodeQuotedPrintable(text: string): string { try { return text.replace(/=\r?\n/g, '').replace(/=([a-fA-F0-9]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))); } catch { return text; } }

function parseForwardedEmail(fullBody: string, fullHtmlBody?: string): ParsedEmailContent | null {
    const forwardedHeaderRegex = /---------- Forwarded message ---------/i;
    const match = fullBody.match(forwardedHeaderRegex);
    if (!match || typeof match.index === 'undefined') return null;

    const forwardedContent = fullBody.substring(match.index);
    const fromRegex = /From:.*?<([^>]+)>/i;
    const subjectRegex = /Subject: (.*)/i;
    const fromMatch = forwardedContent.match(fromRegex);
    const subjectMatch = forwardedContent.match(subjectRegex);

    const originalSender = fromMatch ? fromMatch[1] : 'Unknown';
    const originalSubject = subjectMatch ? subjectMatch[1].trim() : 'Unknown';

    const bodyStartIndex = forwardedContent.indexOf('\n\n');
    const originalBody = bodyStartIndex !== -1 ? forwardedContent.substring(bodyStartIndex + 2) : forwardedContent;
    const originalHtmlBody = fullHtmlBody ? fullHtmlBody.substring(fullHtmlBody.indexOf(match[0])) : undefined;

    return { originalSender, originalSubject, originalBody, originalHtmlBody };
}

// --- UPGRADED URL EXTRACTOR ---
function extractCallToActionUrl(plainText: string, htmlText?: string): string | null {
    const httpUrlRegex = /https?:\/\/[^\s"<>']+/gi;

    if (htmlText) {
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;
        const callToActionKeywords = /verification|continue|view|access|login|confirm|validate|button/i;
        const unsubscribeKeywords = /unsubscribe|preferences/i;
        
        const candidates: string[] = [];
        let match;
        while ((match = linkRegex.exec(htmlText)) !== null) {
            const url = match[2];
            
            // --- CRITICAL FIX: Ignore non-HTTP(S) links ---
            if (!url.startsWith('http')) {
                continue;
            }

            const linkText = htmlText.substring(match.index, linkRegex.lastIndex);
            if (unsubscribeKeywords.test(url) || unsubscribeKeywords.test(linkText)) {
                continue;
            }
            // If we find a high-confidence keyword, return it immediately
            if (callToActionKeywords.test(linkText)) {
                return url;
            }
            candidates.push(url);
        }
        // If no keyword match, return the longest valid HTTP link found
        if (candidates.length > 0) {
            return candidates.reduce((longest, current) => current.length > longest.length ? current : longest, "");
        }
    }
    
    // Fallback to plain text search if HTML parsing yields nothing
    const matches = plainText.match(httpUrlRegex);
    if (!matches) return null;

    return matches.reduce((longest, current) => current.length > longest.length ? current : longest, "");
}


async function getDomainDeepDive(domain: string): Promise<DomainAnalysisResult> {
    if (!domain || /google\.com|googleapis\.com|tiktok\.com|apple\.com|microsoft\.com|gmail\.com/.test(domain)) {
        return { score: 0, report: [`- Analysis skipped for reputable domain: ${domain}.`], isSuspicious: false };
    }
    const [domainReputation, vtVerdict] = await Promise.all([ getDomainIntel(domain), getDomainVerdict(domain) ]);
    let score = 0;
    let isSuspicious = false;
    const reportItems: string[] = [];

    if (vtVerdict?.startsWith('DANGEROUS')) { score += 15; isSuspicious = true; reportItems.push(`- VT Verdict: DANGEROUS`); }
    else if (vtVerdict?.startsWith('SUSPICIOUS')) { score += 8; isSuspicious = true; reportItems.push(`- VT Verdict: SUSPICIOUS`); }
    else { reportItems.push(`- VT Verdict: ${vtVerdict}`); }

    if (domainReputation.whois.created?.includes('days ago')) {
        const days = parseInt(domainReputation.whois.created.match(/(\d+)/)?.[0] || '999');
        if (days < 90) {
            const ageScore = days < 30 ? 15 : 7;
            score += ageScore;
            isSuspicious = true;
            reportItems.push(`- Domain Age: VERY NEW (${days} days)`);
        } else { reportItems.push(`- Domain Age: ${domainReputation.whois.created}`); }
    } else { reportItems.push(`- Domain Age: ${domainReputation.whois.created || 'Unknown'}`); }
    reportItems.push(`- Registrar: ${domainReputation.whois.registrar || 'Unknown'}`);

    return { score, report: reportItems, isSuspicious };
}

export async function analyzeEmail(input: AdvancedAnalyzeEmailInput): Promise<AnalyzeEmailOutput> {
    const forwardedInfo = parseForwardedEmail(input.body, input.htmlBody);
    let contentToAnalyze: { plain: string; html?: string; };

    if (forwardedInfo) {
        contentToAnalyze = {
            plain: decodeQuotedPrintable(forwardedInfo.originalBody),
            html: forwardedInfo.originalHtmlBody
        };
    } else {
        const signatureRegex = new RegExp(`(--|Sent from my)[\\s\\S]*${input.sender}|${input.sender}|#checkspam`, 'gi');
        contentToAnalyze = {
            plain: decodeQuotedPrintable(input.body).replace(signatureRegex, '').trim(),
            html: input.htmlBody
        };
    }

    let totalScore = 0;
    const reportSections: { title: string; content: string[] }[] = [];

    if (forwardedInfo?.originalSender.includes('@')) {
        const senderDomain = forwardedInfo.originalSender.split('@')[1];
        const senderDeepDive = await getDomainDeepDive(senderDomain);
        totalScore += senderDeepDive.score;
        reportSections.push({ title: `Sender Domain Analysis (${senderDomain})`, content: senderDeepDive.report });
    }

    const primaryUrl = extractCallToActionUrl(contentToAnalyze.plain, contentToAnalyze.html);

    if (primaryUrl) {
        const scanResult: UrlScanResult = await getUrlScanReport(primaryUrl);
        
        if (scanResult.error) {
            reportSections.push({ title: "URL Sandbox Analysis", content: [`- urlscan.io Error: ${scanResult.error}`] });
        } else if (scanResult.final_domain) {
            const initialDomain = new URL(primaryUrl).hostname;
            const reportContent: string[] = [];

            if (initialDomain.includes('googleapis.com')) {
                totalScore += 10;
                reportContent.push("- Tactic: Attacker used a Google redirect service to hide the final destination.");
                reportContent.push(`- Initial Link Domain: ${initialDomain}`);
            }

            reportContent.push(`- Final Landing Domain: ${scanResult.final_domain}`);
            reportContent.push(`- Final IP: ${scanResult.final_ip || 'N/A'}`);
            reportContent.push(`- Page Title: ${scanResult.page_title || 'N/A'}`);
            reportSections.push({ title: `URL Sandbox Analysis`, content: reportContent });

            const payloadDeepDive = await getDomainDeepDive(scanResult.final_domain);
            totalScore += payloadDeepDive.score;
            reportSections.push({ title: `Payload Domain Analysis (${scanResult.final_domain})`, content: payloadDeepDive.report });
        }
    } else {
        reportSections.push({ title: "URL Analysis", content: ["- No primary call-to-action link found."] });
    }

    const finalScore = Math.min(totalScore, 30);
    let threatVerdict: string = 'SAFE';
    if (finalScore >= 30) { threatVerdict = 'ABSOLUTELY DANGEROUS'; }
    else if (finalScore >= 21) { threatVerdict = 'VERY SUSPICIOUS'; }
    else if (finalScore >= 11) { threatVerdict = 'SUSPICIOUS'; }
    else if (finalScore >= 6) { threatVerdict = 'BE CAREFUL'; }

    const finalReportSections = [
        `**Summary:**\n- **Final Verdict:** ${threatVerdict}\n- **Threat Score:** ${finalScore}/30`,
        ...reportSections.map(s => `**${s.title}**\n${s.content.join('\n')}`)
    ];
    const report = `**Threat Intelligence Report**\n\n${finalReportSections.filter(Boolean).join('\n\n---\n\n')}`;

    return {
        threatVerdict: threatVerdict as AnalyzeEmailOutput['threatVerdict'],
        threatScore: finalScore,
        report: report
    };
}
