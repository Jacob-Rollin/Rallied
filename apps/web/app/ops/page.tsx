import { Suspense } from "react";
import Link from "next/link";
import {
  FEEDBACK_KINDS,
  FEEDBACK_STATUSES,
  isFeedbackKind,
  isFeedbackStatus,
  type FeedbackReport,
} from "@rallied/shared";
import { getSession } from "@/lib/auth/session";
import { isOpsAllowlisted, getOpsDiscordIds } from "@/lib/ops-auth";
import { getServiceSupabase } from "@/lib/supabase";
import { OpsFeedbackInbox } from "@/components/OpsFeedbackInbox";

type Props = {
  searchParams: Promise<{ status?: string; kind?: string; q?: string }>;
};

export default async function OpsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl tracking-wide">Ops login</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with Discord. Access is limited to allowlisted staff IDs.
        </p>
        <Link
          href="/login?next=%2Fops"
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

  const sp = await searchParams;
  const status = (sp.status ?? "").trim();
  const kind = (sp.kind ?? "").trim();
  const q = (sp.q ?? "").trim();

  const sb = getServiceSupabase();
  if (!sb) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted">
        Supabase service role not configured on this Worker.
      </div>
    );
  }

  let query = sb
    .from("feedback_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(80);

  if (status && isFeedbackStatus(status)) {
    query = query.eq("status", status);
  } else if (status) {
    // ignore unknown filter
  }
  if (kind && isFeedbackKind(kind)) {
    query = query.eq("kind", kind);
  }
  if (q) {
    query = query.ilike("title", `%${q.replace(/%/g, "\\%")}%`);
  }

  const { data, error } = await query;
  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-coral">
        Query failed: {error.message}
        <p className="mt-2 text-muted">
          Did you run migration 015 (
          <code className="text-white/70">feedback_reports</code>)?
        </p>
      </div>
    );
  }

  // Touch constants so tree-shaking keeps them for client filters consistency
  void FEEDBACK_STATUSES;
  void FEEDBACK_KINDS;

  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted">Loading…</div>}>
      <OpsFeedbackInbox reports={(data ?? []) as FeedbackReport[]} />
    </Suspense>
  );
}
