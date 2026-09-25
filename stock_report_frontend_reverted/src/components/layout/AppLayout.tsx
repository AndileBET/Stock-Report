import {
  BarChart3,
  Boxes,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useState, useRef, type ChangeEvent, type ReactNode } from "react";
import type { PageId } from "../../App";

interface AppLayoutProps {
  activePage: PageId;
  children: ReactNode;
  isUploading: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  onPageChange: (page: PageId) => void;
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onApplyPeriod: () => void;
  onClearPeriod: () => void;
  onPresetPeriod: (preset: "last7" | "latestMonth") => void;
  onFiles: (files: File[]) => void;
  onGenerateSummary: () => void;
  meta: { transaction_count: number; from_date: string | null; to_date: string | null } | null;
}

const navItems = [
  { id: "overview" as PageId, label: "Overview", eyebrow: "Command centre", icon: LayoutDashboard },
  { id: "regions" as PageId, label: "Regions", eyebrow: "Regional control", icon: Boxes },
  { id: "items" as PageId, label: "Item usage", eyebrow: "Consumption intelligence", icon: PackageSearch },
  { id: "variance" as PageId, label: "Variance", eyebrow: "Inventory risk", icon: Scale },
  { id: "requests" as PageId, label: "Requests", eyebrow: "Request intelligence", icon: ClipboardList },
  { id: "summary" as PageId, label: "Executive reports", eyebrow: "Board-ready reporting", icon: Sparkles },
];

export function AppLayout({
  activePage,
  children,
  isUploading,
  onPageChange,
  onFiles,
  onGenerateSummary,
  meta,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  onApplyPeriod,
  onClearPeriod,
  onPresetPeriod,
}: AppLayoutProps) {
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length) onFiles(files);
    event.target.value = "";
  };

  const current = navItems.find((item) => item.id === activePage) ?? navItems[0];
  const endDate = meta?.to_date ?? "";
  const latestSevenStart = endDate ? new Date(`${endDate}T12:00:00`).getTime() - 6 * 86400000 : 0;
  const latestSevenStartDate = latestSevenStart ? new Date(latestSevenStart).toISOString().slice(0, 10) : "";
  const latestMonthStart = endDate ? `${endDate.slice(0, 8)}01` : "";
  const activePreset = !fromDate && !toDate
    ? "all"
    : fromDate === latestSevenStartDate && toDate === endDate
      ? "last7"
      : fromDate === latestMonthStart && toDate === endDate
        ? "latestMonth"
        : "custom";

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="ambient ambient-c" />

      <aside className="sidebar">
        <div className="sidebar-controls">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            title={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>
        <div className="brand">
          <div className="brand-mark"><BarChart3 size={22} /></div>
          <div>
            <strong>Stock Intelligence</strong>
            <span>Enterprise operations</span>
          </div>
        </div>

        <div className="nav-heading">Workspace</div>
        <nav className="sidebar-nav">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${id === activePage ? "active" : ""}`}
              onClick={() => onPageChange(id)}
            >
              <span className="nav-icon"><Icon size={17} /></span>
              <span>{label}</span>
              <span className="nav-chevron">↗</span>
            </button>
          ))}
        </nav>

      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="title-block">
            <p className="eyebrow">{current.eyebrow}</p>
            <h1>{current.label}</h1>
          </div>

          <div className="topbar-actions">
            <button className="ghost-button" onClick={() => folderRef.current?.click()}>
              <FolderOpen size={16} />
              <span>Folder</span>
            </button>

            <button className="summary-button" onClick={onGenerateSummary}>
              <Sparkles size={16} />
              <span>Generate report</span>
            </button>

            <input
              ref={filesRef}
              className="hidden-input"
              type="file"
              accept=".ods,.xlsx,.xlsm,.xls,.csv,.zip"
              multiple
              onChange={handleFiles}
            />
            <input
              ref={folderRef}
              className="hidden-input"
              type="file"
              accept=".ods,.xlsx,.xlsm,.xls,.csv,.zip"
              multiple
              onChange={handleFiles}
              {...({ webkitdirectory: "", directory: "" } as any)}
            />

            <button className="upload-button" disabled={isUploading} onClick={() => filesRef.current?.click()}>
              <UploadCloud size={16} />
              <span>{isUploading ? "Processing…" : "Upload data"}</span>
            </button>

          </div>
        </header>

        <div className="period-bar">
          <div className="period-label">
            <div><strong>Reporting window</strong></div>
          </div>

          <div className="period-presets" aria-label="Reporting window presets">
            <button className={activePreset === "all" ? "active" : ""} aria-pressed={activePreset === "all"} onClick={onClearPeriod}>All data</button>
            <button className={activePreset === "last7" ? "active" : ""} aria-pressed={activePreset === "last7"} onClick={() => onPresetPeriod("last7")}>Latest 7 days</button>
            <button className={activePreset === "latestMonth" ? "active" : ""} aria-pressed={activePreset === "latestMonth"} onClick={() => onPresetPeriod("latestMonth")}>Latest month</button>
          </div>

          <div className="period-dates">
            <label>From<input type="date" value={fromDate} onChange={(event) => onFromDateChange(event.target.value)} /></label>
            <span className="date-arrow">→</span>
            <label>To<input type="date" value={toDate} onChange={(event) => onToDateChange(event.target.value)} /></label>
            <button className="apply-period" onClick={onApplyPeriod}>Apply</button>
          </div>
        </div>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
