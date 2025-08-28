// src/app/services/domain-service.ts (Final, Most Robust Version)
'use server';

import whois from 'node-whois';
import tls from 'tls';
import dns from 'dns';

// Make sure you have `declare module 'node-whois';` in a separate `declarations.d.ts` file.

interface WhoisData {
    registrar?: string | null;
    created?: string | null;
    error?: string;
}

interface TlsData {
    issuer?: string;
    error?: string;
}

const resolveMx = (domain: string): Promise<dns.MxRecord[]> => {
  return new Promise((resolve, reject) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err) return reject(err);
      resolve(addresses);
    });
  });
};

async function getMxServer(domain: string): Promise<string | null> {
    try {
        const addresses = await resolveMx(domain);
        if (addresses && addresses.length > 0) {
            addresses.sort((a, b) => a.priority - b.priority);
            return addresses[0].exchange;
        }
        return null;
    } catch (error) {
        return null;
    }
}

export async function getDomainIntel(domain: string): Promise<{ whois: WhoisData, tls: TlsData }> {
    if (!domain) {
        return {
            whois: { error: "No domain provided." },
            tls: { error: "No domain provided." }
        };
    }

    const whois_data: WhoisData = {};
    try {
        const rawResult: any = await whois.lookup(domain);
        const result = Array.isArray(rawResult) ? rawResult.map(r => r.data).join('\n') : rawResult;
        
        // --- FINAL, MOST ROBUST REGEX ---
        // Catches more labels and handles different line endings and spacings.
        const createdMatch = result.match(/(Creation Date|Created On|Registered on|Created|Registration Time):\s*(.*)/i);
        const registrarMatch = result.match(/(Registrar|Reseller|Registrar Name):\s*(.*)/i);

        if (createdMatch && createdMatch[2]) {
            const dateString = createdMatch[2].trim().split('T')[0];
            const creationDate = new Date(dateString);
            if (!isNaN(creationDate.getTime())) {
                const age = Math.floor((new Date().getTime() - creationDate.getTime()) / (1000 * 3600 * 24));
                whois_data.created = `${creationDate.toISOString().split('T')[0]} (${age} days ago)`;
            } else {
                whois_data.created = "Invalid date in WHOIS";
            }
        } else {
            // --- ADDED FALLBACK: Look for any standalone date format ---
            const dateRegex = /(\d{4}-\d{2}-\d{2})/;
            const fallbackDateMatch = result.match(dateRegex);
            if (fallbackDateMatch && fallbackDateMatch[1]) {
                const creationDate = new Date(fallbackDateMatch[1]);
                 if (!isNaN(creationDate.getTime())) {
                    const age = Math.floor((new Date().getTime() - creationDate.getTime()) / (1000 * 3600 * 24));
                    whois_data.created = `${creationDate.toISOString().split('T')[0]} (${age} days ago)`;
                 }
            } else {
                 whois_data.created = "Unknown";
            }
        }
        
        whois_data.registrar = registrarMatch ? registrarMatch[2].trim() : "Unknown";

    } catch (e: any) {
        whois_data.error = "WHOIS lookup failed. Domain may be new or privacy-protected.";
    }

    const tls_data: TlsData = {};
    try {
        const mxServer = await getMxServer(domain) || domain;
        const options = { host: mxServer, port: 443, servername: domain, rejectUnauthorized: false };

        const cert = await new Promise<tls.DetailedPeerCertificate>((resolve, reject) => {
            const socket = tls.connect(options, () => {
                if (socket.authorized || !options.rejectUnauthorized) {
                     const peerCert = socket.getPeerCertificate(true);
                     socket.end();
                     if(peerCert && Object.keys(peerCert).length > 0){
                       resolve(peerCert);
                     } else {
                       reject(new Error("No certificate presented."));
                     }
                } else {
                    reject(new Error(`TLS authorization failed: ${socket.authorizationError}`));
                }
            });
            socket.on('error', (err) => reject(err));
            socket.setTimeout(5000, () => { socket.destroy(); reject(new Error("TLS connection timed out.")); });
        });

        tls_data.issuer = cert.issuer.O || 'Unknown Issuer';
    } catch (e: any) {
        tls_data.error = `TLS lookup failed. (${e.message})`;
    }

    return { whois: whois_data, tls: tls_data };
}
