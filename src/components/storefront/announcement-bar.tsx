import Link from "next/link";

/**
 * Thin bar above the header. A live campaign's announcement wins over the
 * default from site settings — that is the point of a campaign.
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
    <span className="block truncate text-center text-xs tracking-[0.06em] text-sand-200">
      {text}
    </span>
  );

  return (
    <div className="bg-brand-900 py-2.5">
      <div className="u-container">
        {href ? (
          <Link href={href} className="block hover:text-sand-50">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
