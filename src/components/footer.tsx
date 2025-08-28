import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Search, Map, Fingerprint, GlobeLock, Bot, GitBranch, Link2, History } from "lucide-react";

export function FeaturesSection() {
    const instantFeatures = [
        {
            icon: <Bot className="h-8 w-8 text-primary" />,
            title: "AI Strategic Analysis",
            description: "My engine uses AI to analyze attacker tactics and predict the overall goal of a malicious email."
        },
        {
            icon: <Search className="h-8 w-8 text-primary" />,
            title: "Header & Keyword Analysis",
            description: "Scans email headers for authentication issues (SPF, DKIM, DMARC) and analyzes content for suspicious keywords and phrases."
        },
        {
            icon: <Fingerprint className="h-8 w-8 text-primary" />,
            title: "WHOIS & SSL Intel",
            description: "Looks up domain registration data and TLS certificate details to verify the sender's legitimacy and infrastructure age."
        },
        {
            icon: <GlobeLock className="h-8 w-8 text-primary" />,
            title: "Passive DNS Lookup",
            description: "Uses VirusTotal to find other domains hosted on the same IP and related domains via SSL certificates."
        },
    ];

    const deepFeatures = [
        {
            // --- MOVED FROM INSTANT FEATURES ---
            icon: <Map className="h-8 w-8 text-primary" />,
            title: "Geographic Origin Trace",
            description: "Identifies the geographic location of the email's origin server to help spot high-risk regions."
        },
        {
            icon: <GitBranch className="h-8 w-8 text-primary" />,
            title: "Automated Pivoting",
            description: "The engine automatically investigates linked domains and IPs to uncover hidden attacker infrastructure."
        },
        {
            icon: <Link2 className="h-8 w-8 text-primary" />,
            title: "Sandbox Detonation",
            description: "Suspicious links are safely detonated in an isolated environment (urlscan.io) to observe their true behavior and final destination."
        },
        {
            icon: <History className="h-8 w-8 text-primary" />,
            title: "Historical Reputation",
            description: "Checks sender domains, IPs, and URLs against a database of known threats to identify repeat offenders."
        },
    ];

  return (
    <section id="features" className="py-20 md:py-28 bg-transparent">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-headline">Free Instant Analysis</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            When you forward an email, my engine performs the following checks as part of the full report.
          </p>
        </div>
        {/* Grid is now a balanced 2x2 layout */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 mb-20">
          {instantFeatures.map((feature, index) => (
            <Card key={index} className="flex flex-col bg-card/50 border-border">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                <div className="p-3 rounded-full bg-primary/10">
                  {feature.icon}
                </div>
                <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-headline">Deep Analysis Engine</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            My backend engine goes even further, automatically executing these advanced techniques as part of every report.
          </p>
        </div>
        {/* Grid is also a balanced 2x2 layout */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {deepFeatures.map((feature, index) => (
                <Card key={index} className="flex flex-col bg-card/50 border-border">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <div className="p-3 rounded-full bg-primary/10">
                    {feature.icon}
                    </div>
                    <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </section>
  );
}
