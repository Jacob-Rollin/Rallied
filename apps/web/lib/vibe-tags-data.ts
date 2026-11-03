import type { AggregatedVibeTag, VibeTagRow } from "@rallied/shared";
import {
  aggregateRecentVibeTags,
  parseVibeTag,
  vibeTagWindowCutoffIso,
} from "@rallied/shared";
import { getServiceSupabase } from "./supabase";

/**
 * Load thresholded Recent vibes (30d, ≥2 distinct raters) for a ratee member.
 * Empty array when Supabase is unavailable or no tags pass the gate.
 */
export async function loadRecentVibeTagsForMember(
  rateeMemberId: string,
): Promise<AggregatedVibeTag[]> {
  const sb = getServiceSupabase();
  if (!sb || !rateeMemberId) return [];

  const cutoff = vibeTagWindowCutoffIso();
  const { data, error } = await sb
    .from("vibe_checks")
    .select("vibe_tag, rater_id, created_at")
    .eq("ratee_id", rateeMemberId)
    .not("vibe_tag", "is", null)
    .gte("created_at", cutoff)
    .limit(500);

  if (error) {
    console.warn("recent vibe tags load failed", error.message);
    return [];
  }

  const rows: VibeTagRow[] = [];
  for (const raw of data ?? []) {
    const tag = parseVibeTag((raw as { vibe_tag: unknown }).vibe_tag);
    if (!tag) continue;
    rows.push({
      tag,
      raterId: String((raw as { rater_id: string }).rater_id),
      createdAt: String((raw as { created_at: string }).created_at),
    });
  }

  return aggregateRecentVibeTags(rows);
}
