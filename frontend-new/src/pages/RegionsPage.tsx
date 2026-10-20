import { AlertTriangle, ChevronDown, Search, TrendingUp, Users, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { DataQualityIssue, DashboardReports } from "../types/reports";
import { formatCurrency, formatNumber } from "../utils/formatters";

function formatMovementInDate(value: string | null) {
  if (!value) return "NA";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function RegionsPage({
  reports,
  query,
  onQueryChange,
  focusedIssue,
  onClearFocus,
}: {
  reports: DashboardReports;
  query: string;
  onQueryChange: (query: string) => void;
  focusedIssue: DataQualityIssue | null;
  onClearFocus: () => void;
}) {
  const needle = query.trim().toLowerCase();
  const rows = useMemo(
    () => reports.regionTeamItemSummary.filter((region) => !needle || JSON.stringify(region).toLowerCase().includes(needle)),
    [reports, needle],
  );
  const targetId = focusedIssue ? `issue-target-${encodeURIComponent(focusedIssue.id)}` : "";

  useEffect(() => {
    if (!targetId) return;
    const element = document.getElementById(targetId);
    if (element) window.setTimeout(() => element.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
  }, [targetId, rows]);

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div><span className="eyebrow">Regional control</span><h2>Regions & teams</h2><p>Drill from region to team to item-level stock position.</p></div>
        <div className="inline-search"><Search size={15} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search region, team or item" /></div>
      </div>

      {focusedIssue ? (
        <section className="issue-focus-panel">
          <div className="issue-focus-icon"><AlertTriangle size={18} /></div>
          <div className="issue-focus-copy">
            <span className="eyebrow">Issue location · {focusedIssue.date ?? "Date unavailable"}</span>
            <h3>{focusedIssue.title}</h3>
            <p>{focusedIssue.message}</p>
            <small>{focusedIssue.region} · {focusedIssue.team}{focusedIssue.item_code ? ` · ${focusedIssue.item_code} — ${focusedIssue.item_name}` : ""}</small>
            {focusedIssue.type === "stock_opening_mismatch" ? <small>Prior close on {focusedIssue.previous_date}: {formatNumber(focusedIssue.expected_quantity ?? 0)} · Opening on {focusedIssue.date}: {formatNumber(focusedIssue.actual_quantity ?? 0)}</small> : focusedIssue.site ? <small>Source site: {focusedIssue.site}</small> : null}
          </div>
          <button className="issue-focus-close" type="button" onClick={onClearFocus} aria-label="Clear issue focus"><X size={17} /></button>
        </section>
      ) : null}

      {rows.length ? <div className="region-grid">{rows.map((region) => {
        const isTargetRegion = Boolean(focusedIssue && region.region === focusedIssue.region);
        return (
          <details className={`region-card ${isTargetRegion ? "issue-location-target" : ""}`} id={isTargetRegion && (!focusedIssue?.team || !region.teams.some((team) => team.team === focusedIssue.team)) ? targetId : undefined} key={region.region} open>
            <summary>
              <div className="region-title"><span className="region-avatar">{region.region.slice(0, 2)}</span><div><strong>{region.region}</strong><small>{region.teams.length} teams · {formatNumber(region.used_quantity)} units used</small></div></div>
              <div className="region-metrics"><span><b>{formatCurrency(region.usage_value)}</b><small>Usage value</small></span><span><b>{formatNumber(region.closing_quantity)}</b><small>Closing</small></span><span className={region.shortage_quantity > 0 ? "risk-text" : ""}><b>{formatNumber(region.shortage_quantity)}</b><small>Shortage</small></span></div>
              <ChevronDown size={18} className="summary-chevron" />
            </summary>
            <div className="region-body">{region.teams.map((team) => {
              const isTargetTeam = Boolean(isTargetRegion && focusedIssue?.team === team.team);
              const isTargetItem = Boolean(isTargetTeam && focusedIssue?.item_code && team.items.some((item) => item.item_code === focusedIssue.item_code));
              return (
                <details className={`team-card ${isTargetTeam ? "issue-location-target" : ""}`} id={isTargetTeam && !isTargetItem ? targetId : undefined} key={team.team} open={isTargetTeam || undefined}>
                  <summary><div className="team-title"><Users size={16} /><div><strong>{team.team}</strong><small>{team.items.length} items · {formatNumber(team.used_quantity)} used</small></div></div><div className="team-kpi"><span>{formatCurrency(team.usage_value)}</span><span className={team.shortage_quantity > 0 ? "risk-pill" : "muted-pill"}>{team.shortage_quantity > 0 ? `${formatNumber(team.shortage_quantity)} short` : "No shortage"}</span><ChevronDown size={15} /></div></summary>
                  <div className="item-list">{team.items.map((item) => {
                    const isTarget = Boolean(isTargetTeam && focusedIssue?.item_code === item.item_code);
                    return <div className={`item-row ${isTarget ? "issue-location-target" : ""}`} id={isTarget ? targetId : undefined} key={item.item_code}><div className="item-main"><span className="item-code">{item.item_code}</span><strong>{item.item_name}</strong><small>{item.category || "Uncategorised"}</small></div><div><small>Expected</small><strong>{formatNumber(item.expected_quantity)}</strong></div><div><small>Intake</small><strong>{formatMovementInDate(item.latest_movement_in_date)}</strong></div><div><small>Used</small><strong>{formatNumber(item.used_quantity)}</strong></div><div><small>Closing</small><strong className={item.closing_quantity < 0 ? "negative" : ""}>{formatNumber(item.closing_quantity)}</strong></div><div><small>Value</small><strong>{formatCurrency(item.usage_value)}</strong></div>{item.shortage_quantity > 0 ? <AlertTriangle size={16} className="risk-icon" /> : <TrendingUp size={16} className="good-icon" />}</div>;
                  })}</div>
                </details>
              );
            })}</div>
          </details>
        );
      })}</div> : <div className="empty-state">No regions or teams match “{query}”.</div>}
    </div>
  );
}
