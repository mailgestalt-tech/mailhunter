import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";

export function FaqSection() {
    const faqs = [
        {
            question: "How is this service priced?",
            answer: "The core analysis features are available for free to help the community. I plan to introduce advanced features and enterprise-level tiers in the future for users who need more powerful capabilities."
        },
        {
            question: "What happens to my email after I send it?",
            answer: "Your privacy is paramount. When you forward an email, the only piece of your information the service sees is your email address, which is used solely to send the analysis report back to you. The system analyzes only the content of the forwarded email. I will never send you unsolicited emails, and the report you receive will never contain call-to-action links or attachments. After the analysis, the original email is permanently deleted; only anonymized technical indicators (like malicious domains or IPs) are stored to improve future analyses."
        },
        {
            question: "How long does a full report take?",
            answer: "Due to deep sandbox analysis and infrastructure investigation, a full report can take anywhere from 2 to 5 minutes to generate. I prioritize thoroughness over speed to give you the most accurate assessment."
        },
        {
            question: "Who runs this service?",
            answer: <>This service is built and maintained by WiredGeist, an IT infrastructure and cybersecurity specialist. You can view the entire open-source code on <Link href="https://github.com/WiredGeist/geisthunt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub</Link>.</>
        }
    ];

  return (
    <section id="faq" className="py-20 md:py-28 bg-transparent">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-headline">Frequently Asked Questions</h2>
        </div>
        <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                    <AccordionItem value={`item-${index+1}`} key={index} className="border-border">
                        <AccordionTrigger className="text-lg text-left font-headline">{faq.question}</AccordionTrigger>
                        <AccordionContent className="text-base text-muted-foreground">
                            {faq.answer}
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
      </div>
    </section>
  );
}
