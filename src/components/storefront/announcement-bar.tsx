import Link from "next/link";

/**
 * Announcement bar above the header.
 * Styled in a rich warm metallic gold finish to stand out distinctly
 * from the deep pine emerald green navbar below it.
 */
export function AnnouncementBar({
  text,
  href,
}: {
  text: string;
  href?: string | null;
}) {
  if (!text.trim()) return null;

  const content = (
    <span className="block truncate text-center text-xs font-semibold tracking-[0.08em] text-brand-950">
      {text}
    </span>
  );

  return (
    <div className="bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 py-2.5 shadow-xs">
      <div className="u-container">
        {href ? (
          <Link href={href} className="block transition-opacity hover:opacity-85">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
