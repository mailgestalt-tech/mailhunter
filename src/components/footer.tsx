import Link from 'next/link';

// Using a generic SVG props type for better reusability
type IconProps = React.SVGProps<SVGSVGElement>;

const PatreonIcon = (props: IconProps) => (
    <svg viewBox="0 0 569 546" xmlns="http://www.w3.org/2000/svg" {...props}>
        <g>
            <circle cx="362.589996" cy="204.589996" r="204.589996" fill="currentColor"></circle>
            <rect height="545.799988" width="100" x="0" y="0" fill="currentColor"></rect>
        </g>
    </svg>
);

const CoffeeIcon = (props: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" x2="6" y1="1" y2="4" />
        <line x1="10" x2="10" y1="1" y2="4" />
        <line x1="14" x2="14" y1="1" y2="4" />
    </svg>
);


export function Footer() {
  return (
    <footer className="border-t border-border bg-transparent">
      <div className="container mx-auto py-6 px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* --- THIS TEXT HAS BEEN UPDATED --- */}
        <div className="text-sm text-muted-foreground text-center md:text-left">
          <p>
            © {new Date().getFullYear()} Geist Hunt. Built by{' '}
            <Link href="https://wiredgeist.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
              WiredGeist
            </Link>.
          </p>
          <p className="mt-1">
            Find this service useful? Consider supporting its development.
          </p>
        </div>

        <div className="flex items-center gap-4">
            <Link href="https://www.patreon.com/WiredGeist" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Support on Patreon">
                <PatreonIcon className="h-5 w-5" />
            </Link>
            <Link href="https://ko-fi.com/wiredgeist" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label="Buy Me a Coffee">
                <CoffeeIcon className="h-5 w-5" />
            </Link>
            {/* --- GITHUB LINK REMOVED --- */}
        </div>
      </div>
    </footer>
  );
}
