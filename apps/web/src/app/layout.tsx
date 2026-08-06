import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { Providers } from '../components/providers';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OpenSignFlow',
  description: 'Open-source AI-assisted PDF signing and document workflow platform.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
