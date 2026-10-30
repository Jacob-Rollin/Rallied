import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { appBaseUrl, getStripe, stripeConfigured } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";

type Body = {
  discordGuildId?: string;
};

/**
 * Session-gated Stripe Customer Portal (cancel / update payment method).
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user || session.isMock) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error: "stripe_not_configured",
        hint: "Set STRIPE_SECRET_KEY on the web Worker.",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const discordGuildId = String(body.discordGuildId ?? "").trim();
  if (!discordGuildId) {
    return NextResponse.json({ error: "missing_guild" }, { status: 400 });
  }

  const allowed = (session.guilds ?? []).some((g) => g.id === discordGuildId);
  if (!allowed) {
    return NextResponse.json({ error: "guild_forbidden" }, { status: 403 });
  }

  const sb = getServiceSupabase();
  if (!sb) {
    return NextResponse.json(
      {
        error: "supabase_unavailable",
        hint: "Set SUPABASE_SERVICE_ROLE_KEY on the web Worker.",
      },
      { status: 503 },
    );
  }

  const { data: server, error: sErr } = await sb
    .from("servers")
    .select("id, stripe_customer_id")
    .eq("discord_guild_id", discordGuildId)
    .maybeSingle();

  if (sErr || !server) {
    return NextResponse.json(
      {
        error: "server_not_found",
        detail: sErr?.message,
      },
      { status: 404 },
    );
  }

  const customerId = server.stripe_customer_id as string | null;
  if (!customerId) {
    return NextResponse.json(
      {
        error: "no_customer",
        hint: "Subscribe via Checkout first — then Manage billing opens the Stripe portal.",
      },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const returnUrl = `${appBaseUrl()}/app/billing?guild=${encodeURIComponent(discordGuildId)}`;

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("billingPortal.sessions.create", message);
    return NextResponse.json(
      { error: "stripe_error", detail: message },
      { status: 502 },
    );
  }
}
