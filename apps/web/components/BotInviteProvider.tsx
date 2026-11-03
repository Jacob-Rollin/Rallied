"use client";

import { createContext, useContext } from "react";
import {
  BOT_INVITE_FALLBACK_HREF,
  getPublicBotInviteHref,
} from "@/lib/bot-invite";

const BotInviteContext = createContext<string | null>(null);

/**
 * Pass a server-resolved OAuth invite href into client trees (AppShell, demo,
 * ops) so nested CTAs never fall back to the developer portal.
 */
export function BotInviteProvider({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <BotInviteContext.Provider value={href}>{children}</BotInviteContext.Provider>
  );
}

/** Prefer provider href; else public env helper (never developers/applications). */
export function useBotInviteHref(): string {
  const fromProvider = useContext(BotInviteContext);
  if (fromProvider) return fromProvider;
  return getPublicBotInviteHref() || BOT_INVITE_FALLBACK_HREF;
}
