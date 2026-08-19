import Link from "next/link";

/**
 * Announcement bar above the header.
 * Styled in a clean white background with crisp dark pine teal text.
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
    <span className="block truncate text-center text-xs font-semibold tracking-[0.06em] text-brand-950">
      {text}
    </span>
  );

  return (
    <div className="border-b border-sand-200 bg-white py-2.5 shadow-xs">
      <div className="u-container">
        {href ? (
          <Link href={href} className="block transition-colors hover:text-gold-600">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
