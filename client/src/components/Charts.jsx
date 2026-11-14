import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { fmtShortDay, fmtNumber } from '../utils.js';

export const PALETTE = ['#2447F5', '#12A594', '#F5A524', '#7C5CFC', '#E5484D', '#8B98A9'];

export function ClicksChart({ data }) {
  const empty = data.every((d) => d.clicks === 0);
  return (
    <div className="chart" role="img" aria-label="Clicks per day">
      {empty && <div className="chart-empty">No clicks in this period yet</div>}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2447F5" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#2447F5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E3E8EE" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtShortDay} tick={{ fontSize: 12, fill: '#5B6B80' }} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#5B6B80' }} tickLine={false} axisLine={false} />
          <Tooltip
            labelFormatter={fmtShortDay}
            formatter={(v) => [fmtNumber(v), 'Clicks']}
            contentStyle={{ borderRadius: 10, border: '1px solid #D9DFE7', boxShadow: 'none', fontSize: 13 }}
          />
          <Area type="monotone" dataKey="clicks" stroke="#2447F5" strokeWidth={2} fill="url(#fillClicks)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ items }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (!total) return <p className="empty-note">No data yet</p>;
  return (
    <div className="donut">
      <div className="donut-ring" role="img" aria-label="Device split">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={items} dataKey="count" nameKey="label" innerRadius="62%" outerRadius="95%" paddingAngle={2} stroke="none">
              {items.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [fmtNumber(v), n]} contentStyle={{ borderRadius: 10, border: '1px solid #D9DFE7', boxShadow: 'none', fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="legend">
        {items.map((it, i) => (
          <li key={it.label}>
            <span className="dot" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="cap">{it.label}</span>
            <span className="pct">{Math.round((it.count / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarList({ items, format = (x) => x }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.length) return <p className="empty-note">No data yet</p>;
  return (
    <ul className="barlist">
      {items.map((it) => (
        <li key={it.label}>
          <div className="bar-fill" style={{ width: `${(it.count / max) * 100}%` }} />
          <span className="bar-label">{format(it.label)}</span>
          <span className="bar-count">{fmtNumber(it.count)}</span>
        </li>
      ))}
    </ul>
  );
}
