import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  CalendarRange,
  Check,
  ChevronDown,
  FileText,
  FileType2,
  FileSpreadsheet,
  Layers3,
  PackageSearch,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  DatasetMeta,
  ExecutiveSummary,
} from "../types/reports";

import {
  downloadExecutiveSummary,
  loadExecutiveSummary,
} from "../data/reportLoader";

import {
  formatCurrency,
  formatNumber,
} from "../utils/formatters";

import { KpiCard } from "../components/cards/KpiCard";
import { ChartPanel } from "../components/charts/ChartPanel";


interface ExecutiveSummaryPageProps {
  meta: DatasetMeta | null;
}


function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase();
}

function tableNumber(value: number | null, hideZero = false) {
  if (value === null || (hideZero && value === 0)) return "";
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


function buildSelectionPreview(
  values: string[],
  maxVisible = 2,
) {
  if (!values.length) {
    return "";
  }

  if (values.length <= maxVisible) {
    return values.join(" · ");
  }

  return `${values
    .slice(0, maxVisible)
    .join(" · ")} · +${values.length - maxVisible} more`;
}


function MultiSelect({
  label, values, options, onChange, placeholder, emptyMessage,
}: {
  label: string; values: string[]; options: string[]; onChange: (values: string[]) => void; placeholder: string; emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredOptions = useMemo(() => {
    const needle = normalizeSearch(query);
    return needle ? options.filter((option) => normalizeSearch(option).includes(needle)) : options;
  }, [options, query]);

  const allSelected = options.length > 0 && values.length === options.length;
  const allVisibleSelected = filteredOptions.length > 0 && filteredOptions.every((option) => values.includes(option));

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  }
  function selectAll() { onChange([...options]); }
  function clearAll() { onChange([]); }
  function selectVisible() { onChange(Array.from(new Set([...values, ...filteredOptions]))); }
  function clearVisible() { const visible = new Set(filteredOptions); onChange(values.filter((value) => !visible.has(value))); }

  return (
    <div className="multi-select-field" ref={wrapperRef}>
      <span className="multi-select-label">{label}</span>
      <button type="button" className="multi-select-trigger" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span>{values.length === 0 ? placeholder : allSelected ? `All ${label.toLowerCase()} selected` : `${values.length} selected`}</span>
        <ChevronDown size={16} className={open ? "rotate-chevron" : ""} />
      </button>

      {values.length > 0 ? (
        <div className="selection-preview">
          <div className="selection-preview-copy">
            <strong>{allSelected ? `All ${label.toLowerCase()}` : `${values.length} selected`}</strong>
            <span title={values.join(", ")}>{buildSelectionPreview(values, 2)}</span>
          </div>
          <button type="button" className="selection-clear" title={`Clear ${label}`} onClick={clearAll}><X size={13} /></button>
        </div>
      ) : null}

      {open ? (
        <div className="multi-select-menu">
          <div className="multi-select-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}...`} autoFocus /></div>
          <div className="multi-select-actions-grid">
            <button type="button" onClick={allSelected ? clearAll : selectAll}>{allSelected ? "Clear all" : `Select all ${label.toLowerCase()}`}</button>
            <button type="button" onClick={allVisibleSelected ? clearVisible : selectVisible}>{allVisibleSelected ? "Clear filtered" : "Select filtered"}</button>
          </div>
          <div className="multi-select-options">
            {filteredOptions.map((option) => {
              const checked = values.includes(option);
              return <button type="button" key={option} className={`multi-select-option ${checked ? "selected" : ""}`} onClick={() => toggle(option)}>
                <span className={`check-box ${checked ? "checked" : ""}`}>{checked ? <Check size={12} /> : null}</span>
                <span className="option-copy">{option}</span>
              </button>;
            })}
            {!filteredOptions.length ? <div className="multi-empty">{emptyMessage ?? "No matching options"}</div> : null}
          </div>
          <div className="multi-select-footer"><span>{filteredOptions.length} shown</span><span>{values.length} selected</span></div>
        </div>
      ) : null}
    </div>
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function ExecutiveSummaryPage({
  meta,
}: ExecutiveSummaryPageProps) {
  const [regions, setRegions] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [items, setItems] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | "xlsx" | null>(null);
  const [error, setError] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const teamsByRegion = meta?.teams_by_region;
  const itemsByTeam = meta?.items_by_team;
  const availableRegions = meta?.regions ?? [];

  const filteredTeams = useMemo(() => {
    if (!regions.length) return meta?.teams ?? [];
    return unique(regions.flatMap((region) => teamsByRegion?.[region] ?? [])).sort();
  }, [meta?.teams, regions, teamsByRegion]);

  const filteredItems = useMemo(() => {
    if (!regions.length && !teams.length) return meta?.items ?? [];
    const selectedTeams = teams.length ? teams : filteredTeams;
    return unique(selectedTeams.flatMap((team) => itemsByTeam?.[team] ?? [])).sort();
  }, [meta?.items, regions, teams, filteredTeams, itemsByTeam]);

  useEffect(() => {
    setTeams((current) => current.filter((value) => filteredTeams.includes(value)));
  }, [filteredTeams]);

  useEffect(() => {
    setItems((current) => current.filter((value) => filteredItems.includes(value)));
  }, [filteredItems]);

  function effectiveScope() {
    if (teams.length) return "team" as const;
    if (items.length) return "item" as const;
    if (regions.length) return "region" as const;
    return "all" as const;
  }

  const scope = effectiveScope();
  const canGenerate = Boolean(meta?.loaded);

  useEffect(() => {
    setSummary(null);
    setExportNotice("");
  }, [regions, teams, items, from, to]);

  async function generate() {
    setBusy(true);
    setError("");
    setExportNotice("");

    try {
      setSummary(
        await loadExecutiveSummary(
          {
            scope,
            regions,
            teams,
            item_codes:
              items,
            from_date:
              from,
            to_date:
              to,
          },
        ),
      );
    } catch (e) {
      setSummary(null);

      setError(
        e instanceof Error
          ? e.message
          : "Could not generate the summary. Review the selected regions, teams, items and reporting period.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function exportReport(
    format:
      | "pdf"
      | "docx"
      | "xlsx",
  ) {
    if (!summary) {
      return;
    }

    setExporting(
      format,
    );

    setError("");
    setExportNotice("");

    try {
      await downloadExecutiveSummary(
        {
          format,
          scope,
          regions,
          teams,
          item_codes:
            items,
          from_date:
            from,
          to_date:
            to,
        },
      );

      setExportNotice(
        `${format.toUpperCase()} report generated successfully.`,
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not export report",
      );
    } finally {
      setExporting(null);
    }
  }

  function setQuickRange(
    kind:
      | "last7"
      | "month"
      | "all",
  ) {
    if (
      !meta?.to_date ||
      kind === "all"
    ) {
      setFrom("");
      setTo("");
      return;
    }

    const endDate =
      new Date(
        `${meta.to_date}T12:00:00`,
      );

    const end =
      meta.to_date;

    if (
      kind === "month"
    ) {
      setFrom(
        new Date(
          endDate.getFullYear(),
          endDate.getMonth(),
          1,
        )
          .toISOString()
          .slice(0, 10),
      );

      setTo(end);
    } else {
      setFrom(
        new Date(
          endDate.getTime() -
            6 *
              86400000,
        )
          .toISOString()
          .slice(0, 10),
      );

      setTo(end);
    }
  }

  function clearReportFilters() {
    setRegions([]);
    setTeams([]);
    setItems([]);
    setFrom("");
    setTo("");
    setSummary(null);
    setError("");
    setExportNotice("");
  }

  const title =
    teams.length === 1 ? teams[0] :
    regions.length === 1 ? regions[0] :
    items.length === 1 ? items[0] :
    teams.length ? `${teams.length} teams` :
    regions.length ? `${regions.length} regions` : items.length ? `${items.length} items` : "All regions";

  const itemChartData =
    useMemo(
      () =>
        summary?.usage_by_item
          .slice(0, 12)
          .map(
            (row) => ({
              item:
                row.item_name ||
                row.item_code,
              code:
                row.item_code,
              used:
                row.used_quantity,
            }),
          ) ?? [],
      [summary],
    );

  const regionalChartData =
    useMemo(
      () =>
        summary
          ?.usage_by_region
          .slice(0, 10)
          .map(
            (row) => ({
              region:
                row.region,
              used:
                row.used_quantity,
              value:
                row.usage_value,
            }),
          ) ?? [],
      [summary],
    );

  const warningMessages =
    summary &&
    "warnings" in summary &&
    Array.isArray(
      (
        summary as
          ExecutiveSummary & {
            warnings?: string[];
          }
      ).warnings,
    )
      ? (
          summary as
            ExecutiveSummary & {
              warnings?: string[];
            }
        ).warnings ??
        []
      : [];

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <span className="eyebrow">
            Executive reporting
          </span>

          <h2>
            Executive report studio
          </h2>

          <p>
            Compose a management
            report across multiple
            regions, teams, items
            and reporting periods.
          </p>
        </div>

        {summary ? (
          <div className="export-toolbar">
            <button
              className="report-export-button pdf"
              onClick={() =>
                exportReport(
                  "pdf",
                )
              }
              disabled={
                !!exporting
              }
            >
              <FileText
                size={16}
              />

              {exporting ===
              "pdf"
                ? "Generating..."
                : "PDF report"}
            </button>

            <button
              className="report-export-button docx"
              onClick={() =>
                exportReport(
                  "docx",
                )
              }
              disabled={
                !!exporting
              }
            >
              <FileType2
                size={16}
              />

              {exporting ===
              "docx"
                ? "Generating..."
                : "Word report"}
            </button>

            <button
              className="report-export-button text"
              onClick={() =>
                exportReport(
                  "xlsx",
                )
              }
              disabled={
                !!exporting
              }
            >
              <FileSpreadsheet
                size={16}
              />

              {exporting ===
              "xlsx"
                ? "Generating..."
                : "Excel sheet"}
            </button>
          </div>
        ) : null}
      </div>

      <section className="summary-builder">
        <div className="builder-form">
          <div className="builder-head">
            <div>
              <h3>Build report scope</h3>
              <span>Select regions, teams, items and a reporting period. Leave a filter empty to include all available values.</span>
            </div>
            <FileText size={20} />
          </div>

          <div className="form-grid executive-form-grid report-scope-grid">
            <MultiSelect label="Regions" values={regions} options={availableRegions} onChange={setRegions} placeholder="Choose regions" />
            <MultiSelect label="Teams" values={teams} options={filteredTeams} onChange={setTeams} placeholder="Choose teams" />
            <MultiSelect label="Items" values={items} options={filteredItems} onChange={setItems} placeholder="Choose items" />
          </div>

          <div className="report-period-section">
            <div className="report-period-heading">
              <div><span className="multi-select-label">Reporting period</span><small>Use one reporting period for the entire executive report.</small></div>
              <span className="report-period-current">{from && to ? `${from} → ${to}` : "All available data"}</span>
            </div>
            <div className="quick-dates report-period-presets">
              <button className={!from && !to ? "active" : ""} onClick={() => setQuickRange("all")}>All available</button>
              <button className={from && to && meta?.to_date && from === new Date(`${meta.to_date}T12:00:00`).toISOString().slice(0,10) && to === meta.to_date ? "active" : ""} onClick={() => setQuickRange("month")}>Latest month</button>
              <button className={from && to && meta?.to_date && from === new Date(new Date(`${meta.to_date}T12:00:00`).getTime()-6*86400000).toISOString().slice(0,10) && to === meta.to_date ? "active" : ""} onClick={() => setQuickRange("last7")}>Latest 7 days</button>
              <span className="report-period-custom-label">Custom range</span>
            </div>
            <div className="report-date-range">
              <label className="date-field"><span>From</span><div><CalendarRange size={15}/><input type="date" value={from} min={meta?.from_date || undefined} max={to || meta?.to_date || undefined} onChange={(event)=>setFrom(event.target.value)}/></div></label>
              <span className="date-arrow">→</span>
              <label className="date-field"><span>To</span><div><CalendarRange size={15}/><input type="date" value={to} min={from || meta?.from_date || undefined} max={meta?.to_date || undefined} onChange={(event)=>setTo(event.target.value)}/></div></label>
            </div>
          </div>

          <div className="selection-strip report-selection-summary">
            <span>{regions.length ? `${regions.length} regions` : "All regions available"}</span>
            <span>{teams.length ? `${teams.length} teams` : "All teams available"}</span>
            <span>{items.length ? `${items.length} items` : "All items available"}</span>
            <span>{from || "all time"} → {to || "latest"}</span>
          </div>

          <button className="generate-button" onClick={generate} disabled={!canGenerate || busy}>
            {busy ? "Generating executive report..." : "Generate executive summary"}
          </button>
          {error ? <div className="inline-error">{error}</div> : null}
          {exportNotice ? <div className="inline-success">{exportNotice}</div> : null}
        </div>
      </section>

      {summary ? (
        <>
          {warningMessages.length ? (
            <section className="report-warning-list">
              {warningMessages.map(
                (
                  message,
                ) => (
                  <div
                    className="inline-warning"
                    key={
                      message
                    }
                  >
                    {
                      message
                    }
                  </div>
                ),
              )}
            </section>
          ) : null}

          <section className="summary-banner">
            <div>
              <span className="eyebrow">
                Generated view
              </span>

              <h3>
                {title}
              </h3>

              <p>
                {summary
                  .filters
                  .from_date ||
                  "All available"}{" "}
                →{" "}
                {summary
                  .filters
                  .to_date ||
                  "Latest loaded date"}
              </p>

              <div className="summary-context-row">
                <span>
                  {summary.filters.regions.length || "All"} regions
                </span>

                <span>
                  {
                    summary
                      .filters
                      .teams
                      .length
                  }{" "}
                  teams selected
                </span>

                <span>
                  {summary
                    .filters
                    .item_codes
                    .length ||
                    "All"}{" "}
                  items selected
                </span>
              </div>
            </div>

            <span className="summary-scope">
              {scope}
            </span>
          </section>

          <section className="panel stock-export-panel">
            <div className="panel-header">
              <div><span className="eyebrow">Export preview</span><h2>Stock movement table</h2><p>PDF, Excel and Word use these columns. Exports include all {summary.detail_rows.length.toLocaleString()} rows.</p></div>
            </div>
            <div className="stock-export-scroll">
              <table className="stock-export-table">
                <thead><tr>{summary.detail_columns.map((heading, index) => <th key={`${heading}-${index}`}>{heading}</th>)}</tr></thead>
                <tbody>{summary.detail_rows.slice(0, 30).map((row, index) => <tr key={`${row.team}-${row.item}-${index}`}>
                  <td>{row.date.replaceAll("-", "/")}</td><td>{row.operator}</td><td>{row.team}</td><td>{row.item}</td>
                  <td>{tableNumber(row.opening_quantity)}</td><td>{tableNumber(row.new_stock, true)}</td>
                  <td>{tableNumber(row.stock_give_away)}</td><td>{tableNumber(row.closing_quantity)}</td>
                  <td className="stock-variance-cell">{tableNumber(row.variance)}</td><td>{tableNumber(row.value_per_item)}</td>
                  <td>{tableNumber(row.opening_value)}</td><td>{tableNumber(row.new_stock_value)}</td>
                  <td>{tableNumber(row.sg_value)}</td><td>{tableNumber(row.closing_value)}</td>
                </tr>)}</tbody>
              </table>
            </div>
            {summary.detail_rows.length > 30 ? <p className="stock-export-count">Previewing 30 of {summary.detail_rows.length.toLocaleString()} rows.</p> : null}
          </section>

          <section className="kpi-grid three">
            <KpiCard
              icon={
                Layers3
              }
              label="Expected stock"
              value={formatNumber(
                summary
                  .metrics
                  .expected_quantity,
              )}
            />

            <KpiCard
              icon={
                PackageSearch
              }
              label="Stock used"
              value={formatNumber(
                summary
                  .metrics
                  .used_quantity,
              )}
            />

            <KpiCard
              icon={
                Sparkles
              }
              label="Usage value"
              value={formatCurrency(
                summary
                  .metrics
                  .usage_value,
              )}
            />

            <KpiCard
              icon={
                Users
              }
              label="Teams represented"
              value={formatNumber(
                summary
                  .metrics
                  .teams,
              )}
            />

            <KpiCard
              icon={
                Building2
              }
              label="Regions represented"
              value={formatNumber(
                summary
                  .metrics
                  .regions,
              )}
            />

            <KpiCard
              icon={
                PackageSearch
              }
              label="Shortage exposure"
              value={formatNumber(
                summary
                  .metrics
                  .shortage_quantity,
              )}
              tone={
                summary
                  .metrics
                  .shortage_quantity >
                0
                  ? "bad"
                  : "good"
              }
            />
          </section>

          <section className="chart-grid two-one">
            <ChartPanel
              title="Usage by region"
              subtitle="See which regions are driving consumption."
            >
              <ResponsiveContainer
                width="100%"
                height={
                  310
                }
              >
                <BarChart
                  data={
                    regionalChartData
                  }
                >
                  <CartesianGrid
                    stroke="rgba(16,30,26,.08)"
                    vertical={
                      false
                    }
                  />

                  <XAxis
                    dataKey="region"
                    stroke="#6b7973"
                  />

                  <YAxis
                    stroke="#6b7973"
                  />

                  <Tooltip
                    formatter={(
                      value,
                    ) =>
                      formatNumber(
                        Number(
                          value,
                        ),
                      )
                    }
                  />

                  <Legend />

                  <Bar
                    dataKey="used"
                    name="Units used"
                    fill="#1f765f"
                    radius={[
                      8,
                      8,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>

            <ChartPanel
              title="Top item usage"
              subtitle="Highest-consumption items within the selected scope."
            >
              <ResponsiveContainer
                width="100%"
                height={
                  310
                }
              >
                <BarChart
                  data={
                    itemChartData
                  }
                  layout="vertical"
                  margin={{
                    left: 18,
                    right:
                      18,
                  }}
                >
                  <CartesianGrid
                    stroke="rgba(16,30,26,.08)"
                    horizontal={
                      false
                    }
                  />

                  <XAxis
                    type="number"
                    stroke="#6b7973"
                  />

                  <YAxis
                    dataKey="item"
                    type="category"
                    width={
                      130
                    }
                    stroke="#6b7973"
                  />

                  <Tooltip
                    formatter={(
                      value,
                    ) =>
                      formatNumber(
                        Number(
                          value,
                        ),
                      )
                    }
                  />

                  <Bar
                    dataKey="used"
                    name="Units used"
                    fill="#63d4b2"
                    radius={[
                      0,
                      8,
                      8,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">
                  Report appendix
                </span>

                <h2>
                  Usage detail
                  across selected
                  scope
                </h2>

                <p>
                  Every row
                  retains
                  region,
                  team and item
                  context.
                </p>
              </div>

              <div className="appendix-badge">
                {summary
                  .usage_by_item
                  .length
                  .toLocaleString()}{" "}
                rows
              </div>
            </div>

            <div className="summary-list report-detail-list">
              {summary
                .usage_by_item
                .map(
                  (
                    row,
                  ) => (
                    <div
                      className="summary-row report-detail-row"
                      key={`${row.region}-${row.team}-${row.item_code}`}
                    >
                      <div>
                        <span>
                          {
                            row.region
                          }
                        </span>

                        <strong>
                          {
                            row.item_name
                          }
                        </strong>

                        <small>
                          {
                            row.team
                          }{" "}
                          ·{" "}
                          {
                            row.item_code
                          }
                        </small>
                      </div>

                      <div>
                        <small>
                          Used
                        </small>

                        <strong>
                          {formatNumber(
                            row.used_quantity,
                          )}
                        </strong>
                      </div>

                      <div>
                        <small>
                          Value
                        </small>

                        <strong>
                          {formatCurrency(
                            row.usage_value,
                          )}
                        </strong>
                      </div>

                      <div>
                        <small>
                          Requests
                        </small>

                        <strong>
                          {formatNumber(
                            row.request_count,
                          )}
                        </strong>
                      </div>
                    </div>
                  ),
                )}
            </div>
          </section>
        </>
      ) : (
        <div className="empty-panel summary-empty-panel">
          <Sparkles
            size={24}
          />

          <h3>
            Build an
            enterprise report
          </h3>

          <p>
            Select any
            combination of
            regions, teams
            and items, set the
            reporting window,
            and generate a
            live executive
            summary.
          </p>
        </div>
      )}
    </div>
  );
}
