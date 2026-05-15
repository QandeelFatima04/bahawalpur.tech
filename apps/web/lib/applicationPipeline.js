// Derive the user-facing pipeline stage from the raw Application / Shortlist /
// InterviewRequest signals. The DB doesn't store a single 7-stage enum (Application
// only has applied/withdrawn) so this util is the single source of truth for both
// dashboards.

export const STAGES = [
  "applied",
  "under_review",
  "shortlisted",
  "interview_requested",
  "interview_scheduled",
  "rejected",
  "hired",
];

export const STAGE_LABEL = {
  applied: "Applied",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  interview_requested: "Interview requested",
  interview_scheduled: "Interview scheduled",
  rejected: "Rejected",
  hired: "Hired",
};

// Apple-minimal palette: a single accent ramp + warn/destructive/success accents.
export const STAGE_COLOR = {
  applied: "#94a3b8",          // slate-400 — neutral
  under_review: "#0071e3",     // accent
  shortlisted: "#34c759",      // success
  interview_requested: "#ff9f0a", // warn
  interview_scheduled: "#0071e3", // accent
  rejected: "#ff3b30",         // destructive
  hired: "#34c759",            // success
};

const UNDER_REVIEW_GRACE_DAYS = 7;

/**
 * Derive the pipeline stage for a single candidate-job pair from the three signals.
 * Highest-precedence stage wins (later events override earlier ones).
 *
 * @param {{
 *   applicationStatus?: string,             // "applied" | "withdrawn"
 *   appliedAt?: string|Date|null,
 *   shortlistStatus?: string|null,          // "shortlisted" | "rejected"
 *   interviewStatus?: string|null,          // "pending" | "accepted" | "rejected" | "completed" | "cancelled"
 *   hireStatus?: string|null,               // "yes" | "no"
 * }} signals
 * @returns {string} one of STAGES
 */
export function derivePipelineStage(signals = {}) {
  const {
    applicationStatus,
    appliedAt,
    shortlistStatus,
    interviewStatus,
    hireStatus,
  } = signals;

  if (hireStatus === "yes") return "hired";
  if (hireStatus === "no") return "rejected";
  if (interviewStatus === "accepted") return "interview_scheduled";
  if (interviewStatus === "pending") return "interview_requested";
  if (interviewStatus === "rejected" || interviewStatus === "cancelled") {
    // Cancelled interview falls back to whatever earlier stage the candidate was at.
    if (shortlistStatus === "shortlisted") return "shortlisted";
  }
  if (shortlistStatus === "rejected") return "rejected";
  if (shortlistStatus === "shortlisted") return "shortlisted";
  if (applicationStatus === "applied") {
    if (appliedAt) {
      const ageDays = (Date.now() - new Date(appliedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > UNDER_REVIEW_GRACE_DAYS) return "under_review";
    }
    return "applied";
  }
  return "applied";
}

/** Count rows by stage. Returns an object keyed by stage with 0 for missing stages. */
export function countByStage(rows, deriver = (row) => row.stage) {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0]));
  for (const row of rows || []) {
    const stage = deriver(row);
    if (stage && stage in counts) counts[stage] += 1;
  }
  return counts;
}

/** Bucket a list of timestamped rows by ISO date string (YYYY-MM-DD). */
export function bucketByDate(rows, getDate, days = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = [];
  const indexByDate = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.push({ date: key, count: 0 });
    indexByDate.set(key, buckets.length - 1);
  }
  for (const row of rows || []) {
    const raw = getDate(row);
    if (!raw) continue;
    const key = new Date(raw).toISOString().slice(0, 10);
    const idx = indexByDate.get(key);
    if (idx !== undefined) buckets[idx].count += 1;
  }
  return buckets;
}
