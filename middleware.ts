import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/demo',
  '/pricing',
  '/blog',
  '/blog/(.*)',
  '/brokers',
  '/affiliate',
  '/about',
  '/security',
  '/contact',
  '/changelog',
  '/integrations',
  '/use-cases',
  '/privacy',
  '/terms',
  '/u/(.*)',           // public profile pages
  '/api/stripe/webhook',
  '/originkit-preview', // throwaway Originkit component preview
  /* Static land geometry for the landing-page globe. It needs an explicit
     entry because the matcher below excludes static extensions with
     `js(?!on)` — that negative lookahead deliberately keeps .json requests
     flowing through this middleware, so without this the asset is treated
     as a protected route and auth.protect() 404s it for logged-out
     visitors, i.e. everyone the landing page is for. */
  '/geo/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // Redirect authenticated users from landing page to the app
  const { userId } = await auth();
  if (userId && req.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/app', req.url));
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|mov|m4v|ogv|mp3|wav)).*)',
    '/(api|trpc)(.*)',
  ],
};
