import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartPanel } from "../components/charts/ChartPanel";
import { DataTable } from "../components/tables/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import type { DashboardReports, ItemUsage } from "../types/reports";
import { buildItemRegionMatrix } from "../utils/dashboardMetrics";
import { formatCurrency, formatNumber } from "../utils/formatters";

export function ItemUsagePage({ reports, query, onQueryChange }: { reports: DashboardReports; query: string; onQueryChange: (query: string) => void }) {
  const needle=query.trim().toLowerCase();
  const rows=useMemo(()=>reports.itemUsage.filter(r=>!needle || [r.region,r.team,r.item_code,r.item_name].join(" ").toLowerCase().includes(needle)),[reports,needle]);
  const matrix=buildItemRegionMatrix(rows);
  const columns=useMemo<ColumnDef<ItemUsage>[]>(()=>[
    {accessorKey:"region",header:"Region"},{accessorKey:"team",header:"Team"},{accessorKey:"item_code",header:"Code"},{accessorKey:"item_name",header:"Item"},
    {accessorKey:"used_quantity",header:"Units used",cell:({row})=>formatNumber(row.original.used_quantity)},
    {accessorKey:"usage_value",header:"Usage value",cell:({row})=>formatCurrency(row.original.usage_value)},
    {accessorKey:"request_count",header:"Requests",cell:({row})=>formatNumber(row.original.request_count)},
  ],[]);
  return <div className="page-stack"><div className="page-toolbar"><div><span className="eyebrow">Usage intelligence</span><h2>Item usage</h2><p>See what is being consumed, where it is moving and which regions are driving demand.</p></div><div className="inline-search"><input value={query} onChange={e=>onQueryChange(e.target.value)} placeholder="Search team, region, code or item"/></div></div><ChartPanel title="Products by region" subtitle="Regional consumption is stacked into each product bar"><ResponsiveContainer width="100%" height={360}><BarChart data={matrix.data} margin={{top:12,right:8,left:0,bottom:50}}><CartesianGrid stroke="rgba(16,30,26,.08)" vertical={false}/><XAxis dataKey="item" angle={-30} textAnchor="end" interval={0} height={70} stroke="#6b7973"/><YAxis stroke="#6b7973"/><Tooltip contentStyle={{background:"#101714",border:"1px solid #25332e",borderRadius:14,color:"#f7faf7"}} formatter={(v)=>formatNumber(Number(v))}/><Legend/><>{matrix.regions.map((region,index)=><Bar key={region} dataKey={region} stackId="usage" fill={index===0?"#153f34":index===1?"#24705b":index===2?"#3fa78b":index===3?"#69cfb1":index===4?"#7b8ff5":"#d7b865"} radius={index===matrix.regions.length-1?[6,6,0,0]:[0,0,0,0]}/>)}</></BarChart></ResponsiveContainer></ChartPanel><section className="panel"><div className="panel-header"><div><h2>Usage records</h2><p>{formatNumber(rows.length)} region/team/item records</p></div></div><DataTable columns={columns} data={rows} emptyMessage="No usage records match the current search."/></section></div>
}
