import { useEffect, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorState } from "./components/ErrorState";
import { LoadingState } from "./components/LoadingState";
import { loadDataQualityIssues, loadMeta, loadReports, uploadReportFiles } from "./data/reportLoader";
import { ExecutiveSummaryPage } from "./pages/ExecutiveSummaryPage";
import { ErrorsPage } from "./pages/ErrorsPage";
import { ItemUsagePage } from "./pages/ItemUsagePage";
import { OverviewPage } from "./pages/OverviewPage";
import { RegionsPage } from "./pages/RegionsPage";
import { RequestsPage } from "./pages/RequestsPage";
import { VariancePage } from "./pages/VariancePage";
import type { DashboardReports, DataQualityIssue, DataQualityResult, DatasetMeta } from "./types/reports";

export type PageId = "overview" | "regions" | "items" | "variance" | "requests" | "errors" | "summary";

export default function App() {
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [reports, setReports] = useState<DashboardReports | null>(null);
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [catalogMeta, setCatalogMeta] = useState<DatasetMeta | null>(null);
  const [quality, setQuality] = useState<DataQualityResult | null>(null);
  const [focusedIssue, setFocusedIssue] = useState<DataQualityIssue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeKind, setNoticeKind] = useState<"warning" | "success">("success");
  const [isUploading, setIsUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    Promise.all([loadReports(), loadMeta(), loadDataQualityIssues()])
      .then(([reportResult, datasetMeta, dataQuality]) => {
        setReports(reportResult.reports);
        setMeta(datasetMeta);
        setCatalogMeta(datasetMeta);
        setQuality(dataQuality);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not connect to the reporting engine."));
  }, []);

  async function handleFiles(files: File[]) {
    setIsUploading(true);
    setError(null);
    setNotice(null);
    setNoticeKind("success");
    try {
      const result = await uploadReportFiles(files);
      const dataQuality = await loadDataQualityIssues();
      setReports(result.reports);
      setMeta(result.meta);
      setCatalogMeta(result.meta);
      setQuality(dataQuality);
      setFocusedIssue(null);
      setFromDate("");
      setToDate("");
      if (result.ingestion.files_skipped.length) {
        setNotice(`Processed ${result.ingestion.files_processed} file(s), skipped ${result.ingestion.files_skipped.length}. ${result.ingestion.files_skipped.join(" | ")}`);
        setNoticeKind("warning");
      } else {
        setNotice(`Loaded ${result.ingestion.transactions.toLocaleString()} clean transactions from ${result.ingestion.files_processed} file(s). Removed ${result.ingestion.duplicates_removed.toLocaleString()} duplicate rows.`);
      }
      setActivePage("overview");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The uploaded files could not be processed.");
    } finally {
      setIsUploading(false);
    }
  }

  async function applyPeriod() {
    try {
      const result = await loadReports(fromDate, toDate);
      setReports(result.reports);
      setMeta(result.meta);
      setError(null);
      setNotice(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not apply reporting window");
    }
  }

  async function clearPeriod() {
    setFromDate("");
    setToDate("");
    try {
      const result = await loadReports();
      setReports(result.reports);
      setMeta(result.meta);
      setError(null);
      setNotice(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not reload dataset");
    }
  }

  async function applyPreset(preset: "last7" | "latestMonth") {
    const endDate = meta?.to_date ? new Date(`${meta.to_date}T12:00:00`) : new Date();
    const end = endDate.toISOString().slice(0, 10);
    const start = preset === "last7"
      ? new Date(endDate.getTime() - 6 * 86400000).toISOString().slice(0, 10)
      : new Date(endDate.getFullYear(), endDate.getMonth(), 1).toISOString().slice(0, 10);
    setFromDate(start);
    setToDate(end);
    try {
      const result = await loadReports(start, end);
      setReports(result.reports);
      setMeta(result.meta);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load the selected period");
    }
  }

  async function openIssue(issue: DataQualityIssue) {
    setFocusedIssue(issue);
    setQuery(issue.team || issue.region);
    setActivePage("regions");
    setFromDate("");
    setToDate("");
    try {
      const result = await loadReports();
      setReports(result.reports);
      setMeta(result.meta);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load the issue location");
    }
  }

  function handlePageChange(page: PageId) {
    if (page !== "regions") {
      setFocusedIssue(null);
      setQuery("");
    }
    setActivePage(page);
  }

  function render() {
    if (!reports) return null;
    switch (activePage) {
      case "regions":
        return <RegionsPage reports={reports} query={query} onQueryChange={setQuery} focusedIssue={focusedIssue} onClearFocus={() => { setFocusedIssue(null); setQuery(""); }} />;
      case "items":
        return <ItemUsagePage reports={reports} query={query} onQueryChange={setQuery} />;
      case "variance":
        return <VariancePage reports={reports} query={query} onQueryChange={setQuery} />;
      case "requests":
        return <RequestsPage reports={reports} query={query} onQueryChange={setQuery} />;
      case "errors":
        return <ErrorsPage issues={quality?.issues ?? []} transactionCount={quality?.transaction_count ?? 0} onOpenIssue={openIssue} />;
      case "summary":
        return <ExecutiveSummaryPage meta={catalogMeta} />;
      default:
        return <OverviewPage reports={reports} query={query} onNavigate={handlePageChange} />;
    }
  }

  return (
    <AppLayout
      activePage={activePage}
      isUploading={isUploading}
      query={query}
      onQueryChange={setQuery}
      onPageChange={handlePageChange}
      onFiles={handleFiles}
      onGenerateSummary={() => handlePageChange("summary")}
      meta={meta}
      fromDate={fromDate}
      toDate={toDate}
      onFromDateChange={setFromDate}
      onToDateChange={setToDate}
      onApplyPeriod={applyPeriod}
      onClearPeriod={clearPeriod}
      onPresetPeriod={applyPreset}
    >
      {error ? <ErrorState message={error} kind="error" /> : null}
      {!error && !notice && !reports ? <LoadingState /> : null}
      {notice ? <ErrorState message={notice} kind={noticeKind} /> : null}
      {reports ? render() : null}
    </AppLayout>
  );
}
