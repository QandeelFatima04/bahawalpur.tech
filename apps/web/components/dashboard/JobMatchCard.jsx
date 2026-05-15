"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, ChevronDown, EyeOff, Lock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchScoreChip } from "./MatchScoreChip";
import { SkillLearnLink } from "@/components/SkillLearnLink";
import { cn } from "@/lib/utils";

function WhyMatch({ job }) {
  const matched = (job.required_skills || []).filter(
    (s) => !(job.missing_skills || []).includes(s),
  );
  const missing = job.missing_skills || [];
  return (
    <div className="space-y-3 border-t border-black/[0.06] pt-3 text-[13px]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Skills you bring
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {matched.length === 0 ? (
            <span className="text-[12px] text-muted-foreground">
              None of the listed skills matched yet.
            </span>
          ) : (
            matched.map((s) => (
              <Badge key={s} variant="success">
                {s}
              </Badge>
            ))
          )}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          What&apos;s between you and this role
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {missing.length === 0 ? (
            <Badge variant="success">Every skill covered.</Badge>
          ) : (
            missing.map((s) => <SkillLearnLink key={s} skill={s} />)
          )}
        </div>
        {missing.length > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Click a skill to open a free learning resource.
          </p>
        )}
      </div>
    </div>
  );
}

function applyButton({ job, profileVisible, onApply }) {
  const belowThreshold = job.total_score < job.apply_threshold;
  const gap = Math.max(0, job.apply_threshold - job.total_score);

  if (job.already_applied) {
    return <Badge variant="success">Applied</Badge>;
  }
  if (!profileVisible) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Badge variant="warn" className="gap-1">
          <EyeOff size={11} /> Visibility off
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          Turn it on from Profile.
        </span>
      </div>
    );
  }
  if (belowThreshold) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Badge variant="destructive" className="gap-1">
          <Lock size={11} /> Locked
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          {Math.round(gap)} points short
        </span>
      </div>
    );
  }
  return (
    <Button size="sm" variant="primary" onClick={() => onApply(job)}>
      Apply
    </Button>
  );
}

export function JobMatchCard({ job, profileVisible, onApply }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className="rounded-xl bg-card p-5 ring-1 ring-black/[0.04] transition-shadow hover:shadow-card"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[18px] font-semibold leading-[1.25] tracking-[-0.01em]">
            {job.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Briefcase size={12} /> {job.company_name}
            </span>
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} /> {job.location}
              </span>
            )}
          </div>
        </div>
        <MatchScoreChip score={job.total_score} size="lg" />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown
            size={13}
            className={cn("transition-transform", open && "rotate-180")}
          />
          {open ? "Hide details" : "Why this match"}
        </button>
        {applyButton({ job, profileVisible, onApply })}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3">
              <WhyMatch job={job} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function JobMatchRow({ job, profileVisible, onApply }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md transition-colors hover:bg-[rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium">{job.title}</div>
          <div className="truncate text-[12px] text-muted-foreground">
            {job.company_name}
            {job.location ? ` · ${job.location}` : ""}
          </div>
        </div>
        <MatchScoreChip score={job.total_score} size="sm" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown
            size={13}
            className={cn("transition-transform inline", open && "rotate-180")}
          />
        </button>
        <div className="shrink-0">{applyButton({ job, profileVisible, onApply })}</div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              <WhyMatch job={job} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
