import { Activity, AlertTriangle, Coins, Package, PackageMinus, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KpiCard } from "../components/cards/KpiCard";
import { ChartPanel } from "../components/charts/ChartPanel";
import type { DashboardReports } from "../types/reports";
import type { PageId } from "../App";
import { buildOverviewMetrics, buildUsageByRegion, buildVarianceByRegion } from "../utils/dashboardMetrics";
import { formatCurrency, formatNumber } from "../utils/formatters";

export function OverviewPage({ reports, query, onNavigate }: { reports: DashboardReports; query: string; onNavigate: (page: PageId) => void }) {
  const needle = query.trim().toLowerCase();
  const filteredRegions = reports.regionalSummary.filter(r => !needle || r.region.toLowerCase().includes(needle));
  const filteredUsage = reports.itemUsage.filter(r => !needle || [r.region,r.team,r.item_code,r.item_name].join(" ").toLowerCase().includes(needle));
  const filteredVariance = reports.varianceReport.filter(r => !needle || [r.region,r.team,r.item_code,r.item_name].join(" ").toLowerCase().includes(needle));
  const scopedReports = needle ? { ...reports, regionalSummary: filteredRegions, itemUsage: filteredUsage, varianceReport: filteredVariance } : reports;
  const m = buildOverviewMetrics(scopedReports);
  const regions = buildUsageByRegion(filteredRegions).slice(0, 10);
  const variance = buildVarianceByRegion(filteredVariance).slice(0, 10);
  const top = [...filteredUsage].sort((a,b)=>b.used_quantity-a.used_quantity).slice(0, 5);
  const shortageHotspots = [...filteredVariance]
    .filter((row) => row.shortage_quantity > 0)
    .reduce((map, row) => {
      const key = `${row.region}-${row.item_code}`;
      const current = map.get(key);
      if (current) {
        current.shortage_quantity += row.shortage_quantity;
        current.shortage_value += row.shortage_value;
      } else {
        map.set(key, { ...row });
      }
      return map;
    }, new Map<string, (typeof filteredVariance)[number]>())
  ;
  const topShortages = [...shortageHotspots.values()]
    .sort((a,b) => b.shortage_quantity - a.shortage_quantity)
    .slice(0, 3);
  const affectedShortageRegions = new Set(filteredVariance.filter((row) => row.shortage_quantity > 0).map((row) => row.region)).size;
  return <div className="page-stack"><div className="page-toolbar"><div><p className="overview-intro">{needle ? `Showing results for “${query}”` : "A focused view of inventory position, consumption and financial exposure."}</p></div></div>
    <section className="hero-card">
      <div className="hero-copy"><span className="eyebrow glow-text">Real-time stock intelligence</span><h2>Know what moved. Know what matters.</h2><p>One decision layer for stock movement, consumption, shortages and value across every operating region.</p></div>
      <div className="hero-orbit"><div className="orbit-ring ring-a"/><div className="orbit-ring ring-b"/><div className="orbit-core"><strong>{formatNumber(m.totalUsedQuantity)}</strong><span>units used</span></div></div>
    </section>
    <section className="kpi-grid">
      <KpiCard icon={TrendingUp} label="Net movement" value={formatNumber(m.totalMovementInQuantity - m.totalMovementOutQuantity)} detail={`In ${formatNumber(m.totalMovementInQuantity)} · Out ${formatNumber(m.totalMovementOutQuantity)}`} tone={(m.totalMovementInQuantity - m.totalMovementOutQuantity) < 0 ? "warn" : "good"} onClick={() => onNavigate("items")} />
      <KpiCard icon={Package} label="Expected stock" value={formatNumber(m.totalExpectedQuantity)} detail="Available before usage" onClick={() => onNavigate("items")} />
      <KpiCard icon={PackageMinus} label="Used stock" value={formatNumber(m.totalUsedQuantity)} detail="Consumption in selected period" onClick={() => onNavigate("items")} />
      <KpiCard icon={Coins} label="Usage value" value={formatCurrency(m.totalUsageValue)} detail="Monetary consumption" onClick={() => onNavigate("items")} />
      <KpiCard icon={Activity} label="Closing position" value={formatNumber(m.totalClosingQuantity)} detail="Signed current balance" tone={m.totalClosingQuantity < 0 ? "bad" : "good"} onClick={() => onNavigate("items")} />
      <article className={`kpi-card shortage-card kpi-card-clickable ${m.totalShortageQuantity > 0 ? "tone-bad" : "tone-good"}`} onClick={() => onNavigate("variance")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigate("variance"); } }} role="button" tabIndex={0}>
        <div className="kpi-noise" />
        <div className="kpi-topline">
          <div className="kpi-icon"><AlertTriangle size={18} /></div>
          <span className="shortage-count">{affectedShortageRegions ? `${affectedShortageRegions} regions affected` : "Clear"}</span>
        </div>
        <div className="kpi-copy shortage-copy">
          <span>Shortage hotspots</span>
          <strong>{formatNumber(m.totalShortageQuantity)}</strong>
          <small>{m.totalShortageQuantity > 0 ? "Units below position across affected regions" : "No shortage recorded"}</small>
        </div>
        <div className="shortage-hotspot-list">
          {topShortages.map((row) => (
            <div className="shortage-hotspot" key={`${row.region}-${row.team}-${row.item_code}`}>
              <div className="shortage-hotspot-copy">
                <strong>{row.item_name}</strong>
                <span>{row.region} · {row.team}</span>
              </div>
              <b>{formatNumber(row.shortage_quantity)}</b>
            </div>
          ))}
          {!topShortages.length ? <div className="shortage-clear">No shortage hotspots in this period</div> : null}
        </div>
        <span className="kpi-drilldown">Investigate shortages <span aria-hidden="true">→</span></span>
        <div className="kpi-accent-line" />
      </article>
    </section>
    <section className="chart-grid two-one">
      <ChartPanel title="Usage value by region" subtitle="Where the money is being consumed" onClick={() => onNavigate("regions")}><ResponsiveContainer width="100%" height={310}><BarChart data={regions} margin={{top:8,right:8,left:0,bottom:4}}><CartesianGrid stroke="rgba(16,30,26,.08)" vertical={false}/><XAxis dataKey="region" stroke="#6b7973"/><YAxis stroke="#6b7973"/><Tooltip contentStyle={{background:"#101714",border:"1px solid #25332e",borderRadius:14,color:"#f7faf7"}} formatter={(v)=>formatCurrency(Number(v))}/><Bar dataKey="usage_value" name="Usage value" fill="#1f765f" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer></ChartPanel>
      <ChartPanel title="Variance by region" subtitle="Signed remaining position" onClick={() => onNavigate("variance")}><ResponsiveContainer width="100%" height={310}><LineChart data={variance}><CartesianGrid stroke="rgba(16,30,26,.08)" vertical={false}/><XAxis dataKey="region" stroke="#6b7973"/><YAxis stroke="#6b7973"/><Tooltip contentStyle={{background:"#101714",border:"1px solid #25332e",borderRadius:14,color:"#f7faf7"}} formatter={(v)=>formatNumber(Number(v))}/><Line type="monotone" dataKey="variance_quantity" stroke="#63d4b2" strokeWidth={3} dot={{r:4,fill:"#f8fbf7",stroke:"#63d4b2",strokeWidth:2}} activeDot={{r:6}}/></LineChart></ResponsiveContainer></ChartPanel>
    </section>
    <section className="panel split-panel"><button type="button" className="overview-drill-panel overview-drill-panel-clickable" onClick={() => onNavigate("items")}><div className="panel-header"><div><h2>Top consumption signals</h2><p>Items driving the largest unit usage</p></div><span className="panel-drilldown">View item usage →</span></div><div className="signal-list">{top.map((item, idx)=><div className="signal-row" key={`${item.region}-${item.team}-${item.item_code}`}><span className="rank">0{idx+1}</span><div className="signal-name"><strong>{item.item_name}</strong><span>{item.region} · {item.team}</span></div><div className="signal-value"><strong>{formatNumber(item.used_quantity)}</strong><span>units</span></div><div className="spark-bar"><span style={{width:`${top[0]?.used_quantity ? Math.max(8,(item.used_quantity/top[0].used_quantity)*100) : 8}%`}}/></div></div>)}</div></button><button type="button" className="focus-card focus-card-clickable" onClick={() => onNavigate("summary")}><span className="mini-label">Executive focus</span><div className="focus-card-heading"><h3>{m.totalShortageQuantity > 0 ? "Shortage exposure detected" : "Stock position is positive"}</h3><span className="panel-drilldown">Open report →</span></div><p>{m.totalShortageQuantity > 0 ? `${formatNumber(m.totalShortageQuantity)} units are currently below calculated stock position.` : "No negative closing balance is currently present in the selected dataset."}</p><div className="focus-metrics"><div><span>Regions</span><strong>{m.totalRegions}</strong></div><div><span>Teams</span><strong>{m.totalTeams}</strong></div><div><span>Usage</span><strong>{formatCurrency(m.totalUsageValue)}</strong></div></div></button></section>
  </div>
}
