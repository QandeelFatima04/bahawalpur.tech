/**
 * Map backend error shapes to clear, actionable user-facing messages.
 * The backend throws Error objects with `.status` and `.body` set by lib/api.js.
 */
const GENERIC = {
  400: "That request couldn't be processed. Please check your input and try again.",
  401: "Please sign in to continue.",
  403: "You don't have access to this action.",
  404: "We couldn't find what you were looking for.",
  409: "This conflicts with something that already exists.",
  413: "That file is too large — try something under 5 MB.",
  422: "Some fields are missing or invalid.",
  429: "Too many requests right now. Give it a minute and try again.",
  500: "The server hit an unexpected problem. Please try again in a moment.",
};

const NETWORK = "Lost connection to the server. Check your internet or try again in a few seconds.";

export function friendlyError(err) {
  if (!err) return "Something went wrong.";

  // Native fetch "Failed to fetch" TypeErrors (server unreachable, CORS etc.)
  if (!err.status && /fetch|network/i.test(err.message || "")) return NETWORK;

  const detail = err.body?.detail;
  const raw = typeof detail === "string" ? detail : detail?.error || detail?.message || err.message;

  // Structured apply-gate rejection
  if (detail && typeof detail === "object" && detail.error === "below_threshold") {
    const need = Number(detail.apply_threshold).toFixed(0);
    const have = Number(detail.total_score).toFixed(0);
    return `You need a ${need}% match to apply — you have ${have}%. Add more of the required skills to your profile and try again.`;
  }

  // Known backend strings → friendly copy
  const MAP = {
    "Forbidden": "You don't have access to this action.",
    "Company is not verified": "Your company is still awaiting admin approval. You'll be able to post roles and send interviews once verified.",
    "Company is disabled": "Your company has been disabled. Please contact an administrator.",
    "Company profile not found": "We couldn't find a company profile on this account.",
    "Profile is disabled": "Your profile has been disabled. Please contact an administrator.",
    "Candidate not available": "This candidate's profile is unavailable right now — they may have disabled visibility.",
    "Email already exists": "An account with this email already exists. Try signing in instead.",
    "Invalid credentials": "Wrong email or password.",
    "Interview date must be in the future": "Pick an interview date and time in the future.",
    "Hire decision is only available for accepted interviews": "The candidate needs to accept the interview request before you can record a hire decision.",
    "Hire decision cannot be recorded before the interview date": "You can record a hire decision on or after the interview date.",
    "Invalid token type": "Your session has expired. Please sign in again.",
    "Invalid or expired token": "Your session has expired. Please sign in again.",
    "User not found": "We couldn't find your account. Please sign in again.",
    "Job not found": "That job is no longer available.",
    "Interview not found": "This interview is no longer available.",
    "Unsupported resume format": "Please upload a PDF, DOC, or DOCX file.",
    "File too large": "That file is over the 5 MB size limit. Try a smaller file.",
    "Enable profile visibility before applying": "Turn on profile visibility (Profile tab) before applying to jobs.",
    "Report not generated yet": "Upload your resume first and we'll generate your career report automatically.",
  };
  if (raw && MAP[raw]) return MAP[raw];

  // Pattern: "Interview is already {status}"
  if (typeof raw === "string" && /Interview is already/i.test(raw)) {
    return raw.replace(/^Interview is already/i, "This interview is already").concat(".");
  }
  // Pattern: "An interview is already pending/accepted for this candidate/job"
  if (typeof raw === "string" && /An interview is already/i.test(raw)) {
    return raw;
  }
  // Pattern: "This endpoint requires role X but you are signed in as Y."
  if (typeof raw === "string" && /This endpoint requires role/i.test(raw)) {
    return raw;
  }

  if (err.status && GENERIC[err.status]) return GENERIC[err.status];
  return raw || "Something went wrong.";
}
