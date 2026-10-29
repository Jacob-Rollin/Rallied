/**
 * Square Rallied mark used as Discord bot avatar in marketing mocks.
 * Reuses the favicon/square brand asset — not a letter monogram.
 */
export function DiscordBotAvatar({
  className = "h-8 w-8",
}: {
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/rallied-square-dark.jpg"
      alt=""
      width={40}
      height={40}
      className={`shrink-0 rounded object-cover ${className}`}
      aria-hidden
    />
  );
}
