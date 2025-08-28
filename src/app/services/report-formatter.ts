// src/app/services/report-formatter.ts (Corrected Version)
'use server';

import { AnalyzeEmailOutput } from "@/ai/flows/types"; // Import the type for better safety

// A simple helper to get a color based on the verdict
function getVerdictColor(verdict: string): string {
    if (verdict.includes('DANGEROUS')) return '#dc3545'; // Red
    if (verdict.includes('SUSPICIOUS')) return '#ffc107'; // Orange
    if (verdict.includes('BE CAREFUL')) return '#17a2b8'; // Blue
    return '#28a745'; // Green
}

// --- FIX: Added the 'async' keyword to the function signature ---
export async function generateHtmlReport(reportData: AnalyzeEmailOutput): Promise<string> {
    const { threatVerdict, threatScore, report } = reportData;

    const sections = report.split('\n\n---\n\n');
    sections.shift(); // Remove the summary section as we'll format it separately

    const color = getVerdictColor(threatVerdict);

    const formattedSections = sections.map(section => {
        const lines = section.split('\n');
        const title = lines.shift() || '';
        const content = lines.map(line => `<li>${line.replace(/- /g, '')}</li>`).join('');
        return `
            <div class="section">
                <h3>${title.replace(/\*/g, '')}</h3>
                <ul>${content}</ul>
            </div>
        `;
    }).join('');

    // The function now returns a Promise<string> implicitly, which is correct.
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f7f6; }
            .container { max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
            .header { background-color: #343a40; color: #ffffff; padding: 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .verdict-banner { background-color: ${color}; color: #ffffff; padding: 15px 20px; text-align: center; }
            .verdict-banner h2 { margin: 0; font-size: 20px; }
            .verdict-banner p { margin: 5px 0 0; font-size: 16px; }
            .content { padding: 20px; }
            .section { margin-bottom: 20px; }
            .section h3 { font-size: 18px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-top: 0; }
            .section ul { list-style-type: none; padding-left: 0; }
            .section li { background-color: #f8f9fa; padding: 10px; border-radius: 4px; margin-bottom: 5px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
            .footer { background-color: #f4f7f6; color: #777; padding: 15px; text-align: center; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header"><h1>Geist Hunt Analysis Report</h1></div>
            <div class="verdict-banner">
                <h2>${threatVerdict}</h2>
                <p>Threat Score: ${threatScore}/30</p>
            </div>
            <div class="content">
                ${formattedSections}
            </div>
            <div class="footer">
                <p>Analysis completed at ${new Date().toUTCString()}</p>
            </div>
        </div>
    </body>
    </html>
    `;
}
