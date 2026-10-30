import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { isOpsAllowlisted, getOpsDiscordIds } from "@/lib/ops-auth";
import { hasServiceRole } from "@/lib/supabase";
import { OpsUsagePanel } from "@/components/OpsUsagePanel";

export default async function OpsUsagePage() {
  const session = await getSession();
  if (!session.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl tracking-wide">Ops login</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with Discord. Access is limited to allowlisted staff IDs.
        </p>
        <Link
          href="/login?next=%2Fops%2Fusage"
          className="mt-6 inline-block rounded-brand bg-coral px-5 py-2.5 font-semibold text-slate"
        >
          Log in with Discord
        </Link>
      </div>
    );
  }

  if (session.isMock || !isOpsAllowlisted(session.user.id)) {
    const allowlistEmpty = getOpsDiscordIds().size === 0;
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl tracking-wide">Not allowlisted</h1>
        <p className="mt-2 text-sm text-muted">
          {allowlistEmpty
            ? "OPS_DISCORD_IDS is empty on the web Worker. Add your Discord user id (snowflake) as a Cloudflare secret."
            : `Signed in as ${session.user.globalName || session.user.username} (${session.user.id}) — not in OPS_DISCORD_IDS.`}
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-coral hover:underline">
          Back to site
        </Link>
      </div>
    );
  }

  if (!hasServiceRole()) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted">
        Supabase service role not configured on this Worker.
      </div>
    );
  }

  return <OpsUsagePanel />;
}
