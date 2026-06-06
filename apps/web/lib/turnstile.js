// Cloudflare Turnstile public site key. Baked in at build time via the
// NEXT_PUBLIC_TURNSTILE_SITE_KEY build arg (see Dockerfile / docker-compose), with the
// real production key as the default so the widget renders even if the arg is omitted.
// The site key is public by design — it is safe to ship to the browser.
export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAADfbT1w54Pdn0jql";
