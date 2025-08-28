import Link from 'next/link';
import { Github, ShieldCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Menu } from 'lucide-react';

export function Navbar() {
  const navLinks = [
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#features', label: 'Features' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <header className="py-4 px-4 md:px-6 lg:px-8 bg-background/80 backdrop-blur-sm sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" prefetch={false}>
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg font-headline text-foreground">Geist Hunt</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-primary transition-colors" prefetch={false}>
              {link.label}
            </Link>
          ))}
          <Link href="https://github.com/WiredGeist" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="GitHub Repository" prefetch={false}>
            <Github className="h-5 w-5" />
          </Link>
        </nav>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="grid gap-6 text-lg font-medium p-6">
                <Link href="/" className="flex items-center gap-2 mb-6" prefetch={false}>
                    <ShieldCheck className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg font-headline text-foreground">Geist Hunt</span>
                </Link>
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground" prefetch={false}>
                    {link.label}
                  </Link>
                ))}
                <Link href="https://github.com/WiredGeist" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="GitHub Repository" prefetch={false}>
                  GitHub
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
