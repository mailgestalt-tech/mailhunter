// src/app/services/url-service.ts (Faster Polling Version)
'use server';

import fetch from 'node-fetch';

const URLSCAN_API_KEY = process.env.URLSCAN_API_KEY;

export interface UrlScanResult {
    error?: string;
    final_url?: string;
    final_domain?: string;
    final_ip?: string;
    page_title?: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function resolveRedirect(url: string): Promise<string> {
    // Safety check for non-web links
    if (!url.startsWith('http')) {
        return url;
    }
    try {
        const response = await fetch(url, { method: 'HEAD', redirect: 'follow', timeout: 5000 });
        return response.url;
    } catch (error) {
        console.error(`Redirect resolution failed for ${url}:`, error);
        return url;
    }
}

export async function getUrlScanReport(urlToScan: string): Promise<UrlScanResult> {
    if (!URLSCAN_API_KEY || URLSCAN_API_KEY.includes("YOUR_URLSCAN")) {
        return { error: "urlscan.io API key not configured." };
    }
    
    const finalUrl = await resolveRedirect(urlToScan);

    if (!finalUrl.startsWith('http')) {
        return { error: `Cannot scan non-web link: ${finalUrl}` };
    }
    if (finalUrl.length > 2000) {
        return { error: "Resolved URL is too long for API." };
    }

    const headers = { 'API-Key': URLSCAN_API_KEY, 'Content-Type': 'application/json' };
    const body = JSON.stringify({ url: finalUrl, visibility: "private" });

    try {
        console.log(`[urlscan.io] Submitting final URL: ${finalUrl}`);
        const submitResponse = await fetch('https://urlscan.io/api/v1/scan/', {
            method: 'POST', headers, body, timeout: 5000,
        });

        if (!submitResponse.ok) {
            const errorBody: any = await submitResponse.json();
            return { error: `API submission failed: ${errorBody.description || errorBody.message}` };
        }

        const submitData: any = await submitResponse.json();
        const resultApiUrl = submitData.api;
        
        if (!resultApiUrl) {
            return { error: `API submission failed: ${submitData.message || 'Could not get result URL'}` };
        }
        
        // --- FASTER POLLING LOOP FOR VERCEL HOBBY PLAN ---
        // We will try 3 times, waiting only 2 seconds between each attempt.
        // This keeps the total potential wait time under Vercel's 10-second limit.
        for (let i = 0; i < 3; i++) { 
            await sleep(2000); // Wait 2 seconds
            console.log(`[urlscan.io] Polling for results (attempt ${i + 1}/3)...`);
            const resultResponse = await fetch(resultApiUrl, { timeout: 2000 });
            
            if (resultResponse.status === 200) {
                console.log('[urlscan.io] Scan result received successfully.');
                const scanData: any = await resultResponse.json();
                return {
                    final_url: scanData.page?.url,
                    final_domain: scanData.page?.domain,
                    final_ip: scanData.page?.ip,
                    page_title: scanData.task?.pageTitle,
                };

            }
            if (resultResponse.status !== 404) {
                return { error: `Error fetching results. Status: ${resultResponse.status}` };
            }
        }
        
        // If the loop finishes, the scan is taking too long for this environment.
        return { error: "Scan is taking too long to complete within the serverless function timeout." };

    } catch (e: any) {
        return { error: `urlscan.io API Error: ${e.message}` };
    }
}
