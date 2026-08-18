import type { Metadata } from "next";
import { Geist, Geist_Mono, League_Spartan, Montserrat } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import ConvexClientProvider from '@/components/ConvexClientProvider';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Brand font — used for the ATLAS wordmark and headlines
const leagueSpartan = League_Spartan({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["500", "700", "800", "900"],
});

// Body / supporting copy font
const montserrat = Montserrat({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Atlas - Trading Journal & Analytics",
  description: "Unlock the psychology behind every trade. AI-powered journal for crypto, stocks, and forex.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} ${leagueSpartan.variable} ${montserrat.variable} antialiased`}>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
