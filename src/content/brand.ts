/**
 * Owner-approved brand and policy copy.
 *
 * This module keeps the claims repeated across the storefront, seed data and
 * one-off content updater in sync. These are business commitments, so they
 * should not drift into slightly different promises on different pages.
 */

export const SHIPPING_COPY = {
  dispatch: "Orders are dispatched within 3–4 business days.",
  delivery: "Delivery usually takes 5–6 business days.",
} as const;

export const PLATED_ITEMS_COPY =
  "Plated items may take a few additional days to dispatch. Plating naturally wears off over time.";

export const ORDER_POLICY_SUMMARY =
  "Orders cannot be cancelled once placed. We do not accept exchanges, returns or refunds for sizing issues, change of mind or other non-defect reasons. If you receive a defective or incorrect item, contact us with a raw, continuous and unedited unboxing video that clearly shows the address label while the parcel is being opened.";

export const AUTHENTICITY_COPY =
  "Every Aastha Silver piece is guaranteed to be genuine 925 sterling silver. We do not offer a warranty because tarnishing is a natural characteristic of real silver, not a manufacturing defect. With proper care, tarnish can be cleaned and the original shine restored, allowing your jewellery to last for years.";

export const PRODUCT_CARE_COPY =
  "Keep your jewellery in a sealed container or pouch when not in use. Oxidation is a natural process that occurs when sterling silver is exposed to air. Use a soft cloth to restore its original shine. Alternatively, sprinkle a small amount of Colgate tooth powder on a soft, dry cloth and gently rub the silver jewellery. Keep jewellery away from chemicals such as hair colour, lotions, oils, perfume and hair products to help it last longer.";

export const HOMEPAGE_STORY_HTML =
  "<p>Growing up, silver was always around me. It was part of everyday conversations, family discussions and the work my family had been doing for over 40 years.</p><p>At 21, I started Aastha Silver with one simple promise—to keep genuine 925 sterling silver jewellery fairly priced, so it could reach more people without ever compromising on quality.</p>";

export const FOUNDER_SPEAK_HTML =
  '<img src="/founder.jpg" alt="Aditi Agarwal - Founder of Aastha Silver" class="mb-6 rounded-lg w-full max-w-sm" /><p>Hey, I’m Aditi.</p><p>I never imagined I’d become a founder at 21.</p><p>After studying design in Mumbai, I moved back to my hometown, Jaipur, and started Aastha Silver. What began as a small idea quickly became something much bigger.</p><p>Today, I’m single-handedly involved in everything—from designing and creating content to packing orders and connecting with customers.</p><p>Thank you for being a part of this journey.</p><p>— Aditi Agarwal</p>';

export const ABOUT_PAGE_BODY = `
  <h2>The Story of Aastha Silver</h2>
  <p>Some journeys are planned.</p>
  <p>Mine wasn’t.</p>
  <p>Growing up, silver was always around me. It was part of everyday conversations, family discussions and the work my family had been doing for over 40 years. I saw the effort that went into every piece and the trust people placed in our name.</p>
  <p>But honestly, I never imagined I’d be the one taking it forward.</p>
  <p>One thing became very clear to me. Genuine 925 silver jewellery didn’t have to be priced the way it often was. If we could offer the same quality at a fair price, why shouldn’t more people be able to own and wear real silver?</p>
  <p>That’s exactly what I decided to do.</p>
  <p>At 21, I started Aastha Silver with one simple promise—to keep genuine 925 sterling silver jewellery fairly priced, so it could reach more people without ever compromising on quality.</p>
  <p>Today, every order we pack carries the same values our family has believed in for decades—honest craftsmanship, fair pricing and jewellery people can wear every day.</p>
  <p>Aastha Silver is my way of carrying forward a 40-year family legacy while making real silver a part of everyday life for more people.</p>
  <h2>Founder Speak</h2>
  ${FOUNDER_SPEAK_HTML}
`;

