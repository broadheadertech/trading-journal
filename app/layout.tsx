import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "PsychSync - Trading Journal & Analytics",
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
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
