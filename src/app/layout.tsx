import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});


export const metadata: Metadata = {
  title: 'Geist Hunt',
  description: 'Free, automated email threat intelligence service.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark !scroll-smooth">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-body antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
