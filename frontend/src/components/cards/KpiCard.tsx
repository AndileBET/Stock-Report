import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "good" | "warn" | "bad";
}

export function KpiCard({ icon: Icon, label, value, detail, tone = "default" }: KpiCardProps) {
  return (
    <article className={`kpi-card tone-${tone}`}>
      <div className="kpi-noise" />
      <div className="kpi-topline">
        <div className="kpi-icon"><Icon size={18} /></div>
        <span className="kpi-status">Live</span>
      </div>
      <div className="kpi-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
      <div className="kpi-accent-line" />
    </article>
  );
}
