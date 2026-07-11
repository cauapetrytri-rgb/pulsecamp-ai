const GTM_PATTERN = /^GTM-[A-Z0-9]+$/;
const TRACKING_PARAMETERS = ["gclid", "fbclid", "msclkid", "ttclid"];

export function normalizeGtmContainerId(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!GTM_PATTERN.test(normalized)) throw new Error("Informe um container no formato GTM-XXXXXXX.");
  return normalized;
}

export function normalizePublicUrl(value: string) {
  const normalized = value.trim();
  const url = new URL(/^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Use uma URL HTTP ou HTTPS.");
  url.hash = "";
  return url.toString();
}

export function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42) || "link";
}

export function gtmHeadSnippet(containerId: string) {
  const id = normalizeGtmContainerId(containerId);
  return `<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\nnew Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\nj=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n})(window,document,'script','dataLayer','${id}');</script>\n<!-- End Google Tag Manager -->`;
}

export function gtmBodySnippet(containerId: string) {
  const id = normalizeGtmContainerId(containerId);
  return `<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}"\nheight="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n<!-- End Google Tag Manager (noscript) -->`;
}

export function detectGtmContainers(html: string) {
  return [...new Set((html.match(/GTM-[A-Z0-9]+/gi) || []).map((item) => item.toUpperCase()))];
}

export function buildTrackedDestination(destination: string, params: { source?: string; medium?: string; campaign?: string }) {
  const url = new URL(normalizePublicUrl(destination));
  if (params.source?.trim()) url.searchParams.set("utm_source", params.source.trim());
  if (params.medium?.trim()) url.searchParams.set("utm_medium", params.medium.trim());
  if (params.campaign?.trim()) url.searchParams.set("utm_campaign", params.campaign.trim());
  return url.toString();
}

export function forwardTrackingParameters(destination: string, incoming: URLSearchParams) {
  const url = new URL(destination);
  for (const [key, value] of incoming) {
    if ((key.startsWith("utm_") || TRACKING_PARAMETERS.includes(key)) && value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function trackingParameters(incoming: URLSearchParams) {
  return Object.fromEntries([...incoming].filter(([key, value]) => (key.startsWith("utm_") || TRACKING_PARAMETERS.includes(key)) && value));
}

export function attachTrackingToken(destination: string, token: string) {
  const url = new URL(destination);
  const isWhatsApp = url.hostname === "wa.me" || url.hostname.endsWith("whatsapp.com");
  if (isWhatsApp) {
    const text = url.searchParams.get("text")?.trim();
    url.searchParams.set("text", `${text ? `${text}\n\n` : ""}Ref: PC-${token}`);
  } else {
    url.searchParams.set("pcid", token);
  }
  return url.toString();
}

export function parseTrackingReference(message: string) {
  const match = message.match(/(?:^|\s)Ref:\s*PC-([a-z0-9]{8,32})(?:\s|$)/i);
  return {
    token: match?.[1] || null,
    cleanText: match ? message.replace(match[0], " ").replace(/\s{2,}/g, " ").trim() : message,
  };
}
