import { useMemo } from "react";
import { DataTable } from "../components/tables/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import type { DashboardReports, ItemUsage } from "../types/reports";
import { formatCurrency, formatNumber } from "../utils/formatters";

export function ItemUsagePage({ reports, query, onQueryChange }: { reports: DashboardReports; query: string; onQueryChange: (query: string) => void }) {
  const needle = query.trim().toLowerCase();
  const rows = useMemo(
    () => reports.itemUsage.filter((r) => !needle || [r.region, r.team, r.item_code, r.item_name].join(" ").toLowerCase().includes(needle)),
    [reports, needle],
  );

  const columns = useMemo<ColumnDef<ItemUsage>[]>(() => [
    { accessorKey: "region", header: "Region" },
    { accessorKey: "team", header: "Team" },
    { accessorKey: "item_code", header: "Code" },
    { accessorKey: "item_name", header: "Item" },
    { accessorKey: "used_quantity", header: "Units used", cell: ({ row }) => formatNumber(row.original.used_quantity) },
    { accessorKey: "usage_value", header: "Usage value", cell: ({ row }) => formatCurrency(row.original.usage_value) },
    { accessorKey: "request_count", header: "Requests", cell: ({ row }) => formatNumber(row.original.request_count) },
  ], []);

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <span className="eyebrow">Usage intelligence</span>
          <h2>Item usage</h2>
          <p>See what is being consumed, where it is moving and which regions are driving demand.</p>
        </div>
        <div className="inline-search">
          <input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder="Search team, region, code or item"/>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Usage records</h2>
            <p>{formatNumber(rows.length)} region/team/item records</p>
          </div>
        </div>
        <DataTable columns={columns} data={rows} emptyMessage="No usage records match the current search."/>
      </section>
    </div>
  );
}
