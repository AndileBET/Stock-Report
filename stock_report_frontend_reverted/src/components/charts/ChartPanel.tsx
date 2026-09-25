import type { ReactNode } from "react";

interface ChartPanelProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ChartPanel({ title, subtitle, children, className = "", onClick }: ChartPanelProps) {
  const interactive = Boolean(onClick);
  return (
    <button
      type="button"
      className={`panel chart-panel ${className}${interactive ? " chart-panel-clickable" : ""}`}
      onClick={onClick}
    >
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Live analysis</span>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {interactive ? <span className="panel-signal panel-drilldown"><i />View details →</span> : <span className="panel-signal"><i />Updated</span>}
      </div>
      {children}
    </button>
  );
}
