import { useEffect, useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { ErrorState } from "./components/ErrorState";
import { LoadingState } from "./components/LoadingState";
import { loadMeta, loadReports, uploadReportFiles } from "./data/reportLoader";
import { ExecutiveSummaryPage } from "./pages/ExecutiveSummaryPage";
import { ItemUsagePage } from "./pages/ItemUsagePage";
import { OverviewPage } from "./pages/OverviewPage";
import { RegionsPage } from "./pages/RegionsPage";
import { RequestsPage } from "./pages/RequestsPage";
import { VariancePage } from "./pages/VariancePage";
import type { DashboardReports, DatasetMeta } from "./types/reports";

export type PageId = "overview" | "regions" | "items" | "variance" | "requests" | "summary";

export default function App() {
  const [activePage,setActivePage]=useState<PageId>("overview"); const [reports,setReports]=useState<DashboardReports|null>(null); const [meta,setMeta]=useState<DatasetMeta|null>(null); const [error,setError]=useState<string|null>(null); const [notice,setNotice]=useState<string|null>(null); const [noticeKind,setNoticeKind]=useState<"warning"|"success">("success"); const [isUploading,setIsUploading]=useState(false); const [query,setQuery]=useState(""); const [fromDate,setFromDate]=useState(""); const [toDate,setToDate]=useState("");
  useEffect(()=>{Promise.all([loadReports(),loadMeta()]).then(([r,m])=>{setReports(r.reports);setMeta(m);}).catch(e=>setError(e instanceof Error?e.message:"Could not connect to the reporting engine."));},[]);
  async function handleFiles(files: File[]){setIsUploading(true);setError(null);setNotice(null);setNoticeKind("success");try{const result=await uploadReportFiles(files);setReports(result.reports);setMeta(result.meta);setFromDate("");setToDate("");if(result.ingestion.files_skipped.length){setNotice(`Processed ${result.ingestion.files_processed} file(s), skipped ${result.ingestion.files_skipped.length}. ${result.ingestion.files_skipped.join(" | ")}`); setNoticeKind("warning")} else {setNotice(`Loaded ${result.ingestion.transactions.toLocaleString()} clean transactions from ${result.ingestion.files_processed} file(s). Removed ${result.ingestion.duplicates_removed.toLocaleString()} duplicate rows.`); setNoticeKind("success")} setActivePage("overview");}catch(e){setError(e instanceof Error?e.message:"The uploaded files could not be processed.");}finally{setIsUploading(false)}}
  async function applyPeriod(){ try { const result=await loadReports(fromDate,toDate); setReports(result.reports); setMeta(result.meta); setError(null); setNotice(null); } catch(e){ setError(e instanceof Error?e.message:"Could not apply reporting window"); } }
  async function clearPeriod(){ setFromDate(""); setToDate(""); try { const result=await loadReports(); setReports(result.reports); setMeta(result.meta); setError(null); setNotice(null); } catch(e){ setError(e instanceof Error?e.message:"Could not reload dataset"); } }

  async function applyPreset(preset: "last7" | "latestMonth"){ const endDate = meta?.to_date ? new Date(meta.to_date + "T12:00:00") : new Date(); const end = endDate.toISOString().slice(0,10); if(preset === "last7"){ const start = new Date(endDate.getTime()-6*86400000).toISOString().slice(0,10); setFromDate(start); setToDate(end); try { const result = await loadReports(start,end); setReports(result.reports); setMeta(result.meta); setError(null); } catch(e){ setError(e instanceof Error?e.message:"Could not load the latest 7 days"); } } else { const start = new Date(endDate.getFullYear(), endDate.getMonth(), 1).toISOString().slice(0,10); setFromDate(start); setToDate(end); try { const result = await loadReports(start,end); setReports(result.reports); setMeta(result.meta); setError(null); } catch(e){ setError(e instanceof Error?e.message:"Could not load the latest month"); } }}

  function render(){if(!reports)return null; switch(activePage){case"regions":return <RegionsPage reports={reports} query={query} onQueryChange={setQuery}/>;case"items":return <ItemUsagePage reports={reports} query={query} onQueryChange={setQuery}/>;case"variance":return <VariancePage reports={reports} query={query} onQueryChange={setQuery}/>;case"requests":return <RequestsPage reports={reports} query={query} onQueryChange={setQuery}/>;case"summary":return <ExecutiveSummaryPage meta={meta}/>;default:return <OverviewPage reports={reports} query={query}/>}}
  return <AppLayout activePage={activePage} isUploading={isUploading} query={query} onQueryChange={setQuery} onPageChange={setActivePage} onFiles={handleFiles} onGenerateSummary={()=>setActivePage("summary")} meta={meta} fromDate={fromDate} toDate={toDate} onFromDateChange={setFromDate} onToDateChange={setToDate} onApplyPeriod={applyPeriod} onClearPeriod={clearPeriod} onPresetPeriod={applyPreset}>{error?<ErrorState message={error} kind="error"/>:null}{!error&&!notice&&!reports?<LoadingState/>:null}{notice?<ErrorState message={notice} kind={noticeKind}/>:null}{reports?render():null}</AppLayout>;
}
