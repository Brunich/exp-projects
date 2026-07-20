import {
  followUpUrgencyBadgeClass,
  formatFollowUpUrgencyLabel,
  getFollowUpUrgency,
} from "@/lib/clients";

interface FollowUpUrgencyBadgeProps {
  followUpDate: string;
  className?: string;
}

export function FollowUpUrgencyBadge({
  followUpDate,
  className = "",
}: FollowUpUrgencyBadgeProps) {
  const urgency = getFollowUpUrgency(followUpDate);
  if (!urgency) {
    return null;
  }

  const label = formatFollowUpUrgencyLabel(urgency, followUpDate);

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${followUpUrgencyBadgeClass(urgency)} ${className}`}
    >
      {label}
    </span>
  );
}
