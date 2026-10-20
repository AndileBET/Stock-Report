import { ArrowUpRight, Check, CircleAlert, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DataQualityIssue } from "../types/reports";
import { formatNumber } from "../utils/formatters";

function displayDate(value: string | null) {
  if (!value) return "Date unavailable";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

function issueKey(issue: DataQualityIssue) {
  return `${issue.id}:${issue.message}`;
}

function readStoredIssueKeys(storageKey: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

export function ErrorsPage({
  issues,
  transactionCount,
  onOpenIssue,
}: {
  issues: DataQualityIssue[];
  transactionCount: number;
  onOpenIssue: (issue: DataQualityIssue) => void;
}) {
  const [search, setSearch] = useState("");
  const [stockLimit, setStockLimit] = useState(50);
  const [namingLimit, setNamingLimit] = useState(50);
  const [checkedIds, setCheckedIds] = useState<string[]>(() => readStoredIssueKeys("stock-dashboard-checked-issues"));
  const [deletedIds, setDeletedIds] = useState<string[]>(() => readStoredIssueKeys("stock-dashboard-deleted-issues"));
  useEffect(() => localStorage.setItem("stock-dashboard-checked-issues", JSON.stringify(checkedIds)), [checkedIds]);
  useEffect(() => localStorage.setItem("stock-dashboard-deleted-issues", JSON.stringify(deletedIds)), [deletedIds]);
  const visibleIssues = useMemo(() => issues.filter((issue) => !deletedIds.includes(issueKey(issue))), [issues, deletedIds]);
  const filteredIssues = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? visibleIssues.filter((issue) => JSON.stringify(issue).toLowerCase().includes(needle)) : visibleIssues;
  }, [visibleIssues, search]);
  const filteredStockIssues = filteredIssues.filter((issue) => issue.type === "stock_opening_mismatch");
  const filteredNamingIssues = filteredIssues.filter((issue) => issue.type !== "stock_opening_mismatch");

  const renderIssue = (issue: DataQualityIssue) => {
    const key = issueKey(issue);
    const checked = checkedIds.includes(key);
    return <article className={`issue-card issue-${issue.severity} ${checked ? "issue-card-checked" : ""}`} key={issue.id}>
      <button className="issue-card-main" type="button" onClick={() => onOpenIssue(issue)}>
      <span className="issue-icon"><CircleAlert size={18} /></span>
      <span className="issue-copy">
        <span className="issue-heading"><strong>{issue.title}</strong><span>{issue.severity === "high" ? "High" : "Review"}</span></span>
        <span className="issue-message">{issue.message}</span>
        <span className="issue-location">
          {issue.region} · {issue.team}{issue.item_code ? ` · ${issue.item_code}` : ""} · {displayDate(issue.date)}
        </span>
        {issue.type === "stock_opening_mismatch" ? (
          <span className="issue-evidence">
            Prior close ({displayDate(issue.previous_date)}): <b>{formatNumber(issue.expected_quantity ?? 0)}</b>
            <span aria-hidden="true">→</span>
            New opening: <b>{formatNumber(issue.actual_quantity ?? 0)}</b>
          </span>
        ) : issue.site ? <span className="issue-evidence">Source site: <b>{issue.site}</b></span> : null}
      </span>
      <span className="issue-open-label">View location <ArrowUpRight size={15} /></span>
      </button>
      <div className="issue-actions">
        <button type="button" className="issue-action-button" aria-pressed={checked} onClick={() => setCheckedIds((current) => checked ? current.filter((id) => id !== key) : [...current, key])}>
          <Check size={14} />{checked ? "Checked" : "Mark checked"}
        </button>
        <button type="button" className="issue-action-button issue-delete-button" disabled={!checked} onClick={() => setDeletedIds((current) => [...current, key])}>
          <Trash2 size={14} />Delete note
        </button>
      </div>
    </article>;
  };

  return (
    <div className="page-stack errors-page">
      <div className="page-toolbar">
        <div>
          <span className="eyebrow">Data quality</span>
          <h2>Errors & checks</h2>
          <p>Review stock continuity and region naming issues found in the loaded transaction data.</p>
        </div>
        <div className="errors-total"><strong>{visibleIssues.length}</strong><span>issues remaining</span></div>
      </div>

      <section className="issue-summary-strip">
        <div><span className="issue-summary-icon issue-summary-red"><CircleAlert size={17} /></span><span><b>{visibleIssues.filter((issue) => issue.type === "stock_opening_mismatch").length}</b><small>Stock opening mismatches</small></span></div>
        <div><span className="issue-summary-icon issue-summary-gold"><CircleAlert size={17} /></span><span><b>{visibleIssues.filter((issue) => issue.type !== "stock_opening_mismatch").length}</b><small>Region naming checks</small></span></div>
        <div><span className="issue-summary-icon issue-summary-green"><ShieldCheck size={17} /></span><span><b>{formatNumber(transactionCount)}</b><small>Transactions reviewed</small></span></div>
      </section>

      {visibleIssues.length ? <div className="errors-search"><CircleAlert size={15} /><input value={search} onChange={(event) => { setSearch(event.target.value); setStockLimit(50); setNamingLimit(50); }} placeholder="Filter by region, team, item, date or site" aria-label="Filter errors" /></div> : null}

      {!visibleIssues.length ? (
        <section className="errors-clear-state"><span><ShieldCheck size={24} /></span><h3>No outstanding data quality issues</h3><p>All detected issues have been reviewed or there are no current issues.</p></section>
      ) : null}

      {filteredStockIssues.length ? <section className="issue-section"><div className="issue-section-heading"><div><h3>Stock continuity</h3><p>Next recorded opening quantity compared with the previous recorded closing balance.</p></div><span>{filteredStockIssues.length}</span></div><div className="issue-list">{filteredStockIssues.slice(0, stockLimit).map(renderIssue)}</div>{filteredStockIssues.length > stockLimit ? <button className="issue-load-more" onClick={() => setStockLimit((limit) => limit + 50)}>Show 50 more stock issues</button> : null}</section> : null}

      {filteredNamingIssues.length ? <section className="issue-section"><div className="issue-section-heading"><div><h3>Region naming</h3><p>Team prefixes or region labels that need review against the approved region list.</p></div><span>{filteredNamingIssues.length}</span></div><div className="issue-list">{filteredNamingIssues.slice(0, namingLimit).map(renderIssue)}</div>{filteredNamingIssues.length > namingLimit ? <button className="issue-load-more" onClick={() => setNamingLimit((limit) => limit + 50)}>Show 50 more naming issues</button> : null}</section> : null}
      {visibleIssues.length && !filteredIssues.length ? <div className="empty-state">No errors match “{search}”.</div> : null}
    </div>
  );
}
