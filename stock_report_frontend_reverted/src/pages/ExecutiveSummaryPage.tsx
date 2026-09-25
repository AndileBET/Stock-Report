import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarRange,
  Check,
  ChevronDown,
  FileText,
  FileType2,
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
  label,
  values,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] =
    useState(false);

  const [query, setQuery] =
    useState("");

  const filteredOptions =
    useMemo(() => {
      const needle =
        normalizeSearch(query);

      if (!needle) {
        return options;
      }

      return options.filter(
        (option) =>
          normalizeSearch(
            option,
          ).includes(needle),
      );
    }, [options, query]);

  const allSelected =
    options.length > 0 &&
    values.length === options.length;

  const allVisibleSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every(
      (option) =>
        values.includes(option),
    );

  function toggle(
    value: string,
  ) {
    onChange(
      values.includes(value)
        ? values.filter(
            (item) =>
              item !== value,
          )
        : [
            ...values,
            value,
          ],
    );
  }

  function selectAll() {
    onChange([...options]);
  }

  function clearAll() {
    onChange([]);
  }

  function selectVisible() {
    onChange(
      Array.from(
        new Set([
          ...values,
          ...filteredOptions,
        ]),
      ),
    );
  }

  function clearVisible() {
    const visible =
      new Set(filteredOptions);

    onChange(
      values.filter(
        (value) =>
          !visible.has(value),
      ),
    );
  }

  const preview =
    buildSelectionPreview(
      values,
      2,
    );

  return (
    <div
      className="multi-select-field"
      style={{
        position: "relative",
      }}
    >
      <span
        className="multi-select-label"
      >
        {label}
      </span>

      <button
        type="button"
        className="multi-select-trigger"
        onClick={() =>
          setOpen(
            (current) =>
              !current,
          )
        }
      >
        <span>
          {values.length === 0
            ? placeholder
            : allSelected
              ? `All ${label.toLowerCase()} selected`
              : `${values.length} selected`}
        </span>

        <ChevronDown
          size={16}
          className={
            open
              ? "rotate-chevron"
              : ""
          }
        />
      </button>

      {values.length > 0 ? (
        <div
          style={{
            marginTop: 8,
            minHeight: 38,
            padding:
              "9px 12px",
            borderRadius: 10,
            border:
              "1px solid rgba(34, 74, 62, 0.11)",
            background:
              "rgba(246, 250, 248, 0.88)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color:
                  "#49665c",
                marginBottom: 3,
              }}
            >
              {allSelected
                ? `All ${label.toLowerCase()}`
                : `${values.length} selected`}
            </div>

            <div
              title={values.join(
                ", ",
              )}
              style={{
                color:
                  "#18372e",
                fontSize: 12,
                overflow:
                  "hidden",
                textOverflow:
                  "ellipsis",
                whiteSpace:
                  "nowrap",
                maxWidth:
                  "100%",
              }}
            >
              {preview}
            </div>
          </div>

          <button
            type="button"
            title={`Clear ${label}`}
            onClick={clearAll}
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              border:
                "1px solid rgba(34, 74, 62, 0.12)",
              background:
                "#ffffff",
              display: "grid",
              placeItems:
                "center",
              cursor:
                "pointer",
              flex:
                "0 0 auto",
            }}
          >
            <X size={13} />
          </button>
        </div>
      ) : null}

      {open ? (
        <div
          className="multi-select-menu"
        >
          <div
            className="multi-select-search"
          >
            <Search size={14} />

            <input
              value={query}
              onChange={(
                event,
              ) =>
                setQuery(
                  event.target
                    .value,
                )
              }
              placeholder={`Search ${label.toLowerCase()}...`}
              autoFocus
            />
          </div>

          <div
            style={{
              padding:
                "8px 10px",
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 7,
              borderBottom:
                "1px solid rgba(23, 48, 40, .08)",
            }}
          >
            <button
              type="button"
              onClick={
                allSelected
                  ? clearAll
                  : selectAll
              }
              style={{
                borderRadius: 8,
                padding:
                  "8px 10px",
                border:
                  "1px solid rgba(31,118,95,.18)",
                background:
                  allSelected
                    ? "#edf5f1"
                    : "#f7fbf9",
                color:
                  "#1f765f",
                fontWeight: 700,
                cursor:
                  "pointer",
              }}
            >
              {allSelected
                ? "Clear all"
                : `Select all ${label.toLowerCase()}`}
            </button>

            <button
              type="button"
              onClick={
                allVisibleSelected
                  ? clearVisible
                  : selectVisible
              }
              style={{
                borderRadius: 8,
                padding:
                  "8px 10px",
                border:
                  "1px solid rgba(31,118,95,.18)",
                background:
                  "#ffffff",
                color:
                  "#36574c",
                fontWeight: 700,
                cursor:
                  "pointer",
              }}
            >
              {allVisibleSelected
                ? "Clear filtered"
                : "Select filtered"}
            </button>
          </div>

          <div
            className="multi-select-options"
          >
            {filteredOptions.map(
              (option) => {
                const checked =
                  values.includes(
                    option,
                  );

                return (
                  <button
                    type="button"
                    key={option}
                    className={`multi-select-option ${
                      checked
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      toggle(
                        option,
                      )
                    }
                  >
                    <span
                      className={`check-box ${
                        checked
                          ? "checked"
                          : ""
                      }`}
                    >
                      {checked ? (
                        <Check
                          size={12}
                        />
                      ) : null}
                    </span>

                    <span
                      className="option-copy"
                    >
                      {option}
                    </span>
                  </button>
                );
              },
            )}

            {!filteredOptions.length ? (
              <div
                className="multi-empty"
              >
                No matching options
              </div>
            ) : null}
          </div>

          <div
            style={{
              padding:
                "8px 11px",
              borderTop:
                "1px solid rgba(23,48,40,.08)",
              color:
                "#6d7974",
              fontSize: 11,
              display:
                "flex",
              justifyContent:
                "space-between",
            }}
          >
            <span>
              {filteredOptions.length} shown
            </span>

            <span>
              {values.length} selected
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}


export function ExecutiveSummaryPage({
  meta,
}: ExecutiveSummaryPageProps) {
  const [
    scope,
    setScope,
  ] =
    useState<
      "team" |
      "province" |
      "item"
    >("team");

  const [
    regions,
    setRegions,
  ] =
    useState<string[]>([]);

  const [
    teams,
    setTeams,
  ] =
    useState<string[]>([]);

  const [
    items,
    setItems,
  ] =
    useState<string[]>([]);

  const [
    from,
    setFrom,
  ] =
    useState("");

  const [
    to,
    setTo,
  ] =
    useState("");

  const [
    summary,
    setSummary,
  ] =
    useState<
      ExecutiveSummary | null
    >(null);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    exporting,
    setExporting,
  ] =
    useState<
      "pdf" |
      "docx" |
      "txt" |
      null
    >(null);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    exportNotice,
    setExportNotice,
  ] =
    useState("");

  useEffect(() => {
    if (!meta) {
      return;
    }

    setRegions(
      (current) =>
        current.filter(
          (value) =>
            meta.regions.includes(
              value,
            ),
        ),
    );

    setTeams(
      (current) =>
        current.filter(
          (value) =>
            meta.teams.includes(
              value,
            ),
        ),
    );

    setItems(
      (current) =>
        current.filter(
          (value) =>
            meta.items.includes(
              value,
            ),
        ),
    );
  }, [meta]);

  const canGenerate =
    Boolean(
      meta?.loaded &&
        (
          (
            scope ===
              "team" &&
            teams.length > 0
          ) ||
          (
            scope ===
              "province" &&
            regions.length > 0
          ) ||
          (
            scope ===
              "item" &&
            items.length > 0
          )
        ),
    );

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
          : "Could not generate the summary. Review the selected teams, provinces, items and reporting period.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function exportReport(
    format:
      | "pdf"
      | "docx"
      | "txt",
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
    scope === "team"
      ? teams.length === 1
        ? teams[0]
        : `${teams.length} teams`
      : scope ===
          "province"
        ? regions.length ===
          1
          ? regions[0]
          : `${regions.length} provinces`
        : items.length ===
            1
          ? items[0]
          : `${items.length} items`;

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
            provinces, teams, items
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
                  "txt",
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
              "txt"
                ? "Generating..."
                : "Text"}
            </button>
          </div>
        ) : null}
      </div>

      <section className="summary-builder">
        <div className="scope-rail">
          <button
            className={`scope-tile ${
              scope ===
              "team"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setScope(
                "team",
              )
            }
          >
            <Users
              size={20}
            />

            <span>
              Teams
            </span>

            <small>
              Select one,
              multiple, or all
              teams.
            </small>
          </button>

          <button
            className={`scope-tile ${
              scope ===
              "province"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setScope(
                "province",
              )
            }
          >
            <Building2
              size={20}
            />

            <span>
              Provinces
            </span>

            <small>
              Combine multiple
              regions into one
              executive view.
            </small>
          </button>

          <button
            className={`scope-tile ${
              scope ===
              "item"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setScope(
                "item",
              )
            }
          >
            <PackageSearch
              size={20}
            />

            <span>
              Items
            </span>

            <small>
              Select one,
              multiple, or all
              products.
            </small>
          </button>
        </div>

        <div className="builder-form">
          <div className="builder-head">
            <div>
              <h3>
                Build report
                scope
              </h3>

              <span>
                Select the exact
                teams, provinces
                and products you
                want included.
              </span>
            </div>

            <Sparkles
              size={22}
            />
          </div>

          <div className="form-grid executive-form-grid">
            <MultiSelect
              label="Provinces"
              values={
                regions
              }
              options={
                meta?.regions ??
                []
              }
              onChange={
                setRegions
              }
              placeholder="Choose provinces"
            />

            <MultiSelect
              label="Teams"
              values={
                teams
              }
              options={
                meta?.teams ??
                []
              }
              onChange={
                setTeams
              }
              placeholder="Choose teams"
            />

            <MultiSelect
              label="Items"
              values={
                items
              }
              options={
                meta?.items ??
                []
              }
              onChange={
                setItems
              }
              placeholder="Choose items"
            />

            <label className="date-field">
              <span>
                From
              </span>

              <div>
                <CalendarRange
                  size={15}
                />

                <input
                  type="date"
                  value={
                    from
                  }
                  min={
                    meta?.from_date ||
                    undefined
                  }
                  max={
                    to ||
                    meta?.to_date ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setFrom(
                      event
                        .target
                        .value,
                    )
                  }
                />
              </div>
            </label>

            <label className="date-field">
              <span>
                To
              </span>

              <div>
                <CalendarRange
                  size={15}
                />

                <input
                  type="date"
                  value={
                    to
                  }
                  min={
                    from ||
                    meta?.from_date ||
                    undefined
                  }
                  max={
                    meta?.to_date ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setTo(
                      event
                        .target
                        .value,
                    )
                  }
                />
              </div>
            </label>
          </div>

          <div className="selection-strip">
            <span>
              {regions.length} provinces
            </span>

            <span>
              {teams.length} teams
            </span>

            <span>
              {items.length} items
            </span>

            <span>
              {from ||
                "all time"}{" "}
              →{" "}
              {to ||
                "latest"}
            </span>
          </div>

          <div className="quick-dates">
            <button
              onClick={() =>
                setQuickRange(
                  "last7",
                )
              }
            >
              Latest 7 days
            </button>

            <button
              onClick={() =>
                setQuickRange(
                  "month",
                )
              }
            >
              Latest month
            </button>

            <button
              onClick={() =>
                setQuickRange(
                  "all",
                )
              }
            >
              All available
            </button>

            <button
              onClick={
                clearReportFilters
              }
            >
              Clear filters
            </button>
          </div>

          <button
            className="generate-button"
            onClick={
              generate
            }
            disabled={
              !canGenerate ||
              busy
            }
          >
            <Sparkles
              size={17}
            />

            {busy
              ? "Generating executive report..."
              : "Generate executive summary"}
          </button>

          {error ? (
            <div className="inline-error">
              {error}
            </div>
          ) : null}

          {exportNotice ? (
            <div className="inline-success">
              {
                exportNotice
              }
            </div>
          ) : null}
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
                  {
                    summary
                      .filters
                      .regions
                      .length
                  }{" "}
                  provinces selected
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
              label="Provinces represented"
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
              title="Usage by province"
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
                  province,
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
            provinces, teams
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