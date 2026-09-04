import Script from "next/script";
import { Suspense } from "react";

import { publicEnv } from "@/lib/env";
import { RouteTracker } from "./route-tracker";

/**
 * Third-party tracking tags.
 *
 * All of it is centralised here and mounted once in the root layout, so no
 * component ever contains a tracking snippet. Each tag renders only when its
 * id is configured — an unconfigured store ships zero third-party JavaScript
 * rather than a broken tag.
 *
 * \`afterInteractive\` for everything: none of these affect what the customer
 * sees, so none of them should compete with the page for main-thread time
 * during load.
 */
export function AnalyticsScripts() {
  const { ga4MeasurementId, metaPixelId } = publicEnv;

  return (
    <>
      <Suspense fallback={null}>
        <RouteTracker gaId={ga4MeasurementId || "G-QJ90CG4PQM"} />
      </Suspense>

      {/* --- GA4 --------------------------------------------------------
          Only loaded directly when GTM is absent. */}
      {ga4MeasurementId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4MeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ga4MeasurementId}', { send_page_view: true });`}
          </Script>
        </>
      ) : null}

      {/* --- Meta Pixel -------------------------------------------------- */}
      {metaPixelId ? (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId}');
fbq('track', 'PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      ) : null}
    </>
  );
}
