'use server';

import fetch from 'node-fetch';

const URLSCAN_API_KEY = process.env.URLSCAN_API_KEY;

// --- UPGRADED INTERFACE TO CAPTURE DETAILED DATA ---
interface UrlScanResult {
    error?: string;
    // Main Page Info
    final_url?: string;
    final_domain?: string;
    final_ip?: string;
    final_ip_country?: string;
    final_ip_asn?: string;

    // Page Details
    page_title?: string;
    
    // Server & Certificate Details
    server?: string;
    tls_issuer?: string;
    
    // Full list of contacted domains and IPs
    contacted_domains?: string[];
    contacted_ips?: string[];
}

// Helper function to delay execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getUrlScanReport(urlToScan: string): Promise<UrlScanResult> {
    if (!URLSCAN_API_KEY || URLSCAN_API_KEY.includes("YOUR_URLSCAN")) {
        return { error: "urlscan.io API key not configured." };
    }
    
    if (urlToScan.length > 2000) {
        return { error: "URL is too long for urlscan.io API." };
    }

    const headers = { 'API-Key': URLSCAN_API_KEY, 'Content-Type': 'application/json' };
    const body = JSON.stringify({ url: urlToScan, visibility: "private" });

    try {
        // --- STEP 1: SUBMIT THE URL FOR SCANNING ---
        console.log(`[urlscan.io] Submitting URL for analysis: ${urlToScan}`);
        const submitResponse = await fetch('https://urlscan.io/api/v1/scan/', {
            method: 'POST',
            headers,
            body,
            timeout: 20000,
        });

        if (!submitResponse.ok) {
            const errorBody: any = await submitResponse.json();
            return { error: `API submission failed: ${errorBody.message || 'Unknown error'}` };
        }

        const submitData: any = await submitResponse.json();
        const resultApiUrl = submitData.api;
        
        if (!resultApiUrl) {
            return { error: `API submission failed: ${submitData.message || 'Could not get result URL'}` };
        }
        
        console.log("[urlscan.io] Scan submitted. Now polling for final results...");
        
        // --- STEP 2: POLLING FOR THE FINAL RESULT ---
        for (let i = 0; i < 12; i++) { 
            await sleep(10000);
            console.log(` > Checking for results (attempt ${i + 1}/12)...`);

            const resultResponse = await fetch(resultApiUrl, { timeout: 10000 });
            
            if (resultResponse.status === 200) {
                console.log("[urlscan.io] SUCCESS: Final results received.");
                const scanData: any = await resultResponse.json();
                
                const pageData = scanData.page || {};
                const lists = scanData.lists || {};

                // --- EXTRACT THE DETAILED DATA YOU REQUESTED ---
                return {
                    final_url: pageData.url,
                    final_domain: pageData.domain,
                    final_ip: pageData.ip,
                    final_ip_country: pageData.country,
                    final_ip_asn: pageData.asnname,
                    page_title: scanData.task?.pageTitle,
                    server: pageData.server,
                    tls_issuer: pageData.tlsIssuer,
                    contacted_domains: lists.domains || [],
                    contacted_ips: lists.ips || [],
                };
            }
            
            if (resultResponse.status === 404) {
                continue; 
            }

            const errorText = await resultResponse.text();
            return { error: `Error fetching results. Status: ${resultResponse.status}, Body: ${errorText}` };
        }
        
        return { error: "Scan timed out on urlscan.io after 2 minutes." };

    } catch (e: any) {
        return { error: `urlscan.io API Error: ${e.message}` };
    }
}