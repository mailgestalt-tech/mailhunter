// src/app/services/url-service.ts (Corrected Version)
'use server';

import fetch from 'node-fetch';

const URLSCAN_API_KEY = process.env.URLSCAN_API_KEY;

export interface UrlScanResult {
    error?: string;
    final_url?: string;
    final_domain?: string;
    final_ip?: string;
    page_title?: string;
    // We can add more fields here as needed
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- NEW FUNCTION: Pre-resolve the redirect ---
async function resolveRedirect(url: string): Promise<string> {
    try {
        // A HEAD request is lightweight and will follow redirects by default
        const response = await fetch(url, { method: 'HEAD', redirect: 'follow', timeout: 10000 });
        // The 'response.url' will be the final destination URL after all redirects
        return response.url;
    } catch (error) {
        console.error(`Redirect resolution failed for ${url}:`, error);
        // If it fails, return the original URL and let urlscan try
        return url;
    }
}

export async function getUrlScanReport(urlToScan: string): Promise<UrlScanResult> {
    if (!URLSCAN_API_KEY || URLSCAN_API_KEY.includes("YOUR_URLSCAN")) {
        return { error: "urlscan.io API key not configured." };
    }
    
    // --- STEP 1: RESOLVE THE REDIRECT FIRST ---
    console.log(`[Geist Hunt] Resolving initial URL: ${urlToScan.substring(0, 80)}...`);
    const finalUrl = await resolveRedirect(urlToScan);
    console.log(`[Geist Hunt] Redirect resolved to: ${finalUrl}`);

    // If the redirect leads to a super long, un-scannable URL, report an error.
    if (finalUrl.length > 2000) {
        return { error: "Resolved URL is too long for urlscan.io API." };
    }

    const headers = { 'API-Key': URLSCAN_API_KEY, 'Content-Type': 'application/json' };
    const body = JSON.stringify({ url: finalUrl, visibility: "private" });

    try {
        // --- STEP 2: SUBMIT THE FINAL URL FOR SCANNING ---
        console.log(`[urlscan.io] Submitting final URL for analysis: ${finalUrl}`);
        const submitResponse = await fetch('https://urlscan.io/api/v1/scan/', {
            method: 'POST', headers, body, timeout: 20000,
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
        
        // --- STEP 3: POLLING FOR THE FINAL RESULT ---
        for (let i = 0; i < 15; i++) { 
            await sleep(8000); // Polling every 8 seconds
            const resultResponse = await fetch(resultApiUrl, { timeout: 10000 });
            
            if (resultResponse.status === 200) {
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
        
        return { error: "Scan timed out on urlscan.io after 2 minutes." };

    } catch (e: any) {
        return { error: `urlscan.io API Error: ${e.message}` };
    }
}
