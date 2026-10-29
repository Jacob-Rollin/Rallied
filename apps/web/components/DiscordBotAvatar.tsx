/**
 * Discord bot avatar for marketing mocks — circular coral disc with
 * white open-bottom arch + chevron (matches live Discord avatar).
 * Crops kit `rallied-square-coral.jpg` to a circle via CSS.
 * SVG twin at `/brand/rallied-discord-avatar.svg` for crisp fallbacks.
 */
export function DiscordBotAvatar({
  className = "h-10 w-10",
}: {
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/rallied-square-coral.jpg"
      alt=""
      width={40}
      height={40}
      className={`shrink-0 rounded-full object-cover ${className}`}
      aria-hidden
    />
  );
}
