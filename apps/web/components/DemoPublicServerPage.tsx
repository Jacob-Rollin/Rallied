"use client";

import { DemoPublicVanityUnlock } from "@/components/DemoPublicVanityUnlock";
import { PublicServerView } from "@/components/PublicServerView";
import type { PublicServerBundle } from "@/lib/public-data";

/** Community demo public page with Upgrade → Pro vanity preview. */
export function DemoPublicServerPage({
  bundle,
}: {
  bundle: PublicServerBundle;
}) {
  return (
    <DemoPublicVanityUnlock serverName={bundle.server.name}>
      {({ showPoweredBy, accent, useGuildIcon }) => (
        <PublicServerView
          bundle={bundle}
          vanity={{ showPoweredBy, accent, useGuildIcon }}
        />
      )}
    </DemoPublicVanityUnlock>
  );
}
