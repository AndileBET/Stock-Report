import type { DashboardReports, DataQualityResult, DatasetMeta, ExecutiveSummary, UploadResult } from "../types/reports";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8010";

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function loadReports(fromDate = "", toDate = ""): Promise<{ reports: DashboardReports; meta: DatasetMeta }> {
  const params = new URLSearchParams();
  if (fromDate) params.set("from_date", fromDate);
  if (toDate) params.set("to_date", toDate);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return requestJson(`${API_BASE_URL}/api/reports${suffix}`);
}

export async function loadMeta(): Promise<DatasetMeta> {
  return requestJson(`${API_BASE_URL}/api/meta`);
}

export async function loadDataQualityIssues(): Promise<DataQualityResult> {
  return requestJson(`${API_BASE_URL}/api/errors`);
}

export async function uploadReportFiles(files: File[]): Promise<UploadResult> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file, file.name));
  return requestJson(`${API_BASE_URL}/api/reports/upload`, { method: "POST", body: formData });
}

export async function loadExecutiveSummary(params: {
  scope: "all" | "region" | "team" | "item";
  regions?: string[];
  teams?: string[];
  item_codes?: string[];
  from_date?: string;
  to_date?: string;
}): Promise<ExecutiveSummary> {
  const search = new URLSearchParams({ scope: params.scope });
  params.regions?.filter(Boolean).forEach((value) => search.append("region", value));
  params.teams?.filter(Boolean).forEach((value) => search.append("team", value));
  params.item_codes?.filter(Boolean).forEach((value) => search.append("item_code", value));
  if (params.from_date) search.set("from_date", params.from_date);
  if (params.to_date) search.set("to_date", params.to_date);
  return requestJson(`${API_BASE_URL}/api/reports/summary?${search.toString()}`);
}

export async function downloadExecutiveSummary(params: {
  format: "pdf" | "docx" | "xlsx";
  scope: "all" | "region" | "team" | "item";
  regions?: string[];
  teams?: string[];
  item_codes?: string[];
  from_date?: string;
  to_date?: string;
}): Promise<void> {
  const search = new URLSearchParams({ scope: params.scope });
  params.regions?.filter(Boolean).forEach((value) => search.append("region", value));
  params.teams?.filter(Boolean).forEach((value) => search.append("team", value));
  params.item_codes?.filter(Boolean).forEach((value) => search.append("item_code", value));
  if (params.from_date) search.set("from_date", params.from_date);
  if (params.to_date) search.set("to_date", params.to_date);

  const response = await fetch(`${API_BASE_URL}/api/reports/summary/export/${params.format}?${search.toString()}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `Export failed (${response.status})`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] ?? `stock-executive-report.${params.format}`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
