export const APPLE_BLUE = "#0071e3";
export const APPLE_GREY = "rgba(0,0,0,0.06)";
export const APPLE_TEXT = "rgba(0,0,0,0.48)";

export const SUCCESS = "#1f883d";
export const WARN = "#b25000";
export const DESTRUCTIVE = "#d70015";

export function tierColor(value, max) {
  if (!max) return APPLE_BLUE;
  const ratio = value / max;
  if (ratio >= 0.66) return SUCCESS;
  if (ratio >= 0.33) return APPLE_BLUE;
  return WARN;
}

export function scoreColor(score) {
  if (score >= 75) return SUCCESS;
  if (score >= 50) return APPLE_BLUE;
  return WARN;
}
