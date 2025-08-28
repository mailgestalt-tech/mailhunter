'use server';

import whois from 'node-whois';
import tls from 'tls';
import dns from 'dns';

interface WhoisData {
    registrar?: string | null;
    created?: string | null;
    error?: string;
}

interface TlsData {
    issuer?: string;
    error?: string;
}

// Promisify dns.resolve so we can use it with async/await
const resolveMx = (domain: string): Promise<dns.MxRecord[]> => {
  return new Promise((resolve, reject) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err) return reject(err);
      resolve(addresses);
    });
  });
};


function parseWhoisDate(dateStr: string | string[] | undefined): Date | null {
    if (!dateStr) return null;
    const date = Array.isArray(dateStr) ? dateStr[0] : dateStr;
    try {
        return new Date(date);
    } catch {
        return null;
    }
}

async function getMxServer(domain: string): Promise<string | null> {
    try {
        const addresses = await resolveMx(domain);
        if (addresses && addresses.length > 0) {
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

    // --- WHOIS Lookup ---
    const whois_data: WhoisData = {};
    try {
        const result = await whois.lookup(domain);
        // The result is a raw string that needs parsing
        const createdMatch = result.match(/Creation Date:\s*(.*)/i);
        const registrarMatch = result.match(/Registrar:\s*(.*)/i);

        if (createdMatch && createdMatch[1]) {
            const creationDate = new Date(createdMatch[1].trim());
            const age = Math.floor((new Date().getTime() - creationDate.getTime()) / (1000 * 3600 * 24));
            whois_data.created = `${creationDate.toISOString().split('T')[0]} (${age} days ago)`;
        } else {
            whois_data.created = "Unknown";
        }
        
        whois_data.registrar = registrarMatch ? registrarMatch[1].trim() : "Unknown";

    } catch (e: any) {
        whois_data.error = "WHOIS lookup failed. Domain may not exist, be new, or be privacy-protected.";
    }

    // --- SSL/TLS Certificate Lookup ---
    const tls_data: TlsData = {};
    try {
        const mxServer = await getMxServer(domain) || domain;

        const options = {
            host: mxServer,
            port: 443,
            servername: domain, // Use original domain for SNI
            rejectUnauthorized: false
        };

        const cert = await new Promise<tls.DetailedPeerCertificate>((resolve, reject) => {
            const socket = tls.connect(options, () => {
                if (socket.authorized || options.rejectUnauthorized === false) {
                     const peerCert = socket.getPeerCertificate(true);
                     socket.end();
                     if(peerCert && Object.keys(peerCert).length > 0){
                       resolve(peerCert);
                     } else {
                       reject(new Error("No certificate presented by the server."));
                     }
                } else {
                    reject(new Error(`TLS authorization failed: ${socket.authorizationError}`));
                }
            });

            socket.on('error', (err) => reject(err));
            socket.setTimeout(5000, () => {
                socket.destroy();
                reject(new Error("TLS connection timed out."));
            });
        });
        
        tls_data.issuer = cert.issuer.O || 'Unknown Issuer';

    } catch (e: any) {
        tls_data.error = `TLS lookup failed. Site may not use HTTPS or is down. (${e.message})`;
    }
        
    return { whois: whois_data, tls: tls_data };
}
