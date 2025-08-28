'use server';

import fetch from 'node-fetch';

const VT_API_KEY = process.env.VT_API_KEY;

interface GeolocationData {
    status: 'success' | 'fail'; message?: string; ip?: string;
    country?: string; region?: string; city?: string; isp?: string; org?: string;
}

export async function getGeolocation(ipAddress: string): Promise<GeolocationData> {
    if (!ipAddress) { return { status: "fail", message: "No IP address provided." }; }
    const url = `http://ip-api.com/json/${ipAddress}?fields=status,message,country,regionName,city,isp,org,query`;
    try {
        const response = await fetch(url, { timeout: 5000 });
        const data: any = await response.json();
        if (data.status === 'success') {
            return {
                status: "success", ip: data.query, country: data.country, region: data.regionName,
                city: data.city, isp: data.isp, org: data.org,
            };
        } else {
            return { status: "fail", message: data.message || 'API returned a failure status.' };
        }
    } catch (error: any) {
        return { status: "fail", message: `API request error: ${error.message}` };
    }
}

export async function getReverseIpReport(ipAddress: string): Promise<string> {
    if (!ipAddress) return "No IP address to investigate.";
    if (!VT_API_KEY || VT_API_KEY.includes('YOUR_VT_API_KEY')) return "VirusTotal API key not configured.";
    const url = `https://www.virustotal.com/api/v3/ip_addresses/${ipAddress}/resolutions`;
    const headers = { "x-apikey": VT_API_KEY };
    try {
        const response = await fetch(url, { headers, timeout: 10000 });
        if (!response.ok) { return `Reverse IP Lookup Failed: API returned status ${response.status}.`; }
        const data: any = await response.json();
        const resolutions = data?.data || [];
        if (resolutions.length === 0) { return "No other domains found hosted on this IP."; }
        const domains = resolutions.slice(0, 5).map((item: any) => item.attributes.host_name);
        let report = "Other domains recently seen on this IP:\n" + domains.map((d: string) => `- ${d}`).join("\n");
        if (resolutions.length > 5) { report += `\n...and ${resolutions.length - 5} more.`; }
        return report;
    } catch (error: any) {
        return `Reverse IP Lookup Failed: API Error or rate limit exceeded.`;
    }
}

export async function getUrlVerdict(urlToScan: string): Promise<string> {
    if (!VT_API_KEY || VT_API_KEY.includes('YOUR_VT_API_KEY')) return "VirusTotal URL scanning not configured.";
    if (!urlToScan) return "No URL provided to scan.";
    try {
        const urlId = Buffer.from(urlToScan).toString('base64').replace(/=/g, '');
        const analysisUrl = `https://www.virustotal.com/api/v3/urls/${urlId}`;
        const headers = { "x-apikey": VT_API_KEY };
        const response = await fetch(analysisUrl, { headers });
        if (!response.ok) {
            if (response.status === 404) { return "URL not previously seen by VirusTotal."; }
            return `API Error: ${response.statusText}`;
        }
        const data: any = await response.json();
        const stats = data?.data?.attributes?.last_analysis_stats;
        if (!stats) { return "No analysis results found."; }
        const malicious = stats.malicious || 0;
        const suspicious = stats.suspicious || 0;
        if (malicious > 0) { return `DANGEROUS (${malicious} vendors flagged as malicious)`; }
        if (suspicious > 0) { return `SUSPICIOUS (${suspicious} vendors flagged as suspicious)`; }
        return `Clean (${stats.harmless || 0} vendors)`;
    } catch (error: any) {
        return `VirusTotal API request failed: ${error.message}`;
    }
}

export async function getDomainVerdict(domain: string): Promise<string> {
    if (!VT_API_KEY || VT_API_KEY.includes('YOUR_VT_API_KEY')) return "VirusTotal not configured.";
    if (!domain) return "No domain provided.";
    try {
        const url = `https://www.virustotal.com/api/v3/domains/${domain}`;
        const headers = { "x-apikey": VT_API_KEY };
        const response = await fetch(url, { headers });
        if (!response.ok) { return response.status === 404 ? "Domain not seen by VirusTotal." : `API Error: ${response.statusText}`; }
        const data: any = await response.json();
        const stats = data?.data?.attributes?.last_analysis_stats;
        if (!stats) { return "No analysis results."; }
        const malicious = stats.malicious || 0;
        const suspicious = stats.suspicious || 0;
        if (malicious > 0) { return `DANGEROUS (${malicious} vendors flagged as malicious)`; }
        if (suspicious > 0) { return `SUSPICIOUS (${suspicious} vendors flagged as suspicious)`; }
        return `Clean (${stats.harmless || 0} vendors)`;
    } catch (error: any) { return `VirusTotal API request failed.`; }
}
