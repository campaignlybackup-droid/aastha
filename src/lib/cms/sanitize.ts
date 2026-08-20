import "server-only";

import sanitizeHtml from "sanitize-html";

/**
 * HTML sanitisation for admin-authored content.
 *
 * Admin content is semi-trusted — a compromised or careless staff account
 * should not be able to plant a script that runs in every customer's browser
 * during checkout. Everything that reaches `dangerouslySetInnerHTML` passes
 * through here first.
 *
 * A vetted library is used deliberately: hand-rolled tag stripping fails on
 * mutation-XSS, malformed markup and namespace confusion in ways that are not
 * obvious from reading the regex.
 */

/** For product descriptions and rich-text sections. */
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li",
    "h2", "h3", "h4",
    "blockquote", "a", "span", "small", "sup", "sub",
    "table", "thead", "tbody", "tr", "th", "td",
    "img"
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    span: ["class"],
    img: ["src", "alt", "class", "width", "height"],
    "*": [],
  },
  // Anything not in this list — notably `javascript:` and `data:` — is dropped.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowedSchemesAppliedToAttributes: ["href"],
  transformTags: {
    // Every external link gets noopener/noreferrer. `target="_blank"` without
    // `rel="noopener"` hands the opened page a reference to window.opener.
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: {
          ...attribs,
          ...(external
            ? { target: "_blank", rel: "noopener noreferrer nofollow" }
            : {}),
        },
      };
    },
  },
  disallowedTagsMode: "discard",
};

/**
 * For the CUSTOM_HTML section. Slightly wider — layout markup and images are
 * allowed — but still no scripts, iframes, forms, styles or event handlers.
 */
const CUSTOM_HTML_OPTIONS: sanitizeHtml.IOptions = {
  ...RICH_TEXT_OPTIONS,
  allowedTags: [
    ...(RICH_TEXT_OPTIONS.allowedTags as string[]),
    "div", "section", "figure", "figcaption", "img", "picture", "source", "hr",
  ],
  allowedAttributes: {
    ...RICH_TEXT_OPTIONS.allowedAttributes,
    div: ["class"],
    section: ["class"],
    figure: ["class"],
    img: ["src", "alt", "width", "height", "loading", "class"],
    source: ["srcset", "media", "type"],
  },
  allowedSchemesByTag: { img: ["http", "https"] },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, RICH_TEXT_OPTIONS);
}

export function sanitizeCustomHtml(html: string): string {
  return sanitizeHtml(html, CUSTOM_HTML_OPTIONS);
}

/** Strips all markup — used to derive meta descriptions from rich text. */
export function toPlainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}
