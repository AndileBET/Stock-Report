import type { ReactNode } from "react";

interface ChartPanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function ChartPanel({ title, subtitle, children, className = "" }: ChartPanelProps) {
  return (
    <section className={`panel chart-panel ${className}`}>
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Live analysis</span>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <span className="panel-signal"><i />Updated</span>
      </div>
      {children}
    </section>
  );
}
