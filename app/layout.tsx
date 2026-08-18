import type { Metadata } from "next";
import { Geist, Geist_Mono, League_Spartan, Montserrat, Archivo, Inter, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import ConvexClientProvider from '@/components/ConvexClientProvider';
import "./globals.css";
// ATLAS design system — see app/atlas.css. Loaded after globals so its
// component classes win over the legacy Tailwind chrome on marketing routes.
import "./atlas.css";
// ATLAS dashboard design system, scoped under .atlas-dash. Must load after
// atlas.css — 30 class names are shared between the two sheets.
import "./atlas-dashboard.css";

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

// ── ATLAS type stack — the four faces uiux/atlass.html loads from Google ──
// Archivo = display/headlines, Inter = body, Geist Mono = figures,
// IBM Plex Mono = micro labels. Wired to the --font-* vars atlas.css reads.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400"],
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
        <body className={`${geistSans.variable} ${geistMono.variable} ${leagueSpartan.variable} ${montserrat.variable} ${archivo.variable} ${inter.variable} ${plexMono.variable} antialiased`}>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
