import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLearnLink } from "@/lib/skillLearnLinks";

// Renders a missing skill as a clickable chip that opens a free learning resource.
// Same visual weight as Badge variant="warn" so the table layout stays consistent.
export function SkillLearnLink({ skill, className }) {
  const { url, label } = getLearnLink(skill);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      className={cn(
        "badge-base inline-flex items-center gap-1 bg-warn/10 text-warn underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-accent/40",
        className,
      )}
    >
      {skill}
      <ExternalLink size={10} aria-hidden="true" />
    </a>
  );
}
