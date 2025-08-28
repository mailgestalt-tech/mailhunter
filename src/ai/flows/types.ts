// This file contains the Zod schemas and TypeScript type definitions.
// It does NOT use the 'use server' directive because it only defines
// data structures, not server-side actions.

import { z } from 'zod';

// Schema for the input of the analysis function
export const AnalyzeEmailInputSchema = z.object({
  sender: z.string().describe('The email address of the sender.'),
  subject: z.string().describe('The subject line of the email.'),
  body: z.string().describe('The plain text body of the email.'),
  // Note: Your analysis page also passes an optional htmlBody.
  // You can add it here to make the type match perfectly.
  htmlBody: z.string().optional().describe('The HTML body of the email.'),
});
// The TypeScript type inferred from the input schema
export type AnalyzeEmailInput = z.infer<typeof AnalyzeEmailInputSchema>;


// Schema for the output of the analysis function
export const AnalyzeEmailOutputSchema = z.object({
  threatVerdict: z
    .enum(['SAFE', 'SUSPICIOUS', 'DANGEROUS'])
    .describe('The final verdict on the safety of the email.'),
  threatScore: z
    .number()
    .min(0)
    .max(10)
    .describe(
      'A numerical score from 0 (Safe) to 10 (Highly Dangerous) representing the threat level.'
    ),
  report: z
    .string()
    .describe(
      'A detailed, plain-text analysis report formatted with markdown. It should explain the verdict and score based on header analysis, keyword analysis, and sender reputation. Identify specific suspicious elements.'
    ),
});
// The TypeScript type inferred from the output schema
export type AnalyzeEmailOutput = z.infer<typeof AnalyzeEmailOutputSchema>;