import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "good" | "warn" | "bad";
  onClick?: () => void;
}

export function KpiCard({ icon: Icon, label, value, detail, tone = "default", onClick }: KpiCardProps) {
  const interactive = Boolean(onClick);
  return (
    <button
      type="button"
      className={`kpi-card tone-${tone}${interactive ? " kpi-card-clickable" : ""}`}
      onClick={onClick}
    >
      <div className="kpi-noise" />
      <div className="kpi-topline">
        <div className="kpi-icon"><Icon size={18} /></div>
      </div>
      <div className="kpi-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
      {interactive ? <span className="kpi-drilldown">View details <span aria-hidden="true">→</span></span> : null}
      <div className="kpi-accent-line" />
    </button>
  );
}
