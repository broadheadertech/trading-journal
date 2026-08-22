import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The ATLAS brand marks ship as first-party SVGs; the optimizer refuses SVG
    // without this. Locked down with a sandboxed, script-free CSP.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
