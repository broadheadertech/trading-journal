import type { Metadata } from "next";
import { Manrope, DM_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import ConvexClientProvider from '@/components/ConvexClientProvider';
import "./globals.css";
// ATLAS design system — see app/atlas.css. Loaded after globals so its
// component classes win over the legacy Tailwind chrome on marketing routes.
import "./atlas.css";
// Sub-page chrome shared by the 11 marketing routes. atlass.html styles only
// its homepage, so these rules are authored to match its conventions.
import "./atlas-pages.css";
import "./atlas-demo.css";
import "./atlas-blog-pricing.css";
import "./atlas-routes.css";
// ATLAS dashboard design system, scoped under .atlas-dash. Must load after
// atlas.css — 30 class names are shared between the two sheets.
import "./atlas-dashboard.css";
// Mobile pass. Every rule inside is wrapped in a max-width media query, and it
// loads last so it wins source-order ties against the mobile blocks already in
// the sheets above. Desktop is untouched by construction.
import "./atlas-mobile.css";
// ATLAS light theme — html.light overrides for every colour token. Loaded last
// so it has the final say on theming. See app/atlas-light.css.
import "./atlas-light.css";

/* ── Type stack: Manrope + DM Mono ──────────────────────────────────────
   next/font self-hosts both and emits @font-face with size-adjust metrics,
   so there is no layout shift and no request to fonts.googleapis.com at
   runtime. Seven faces used to ship here (Geist, Geist Mono, League
   Spartan, Montserrat, Archivo, Inter, IBM Plex Mono); only these two do
   now, and the --font-* variables the stylesheets already read are
   repointed rather than renamed.

   The variables are --font-manrope / --font-dm-mono rather than
   --font-sans / --font-mono: those two names are Tailwind 4 @theme keys in
   globals.css, and a theme key defined as var() of itself is a cycle. They
   are mapped onto --font-sans / --font-mono there. */

// nav, headlines, body, buttons, uppercase labels
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
  // variable font: one file covers the whole 400-800 range
  weight: ["400", "500", "600", "700", "800"],
  fallback: ["system-ui", "sans-serif"],
});

// every number — figures, prices, badges, small data labels
const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500"],
  fallback: ["ui-monospace", "Menlo", "monospace"],
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
        <body className={`${manrope.variable} ${dmMono.variable} antialiased`}>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