export const CARE_PAGE_BODY = `
  <h2>Jewellery Care</h2>
  <ul>
    <li>Keep your jewellery in a sealed container or pouch when not in use.</li>
    <li>Oxidation is a natural process and will occur when sterling silver is exposed to air.</li>
    <li>Use a soft cloth to clean the jewellery and restore its original shine.</li>
    <li>Alternatively, sprinkle a small amount of Colgate tooth powder on a soft, dry cloth and gently rub the silver jewellery.</li>
    <li>Keep jewellery away from chemicals such as hair colour, lotions, oils, perfume and hair products to help it last longer.</li>
  </ul>
  <h2>Authenticity and Tarnishing</h2>
  <p>${AUTHENTICITY_COPY}</p>
`;

export const SHIPPING_PAGE_BODY = `
  <h2>Dispatch and Delivery</h2>
  <p>${SHIPPING_COPY.dispatch}</p>
  <p>${SHIPPING_COPY.delivery}</p>
  <h2>Plated Items</h2>
  <p>${PLATED_ITEMS_COPY}</p>
  <h2>Cancellations</h2>
  <p>Orders cannot be cancelled once placed.</p>
  <h2>Defective or Incorrect Items</h2>
  <p>If you receive a defective or incorrect item, contact us with a raw, continuous and unedited unboxing video that clearly shows the address label while the parcel is being opened.</p>
`;

export const RETURN_PAGE_BODY = `
  <h2>Returns, Exchanges and Refunds</h2>
  <p>We do not accept exchanges, returns or refunds for sizing issues, change of mind or other non-defect reasons. Please check all product details and sizing information carefully before placing your order.</p>
  <p>Orders cannot be cancelled once placed.</p>
  <h2>Defective or Incorrect Items</h2>
  <p>If you receive a defective or incorrect item, contact us with a raw, continuous and unedited unboxing video that clearly shows the address label while the parcel is being opened. The video is required for us to review the claim.</p>
`;

export const STATIC_PAGE_CONTENT = {
  about: {
    title: "Our Story",
    intro: "A 40-year family legacy, carried forward by Aditi Agarwal.",
    body: ABOUT_PAGE_BODY,
    seoTitle: "Our Story — Aastha Silver",
    seoDescription:
      "Meet Aditi Agarwal and discover the 40-year family legacy behind Aastha Silver's fairly priced 925 sterling silver jewellery.",
  },
  "care-guide": {
    title: "Jewellery Care",
    intro: "Simple care to keep genuine sterling silver shining for years.",
    body: CARE_PAGE_BODY,
    seoTitle: "925 Silver Jewellery Care Guide — Aastha Silver",
    seoDescription:
      "Learn how to store and clean 925 sterling silver jewellery and why natural tarnishing is not a defect.",
  },
  "shipping-policy": {
    title: "Shipping Policy",
    intro: "Dispatch, delivery and claim information for your order.",
    body: SHIPPING_PAGE_BODY,
    seoTitle: "Shipping Policy — Aastha Silver",
    seoDescription:
      "Read Aastha Silver's dispatch, delivery, plated-item and order claim policy.",
  },
  "return-policy": {
    title: "Returns & Exchanges",
    intro: "Important information to review before placing your order.",
    body: RETURN_PAGE_BODY,
    seoTitle: "Returns & Exchanges Policy — Aastha Silver",
    seoDescription:
      "Read Aastha Silver's cancellation, return, exchange, refund and defective-item claim policy.",
  },
} as const;

export const HOMEPAGE_TRUST_BADGES = [
  {
    icon: "BadgeCheck",
    title: "Guaranteed 925 sterling silver",
    description: "Every Aastha Silver piece is genuine 925 sterling silver.",
  },
  {
    icon: "Truck",
    title: "Dispatch in 3–4 business days",
    description: "Delivery usually takes 5–6 business days.",
  },
  {
    icon: "Sparkles",
    title: "Natural tarnishing",
    description: "Tarnish is natural and can be cleaned to restore the shine.",
  },
  {
    icon: "CircleOff",
    title: "No returns or exchanges",
    description: "Defect or wrong-item claims require a raw unboxing video.",
  },
] as const;
