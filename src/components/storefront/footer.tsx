import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import {
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
} from "@/components/ui/brand-icons";
import { Logo } from "@/components/storefront/logo";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { getCategoryTree, getCollections, getSetting } from "@/server/catalog";

export async function Footer() {
  const [categories, collections, contact, social, brand] = await Promise.all([
    getCategoryTree(),
    getCollections(true),
    getSetting("contact"),
    getSetting("social"),
    getSetting("brand"),
  ]);

  const shopLinks = categories.filter((c) => c.isFeatured).slice(0, 8);

  return (
    <footer className="mt-24 bg-brand-900 text-sand-200">
      <div className="u-container py-14 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Brand ---------------------------------------------------------- */}
          <div className="space-y-5">
            <Logo tone="light" size="md" />
            {brand.tagline ? (
              <p className="max-w-xs text-sm leading-relaxed text-sand-300">
                {brand.tagline}
              </p>
            ) : null}

            {(social.instagram || social.facebook || social.youtube) && (
              <div className="flex items-center gap-2">
                {social.instagram ? (
                  <SocialLink href={social.instagram} label="Instagram">
                    <InstagramIcon className="size-4" />
                  </SocialLink>
                ) : null}
                {social.facebook ? (
                  <SocialLink href={social.facebook} label="Facebook">
                    <FacebookIcon className="size-4" />
                  </SocialLink>
                ) : null}
                {social.youtube ? (
                  <SocialLink href={social.youtube} label="YouTube">
                    <YoutubeIcon className="size-4" />
                  </SocialLink>
                ) : null}
              </div>
            )}
          </div>

          {/* Shop ----------------------------------------------------------- */}
          <FooterColumn title="Shop">
            {shopLinks.map((c) => (
              <FooterLink key={c.slug} href={`/category/${c.slug}`}>
                {c.name}
              </FooterLink>
            ))}
            <FooterLink href="/shop?sort=popular">Best Selling</FooterLink>
          </FooterColumn>

          {/* Help ----------------------------------------------------------- */}
          <FooterColumn title="Help">
            <FooterLink href="/contact">Contact Us</FooterLink>
            <FooterLink href="/faq">FAQ</FooterLink>
            <FooterLink href="/shipping-policy">Shipping</FooterLink>
            <FooterLink href="/return-policy">
              Returns &amp; Exchanges
            </FooterLink>
            <FooterLink href="/care-guide">Silver Care Guide</FooterLink>
            <FooterLink href="/account/orders">Track My Order</FooterLink>
            <FooterLink href="/about">Our Story</FooterLink>
          </FooterColumn>

          {/* Newsletter + contact -------------------------------------------- */}
          <div className="space-y-6">
            <div>
              <h2 className="u-eyebrow mb-3 text-gold-300">Stay in touch</h2>
              <p className="mb-4 text-sm leading-relaxed text-sand-300">
                One email a month when a new collection leaves the workshop.
              </p>
              <NewsletterForm source="footer" tone="light" />
            </div>

            <address className="space-y-2.5 text-sm not-italic text-sand-300">
              {contact.addressLines.length ? (
                <p className="flex gap-2.5">
                  <MapPin
                    className="mt-0.5 size-4 shrink-0 text-gold-400"
                    aria-hidden="true"
                  />
                  <span>{contact.addressLines.join(", ")}</span>
                </p>
              ) : null}
              {contact.phone ? (
                <p className="flex gap-2.5">
                  <Phone
                    className="mt-0.5 size-4 shrink-0 text-gold-400"
                    aria-hidden="true"
                  />
                  <a
                    href={`tel:${contact.phone.replace(/\s/g, "")}`}
                    className="hover:text-sand-50"
                  >
                    {contact.phone}
                  </a>
                </p>
              ) : null}
              {contact.email ? (
                <p className="flex gap-2.5">
                  <Mail
                    className="mt-0.5 size-4 shrink-0 text-gold-400"
                    aria-hidden="true"
                  />
                  <a
                    href={`mailto:${contact.email}`}
                    className="hover:text-sand-50"
                  >
                    {contact.email}
                  </a>
                </p>
              ) : null}
              {contact.hours ? (
                <p className="pl-6.5 text-sand-400">{contact.hours}</p>
              ) : null}
            </address>
          </div>
        </div>

        {collections.length ? (
          <div className="mt-12 border-t border-sand-50/10 pt-8">
            <h2 className="u-eyebrow mb-3 text-gold-300">Collections</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {collections.map((c) => (
                <Link
                  key={c.slug}
                  href={`/collections/${c.slug}`}
                  className="text-sm text-sand-300 transition-colors hover:text-sand-50"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Legal bar --------------------------------------------------------- */}
      <div className="border-t border-sand-50/10">
        <div className="u-container flex flex-col gap-4 py-6 text-xs text-sand-400 md:flex-row md:items-center md:justify-between">
          <p>
            &copy; {new Date().getFullYear()} Aastha Silver &amp; Jewels. All
            rights reserved.
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/privacy-policy" className="hover:text-sand-50">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-sand-50">
              Terms of Service
            </Link>
            <Link href="/shipping-policy" className="hover:text-sand-50">
              Shipping Policy
            </Link>
            <Link href="/return-policy" className="hover:text-sand-50">
              Return Policy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="u-eyebrow mb-4 text-gold-300">{title}</h2>
      <ul className="space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-sm text-sand-300 transition-colors hover:text-sand-50"
      >
        {children}
      </Link>
    </li>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-sm border border-sand-50/15 text-sand-300 transition-colors hover:border-gold-400 hover:text-gold-300"
    >
      {children}
    </a>
  );
}
