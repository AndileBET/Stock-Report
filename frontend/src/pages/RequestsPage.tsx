import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../components/tables/DataTable";
import type { DashboardReports, RequestComparison } from "../types/reports";
import { formatCurrency, formatNumber, formatPercent } from "../utils/formatters";

export function RequestsPage({ reports, query, onQueryChange }: { reports: DashboardReports; query: string; onQueryChange: (query: string) => void }) {
  const needle=query.trim().toLowerCase(); const rows=useMemo(()=>reports.requestComparison.filter(r=>!needle||JSON.stringify(r).toLowerCase().includes(needle)),[reports,needle]);
  const columns=useMemo<ColumnDef<RequestComparison>[]>(()=>[
    {accessorKey:"region",header:"Region"},{accessorKey:"team",header:"Team"},{accessorKey:"item_name",header:"Item"},{accessorKey:"previous_job_reference",header:"Previous ref"},{accessorKey:"current_job_reference",header:"Current ref"},
    {accessorKey:"previous_quantity",header:"Previous used",cell:({row})=>formatNumber(row.original.previous_quantity)}, {accessorKey:"current_quantity",header:"Current used",cell:({row})=>formatNumber(row.original.current_quantity)},
    {accessorKey:"quantity_difference",header:"Qty change",cell:({row})=><span className={row.original.quantity_difference<0?"negative":"positive"}>{formatNumber(row.original.quantity_difference)}</span>},
    {accessorKey:"quantity_percentage_change",header:"Qty %",cell:({row})=>formatPercent(row.original.quantity_percentage_change)},
    {accessorKey:"current_remaining_quantity",header:"Remaining",cell:({row})=>formatNumber(row.original.current_remaining_quantity)},
    {accessorKey:"value_difference",header:"Value change",cell:({row})=>formatCurrency(row.original.value_difference)},],[]);
  return <div className="page-stack"><div className="page-toolbar"><div><span className="eyebrow">Request intelligence</span><h2>Requests & usage changes</h2><p>Compare consecutive Job References and see how consumption moves.</p></div><div className="inline-search"><input value={query} onChange={e=>onQueryChange(e.target.value)} placeholder="Search team, reference or item"/></div></div><section className="panel"><div className="panel-header"><div><h2>Request comparisons</h2><p>{formatNumber(rows.length)} comparisons</p></div></div><DataTable columns={columns} data={rows} emptyMessage="No request comparisons match the current search."/></section></div>
}
