import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Pin the workspace root to this directory. Next infers it from the nearest
     lockfile, and a stray package-lock.json in the user home directory
     made it pick that instead — PostCSS/Tailwind then resolved from outside the
     project and every request died with "Can't resolve 'tailwindcss'", with the
     port open but nothing served. Pinning it makes the dev server immune to any
     lockfile that appears above the project. */
  turbopack: { root: __dirname },
  images: {
    // The ATLAS brand marks ship as first-party SVGs; the optimizer refuses SVG
    // without this. Locked down with a sandboxed, script-free CSP.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
