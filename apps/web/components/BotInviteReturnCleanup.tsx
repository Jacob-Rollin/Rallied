"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GUILD_COOKIE, GUILD_QUERY } from "@/lib/guild-params";

/**
 * After Discord Advanced Bot Auth, the redirect includes `code`, `guild_id`,
 * `permissions`, and `iss`. We only need guild_id as a hint — strip the rest
 * so the auth code is not left in the address bar / history.
 */
export function BotInviteReturnCleanup({
  guildId,
}: {
  guildId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hasOAuthNoise =
      searchParams.has("code") ||
      searchParams.has("permissions") ||
      searchParams.has("iss") ||
      searchParams.has("guild_id") ||
      searchParams.has("error");
    if (!hasOAuthNoise) return;

    const id = guildId || searchParams.get("guild_id") || searchParams.get(GUILD_QUERY);
    if (id) {
      const maxAge = 60 * 60 * 24 * 30;
      document.cookie = `${GUILD_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${maxAge}; samesite=lax`;
    }

    const next = new URLSearchParams();
    if (id) next.set(GUILD_QUERY, id);
    next.set("installed", "1");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }, [guildId, pathname, router, searchParams]);

  return null;
}
