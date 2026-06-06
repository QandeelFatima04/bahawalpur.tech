"use client";
import { forwardRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { TURNSTILE_SITE_KEY } from "@/lib/turnstile";

// Shared Cloudflare Turnstile widget. Calls onToken(token) when solved and onToken(null)
// when the token expires or errors. Forward a ref to call `.reset()` after a submit —
// Turnstile tokens are single-use, so the widget must be reset to issue a fresh one.
const TurnstileWidget = forwardRef(function TurnstileWidget({ onToken }, ref) {
  return (
    <Turnstile
      ref={ref}
      siteKey={TURNSTILE_SITE_KEY}
      options={{ theme: "light", size: "flexible" }}
      onSuccess={(token) => onToken?.(token)}
      onExpire={() => onToken?.(null)}
      onError={() => onToken?.(null)}
    />
  );
});

export default TurnstileWidget;
