import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Forward, Network, FileText } from "lucide-react";

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-transparent">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-headline">How It Works</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">A simple, private, and automated process to keep you safe.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <Card className="text-center bg-card/50 border-border">
            <CardHeader className="items-center p-6">
              <div className="p-3 rounded-full bg-primary/10 mb-4">
                <Forward className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline">Step 1: Forward</CardTitle>
              <CardDescription className="pt-2 text-muted-foreground">
                You forward any suspicious email to my secure, automated address.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center bg-card/50 border-border">
            <CardHeader className="items-center p-6">
              <div className="p-3 rounded-full bg-primary/10 mb-4">
                <Network className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline">Step 2: Dissect</CardTitle>
              <CardDescription className="pt-2 text-muted-foreground">
                My private backend engine performs a deep investigation: sandboxing links, analyzing infrastructure, and checking against a threat database.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center bg-card/50 border-border">
            <CardHeader className="items-center p-6">
              <div className="p-3 rounded-full bg-primary/10 mb-4">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-headline">Step 3: Report</CardTitle>
              <CardDescription className="pt-2 text-muted-foreground">
                You receive a comprehensive intelligence report back in your inbox. Your original email is then permanently deleted from my system.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  );
}
