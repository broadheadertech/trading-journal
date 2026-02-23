type AuthCtx = {
  auth: {
    getUserIdentity: () => Promise<{ subject: string } | null>;
  };
};

/** For queries — returns null instead of throwing so the UI degrades gracefully on sign-out. */
export async function getUser(ctx: AuthCtx): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

/** For mutations — throws if not authenticated. */
export async function requireUser(ctx: AuthCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}
