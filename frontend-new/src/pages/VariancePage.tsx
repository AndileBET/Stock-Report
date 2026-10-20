import { useMemo } from "react";
import { AlertOctagon, CheckCircle2, ShieldAlert } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ColumnDef } from "@tanstack/react-table";
import { KpiCard } from "../components/cards/KpiCard";
import { ChartPanel } from "../components/charts/ChartPanel";
import { DataTable } from "../components/tables/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import type { DashboardReports, VarianceRecord } from "../types/reports";
import { buildVarianceByRegion, buildVarianceStatusMetrics } from "../utils/dashboardMetrics";
import { formatCurrency, formatNumber, formatPercent } from "../utils/formatters";

export function VariancePage({ reports, query, onQueryChange }: { reports: DashboardReports; query: string; onQueryChange: (query: string) => void }) {
  const needle=query.trim().toLowerCase(); const rows=useMemo(()=>reports.varianceReport.filter(r=>!needle || JSON.stringify(r).toLowerCase().includes(needle)),[reports,needle]);
  const metrics=buildVarianceStatusMetrics(rows); const chart=buildVarianceByRegion(rows);
  const columns=useMemo<ColumnDef<VarianceRecord>[]>(()=>[
    {accessorKey:"region",header:"Region"},{accessorKey:"team",header:"Team"},{accessorKey:"item_code",header:"Code"},{accessorKey:"item_name",header:"Item"},
    {accessorKey:"expected_quantity",header:"Expected",cell:({row})=>formatNumber(row.original.expected_quantity)},
    {accessorKey:"used_quantity",header:"Used",cell:({row})=>formatNumber(row.original.used_quantity)},
    {accessorKey:"remaining_quantity",header:"Remaining",cell:({row})=><span className={row.original.remaining_quantity<0?"negative":""}>{formatNumber(row.original.remaining_quantity)}</span>},
    {accessorKey:"shortage_value",header:"Shortage value",cell:({row})=>formatCurrency(row.original.shortage_value)},
    {accessorKey:"variance_percentage",header:"Position %",cell:({row})=>formatPercent(row.original.variance_percentage)},
    {accessorKey:"variance_status",header:"Status",cell:({row})=><StatusBadge status={row.original.variance_status}/>}],[]);
  return <div className="page-stack"><div className="page-toolbar"><div><span className="eyebrow">Control & risk</span><h2>Variance & risk</h2><p>Surface shortage exposure and signed stock positions before they become operational issues.</p></div><div className="inline-search"><input value={query} onChange={e=>onQueryChange(e.target.value)} placeholder="Search region, team, item or code"/></div></div><section className="kpi-grid three"><KpiCard icon={AlertOctagon} label="Shortages" value={formatNumber(metrics.Shortage??0)} tone={(metrics.Shortage??0)>0?"bad":"good"}/><KpiCard icon={ShieldAlert} label="Remaining" value={formatNumber(metrics.Remaining??0)} tone="default"/><KpiCard icon={CheckCircle2} label="Balanced" value={formatNumber(metrics.Balanced??0)} tone="good"/></section><ChartPanel title="Signed position by region" subtitle="Negative bars indicate calculated shortage exposure"><ResponsiveContainer width="100%" height={320}><BarChart data={chart}><CartesianGrid stroke="rgba(16,30,26,.08)" vertical={false}/><XAxis dataKey="region" stroke="#6b7973"/><YAxis stroke="#6b7973"/><Tooltip contentStyle={{background:"#101714",border:"1px solid #25332e",borderRadius:14,color:"#f7faf7"}} formatter={(v)=>formatNumber(Number(v))}/><Bar dataKey="variance_quantity" name="Signed position" fill="#e56972" radius={[8,8,0,0]}/></BarChart></ResponsiveContainer></ChartPanel><section className="panel"><div className="panel-header"><div><h2>Risk records</h2><p>{formatNumber(rows.length)} item positions</p></div></div><DataTable columns={columns} data={rows} emptyMessage="No variance records match the current search."/></section></div>
}
