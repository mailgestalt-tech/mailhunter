"use client";

import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from '@/components/ui/card';

export function HeroSection() {
  const { toast } = useToast();
  const email = "mailgestalt@gmail.com";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(email);
    toast({
      title: "Copied to clipboard",
      description: `Email address ${email} has been copied.`,
    });
  };

  return (
    <section className="py-20 md:py-32 lg:py-40 bg-transparent">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-foreground mb-4 font-headline">
          Is Your Email a Threat? Find Out.
        </h1>
        <p className="max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground mb-8">
          Geist Hunt is an automated threat intelligence service. Forward suspicious emails with the word <strong className="text-primary">checkspam</strong> in the subject line, and my private engine will dissect them and send you a detailed security report.
        </p>
        <div className="flex justify-center">
          <Card className="max-w-md w-full shadow-lg bg-card border-border">
            <CardContent className="p-4 sm:p-6 flex items-center justify-between gap-4">
              <span className="text-base sm:text-lg font-mono text-muted-foreground truncate">
                {email}
              </span>
              <Button variant="ghost" size="icon" onClick={copyToClipboard} aria-label="Copy email address" className="flex-shrink-0 text-muted-foreground hover:text-primary">
                <Copy className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
