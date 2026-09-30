import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Roadkill - Retro 3D Combat Racing',
  description: 'Fast-paced pseudo-3D motorcycle racing and combat game inspired by Road Rash. Battle rival bikers across USA, Italy, Japan, and France with authentic 8-bit sound effects and chiptune action.',
  openGraph: {
    title: 'Roadkill - Retro 3D Combat Racing',
    description: 'Fast-paced pseudo-3D motorcycle racing and combat game inspired by Road Rash.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roadkill - Retro 3D Combat Racing',
    description: 'Fast-paced pseudo-3D motorcycle racing and combat game inspired by Road Rash.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="bg-black text-slate-100 min-h-screen overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
