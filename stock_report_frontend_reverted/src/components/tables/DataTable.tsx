import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, type CSSProperties } from "react";

interface DataTableProps<T> { columns: ColumnDef<T>[]; data: T[]; emptyMessage: string; }

export function DataTable<T>({ columns, data, emptyMessage }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({ data, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  if (!data.length) return <div className="empty-state"><span className="empty-orb" />{emptyMessage}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id}><button className="table-sort" disabled={!header.column.getCanSort()} onClick={header.column.getToggleSortingHandler()}>{flexRender(header.column.columnDef.header, header.getContext())}{{ asc: <ArrowUp size={12} />, desc: <ArrowDown size={12} /> }[header.column.getIsSorted() as string] ?? null}</button></th>)}</tr>)}</thead>
        <tbody>{table.getRowModel().rows.map((row, index) => <tr key={row.id} style={{ "--row-delay": `${Math.min(index, 12) * 24}ms` } as CSSProperties}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
