import { Activity, Boxes, Coins, Package, PackageMinus, Sparkles, Search } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "../components/cards/KpiCard";
import { ChartPanel } from "../components/charts/ChartPanel";
import type { DashboardReports } from "../types/reports";
import { buildOverviewMetrics, buildUsageByRegion, buildVarianceByRegion } from "../utils/dashboardMetrics";
import { formatCurrency, formatNumber } from "../utils/formatters";

export function OverviewPage({ reports, query }: { reports: DashboardReports; query: string }) {
  const needle = query.trim().toLowerCase();
  const filteredRegions = reports.regionalSummary.filter(r => !needle || r.region.toLowerCase().includes(needle));
  const filteredUsage = reports.itemUsage.filter(r => !needle || [r.region,r.team,r.item_code,r.item_name].join(" ").toLowerCase().includes(needle));
  const filteredVariance = reports.varianceReport.filter(r => !needle || [r.region,r.team,r.item_code,r.item_name].join(" ").toLowerCase().includes(needle));
  const scopedReports = needle ? { ...reports, regionalSummary: filteredRegions, itemUsage: filteredUsage, varianceReport: filteredVariance } : reports;
  const m = buildOverviewMetrics(scopedReports);
  const regions = buildUsageByRegion(filteredRegions).slice(0, 10);
  const variance = buildVarianceByRegion(filteredVariance).slice(0, 10);
  const top = [...filteredUsage].sort((a,b)=>b.used_quantity-a.used_quantity).slice(0, 5);
  return <div className="page-stack"><div className="page-toolbar"><div><span className="eyebrow">Operating intelligence</span><h2>Command centre</h2><p>{needle ? `Showing results for “${query}”` : "A focused view of inventory position, consumption and financial exposure."}</p></div><div className="overview-search"><Search size={15}/><span>{needle || "Use the top search to filter the dashboard"}</span></div></div>
    <section className="hero-card">
      <div className="hero-copy"><span className="eyebrow glow-text">Real-time stock intelligence</span><h2>Know what moved. Know what matters.</h2><p>One decision layer for stock movement, consumption, shortages and value across every operating region.</p><div className="hero-tags"><span><Activity size={13}/>Live dataset</span><span><Sparkles size={13}/>Board-ready</span><span><Package size={13}/>Audit logic</span></div></div>
      <div className="hero-orbit"><div className="orbit-ring ring-a"/><div className="orbit-ring ring-b"/><div className="orbit-core"><strong>{formatNumber(m.totalUsedQuantity)}</strong><span>units used</span></div></div>
    </section>
    <section className="kpi-grid">
      <KpiCard icon={Boxes} label="Regions" value={formatNumber(m.totalRegions)} detail="Active operating regions" />
      <KpiCard icon={Package} label="Expected stock" value={formatNumber(m.totalExpectedQuantity)} detail="Available before usage" />
      <KpiCard icon={PackageMinus} label="Used stock" value={formatNumber(m.totalUsedQuantity)} detail="Consumption in selected period" />
      <KpiCard icon={Coins} label="Usage value" value={formatCurrency(m.totalUsageValue)} detail="Monetary consumption" />
      <KpiCard icon={Activity} label="Closing position" value={formatNumber(m.totalClosingQuantity)} detail="Signed current balance" tone={m.totalClosingQuantity < 0 ? "bad" : "good"} />
      <KpiCard icon={PackageMinus} label="Shortage exposure" value={formatNumber(m.totalShortageQuantity)} detail="Units below zero" tone={m.totalShortageQuantity > 0 ? "bad" : "good"} />
    </section>
    <section className="chart-grid two-one">
      <ChartPanel title="Usage value by region" subtitle="Where the money is being consumed"><ResponsiveContainer width="100%" height={310}><BarChart data={regions} margin={{top:8,right:8,left:0,bottom:4}}><CartesianGrid stroke="rgba(16,30,26,.08)" vertical={false}/><XAxis dataKey="region" stroke="#6b7973"/><YAxis stroke="#6b7973"/><Tooltip contentStyle={{background:"#101714",border:"1px solid #25332e",borderRadius:14,color:"#f7faf7"}} formatter={(v)=>formatCurrency(Number(v))}/><Bar dataKey="usage_value" name="Usage value" fill="#1f765f" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer></ChartPanel>
      <ChartPanel title="Variance by region" subtitle="Signed remaining position"><ResponsiveContainer width="100%" height={310}><LineChart data={variance}><CartesianGrid stroke="rgba(16,30,26,.08)" vertical={false}/><XAxis dataKey="region" stroke="#6b7973"/><YAxis stroke="#6b7973"/><Tooltip contentStyle={{background:"#101714",border:"1px solid #25332e",borderRadius:14,color:"#f7faf7"}} formatter={(v)=>formatNumber(Number(v))}/><Line type="monotone" dataKey="variance_quantity" stroke="#63d4b2" strokeWidth={3} dot={{r:4,fill:"#f8fbf7",stroke:"#63d4b2",strokeWidth:2}} activeDot={{r:6}}/></LineChart></ResponsiveContainer></ChartPanel>
    </section>
    <section className="panel split-panel"><div><div className="panel-header"><div><h2>Top consumption signals</h2><p>Items driving the largest unit usage</p></div></div><div className="signal-list">{top.map((item, idx)=><div className="signal-row" key={`${item.region}-${item.team}-${item.item_code}`}><span className="rank">0{idx+1}</span><div className="signal-name"><strong>{item.item_name}</strong><span>{item.region} · {item.team}</span></div><div className="signal-value"><strong>{formatNumber(item.used_quantity)}</strong><span>units</span></div><div className="spark-bar"><span style={{width:`${top[0]?.used_quantity ? Math.max(8,(item.used_quantity/top[0].used_quantity)*100) : 8}%`}}/></div></div>)}</div></div><div className="focus-card"><span className="mini-label">Executive focus</span><h3>{m.totalShortageQuantity > 0 ? "Shortage exposure detected" : "Stock position is positive"}</h3><p>{m.totalShortageQuantity > 0 ? `${formatNumber(m.totalShortageQuantity)} units are currently below calculated stock position.` : "No negative closing balance is currently present in the selected dataset."}</p><div className="focus-metrics"><div><span>Regions</span><strong>{m.totalRegions}</strong></div><div><span>Teams</span><strong>{m.totalTeams}</strong></div><div><span>Usage</span><strong>{formatCurrency(m.totalUsageValue)}</strong></div></div></div></section>
  </div>
}
