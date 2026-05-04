"use client";
import { useEffect, useState } from "react";
import { Video, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const JOIN_WINDOW_MS_BEFORE = 15 * 60 * 1000;          // 15 minutes before
const JOIN_WINDOW_MS_AFTER = 3 * 60 * 60 * 1000;       // 3 hours after — link stays joinable
const LIVE_WINDOW_MS_AFTER = 3 * 60 * 60 * 1000;       // 3 hours after = "Join now" green

function formatRelative(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "in less than a minute";
  if (mins < 60) return `in ${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

/**
 * Join-meeting button that gates access to a time window around the scheduled
 * interview. Before the window: shows a "Opens in 25 min" chip. Inside the
 * window: Join button opens the Jitsi link in a new tab. After the window:
 * disabled with "Meeting ended". Once the interview is completed (hire decision
 * recorded), shows the outcome badge and hides the link.
 */
export function JoinMeetingButton({ interviewDate, meetingLink, status, hireStatus }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000); // refresh chip every 30s
    return () => clearInterval(timer);
  }, []);

  // Once the hire decision is recorded, the interview is over. Don't expose a
  // Join/Rejoin button — show a neutral outcome badge instead.
  if (status === "completed") {
    if (hireStatus === "yes") {
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 size={12} /> Interview completed · hired
        </Badge>
      );
    }
    if (hireStatus === "no") {
      return (
        <Badge variant="default" className="gap-1">
          <XCircle size={12} /> Interview completed
        </Badge>
      );
    }
    return <Badge variant="default">Interview completed</Badge>;
  }

  if (status === "cancelled" || status === "rejected") {
    return <Badge variant="default">Interview {status}</Badge>;
  }

  if (!meetingLink) {
    if (status === "accepted") {
      return <Badge variant="outline">Meeting link unavailable</Badge>;
    }
    return null;
  }

  const scheduledAt = new Date(interviewDate).getTime();
  const opensAt = scheduledAt - JOIN_WINDOW_MS_BEFORE;
  const closesAt = scheduledAt + JOIN_WINDOW_MS_AFTER;

  if (now < opensAt) {
    return (
      <Badge variant="outline" className="gap-1">
        <Clock size={12} /> Opens {formatRelative(opensAt - now)}
      </Badge>
    );
  }
  if (now > closesAt) {
    // More than 3 hours past the scheduled time without a hire decision yet:
    // the meeting time has passed. Hide the link; companies can reschedule.
    return <Badge variant="default">Meeting time passed</Badge>;
  }
  const isLive = now >= scheduledAt;
  return (
    <Button
      size="sm"
      variant={isLive ? "success" : "primary"}
      onClick={() => window.open(meetingLink, "_blank", "noopener,noreferrer")}
      className="gap-1"
    >
      <Video size={14} />
      {isLive ? "Join now" : "Join meeting"}
    </Button>
  );
}
