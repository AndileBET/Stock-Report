import {
  BarChart3,
  Boxes,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  PackageSearch,
  Scale,
  Search,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useEffect, useRef, type ChangeEvent, type ReactNode } from "react";
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
  query,
  onQueryChange,
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
  const searchRef = useRef<HTMLInputElement>(null);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length) onFiles(files);
    event.target.value = "";
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const current = navItems.find((item) => item.id === activePage) ?? navItems[0];
  const loaded = Boolean(meta?.transaction_count);

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="ambient ambient-c" />

      <aside className="sidebar">
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

        <div className="sidebar-bottom">
          <div className="side-card">
            <span className="side-card-kicker">Local-first engine</span>
            <Sparkles size={17} />
            <strong>Decision-grade stock reporting.</strong>
            <span>Clean ingestion, auditable calculations, executive-ready outputs.</span>
          </div>
          <div className="engine-status">
            <span className={`pulse-dot ${loaded ? "online" : ""}`} />
            <span>{loaded ? "Dataset live" : "Awaiting dataset"}</span>
            <small>{meta?.transaction_count ? `${meta.transaction_count.toLocaleString()} rows` : "Local"}</small>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="title-block">
            <p className="eyebrow">{current.eyebrow}</p>
            <h1>{current.label}</h1>
            <span>Clear operational intelligence across stock, usage, movement and value.</span>
          </div>

          <div className="topbar-actions">
            <div className="search-shell">
              <Search size={16} />
              <input
                ref={searchRef}
                aria-label="Global stock search"
                placeholder="Search teams, regions, items…"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
              />
              <kbd>⌘K</kbd>
            </div>

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

            <div className="profile-chip" title="Local enterprise workspace">
              <div className="profile-initials">SC</div>
              <div><strong>Stock Control</strong><span>Private workspace</span></div>
            </div>
          </div>
        </header>

        <div className="period-bar">
          <div className="period-label">
            <span className={`pulse-dot ${loaded ? "online" : ""}`} />
            <div><strong>Reporting window</strong><small>{loaded ? "Live dataset" : "No data loaded"}</small></div>
          </div>

          <div className="period-presets">
            <button onClick={onClearPeriod}>All data</button>
            <button onClick={() => onPresetPeriod("last7")}>Latest 7 days</button>
            <button onClick={() => onPresetPeriod("latestMonth")}>Latest month</button>
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
