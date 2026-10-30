import Link from "next/link";
import type { FeedbackReport } from "@rallied/shared";
import { getSession } from "@/lib/auth/session";
import { isOpsAllowlisted, getOpsDiscordIds } from "@/lib/ops-auth";
import { getServiceSupabase } from "@/lib/supabase";
import { OpsFeedbackDetail } from "@/components/OpsFeedbackDetail";

type Props = { params: Promise<{ id: string }> };

export default async function OpsDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();

  if (!session.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl tracking-wide">Ops login</h1>
        <Link
          href={`/login?next=${encodeURIComponent(`/ops/${id}`)}`}
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
            ? "Set OPS_DISCORD_IDS on the web Worker."
            : `Your Discord id ${session.user.id} is not allowlisted.`}
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-coral hover:underline">
          Back to site
        </Link>
      </div>
    );
  }

  const sb = getServiceSupabase();
  if (!sb) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-sm text-muted">
        Supabase service role not configured.
      </div>
    );
  }

  const { data, error } = await sb
    .from("feedback_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl tracking-wide">Not found</h1>
        <p className="mt-2 text-sm text-muted">
          {error?.message ?? "No report with that id."}
        </p>
        <Link href="/ops" className="mt-6 inline-block text-sm text-coral hover:underline">
          ← Inbox
        </Link>
      </div>
    );
  }

  return <OpsFeedbackDetail report={data as FeedbackReport} />;
}
