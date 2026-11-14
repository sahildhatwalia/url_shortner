import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import CreateLink from '../components/CreateLink.jsx';
import QRModal from '../components/QRModal.jsx';
import { ClicksChart } from '../components/Charts.jsx';
import { copyText, fmtDate, fmtNumber, stripProtocol, timeAgo } from '../utils.js';

function Stat({ label, value, note }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}

function StatusChip({ status }) {
  return <span className={`chip chip-${status}`}>{status}</span>;
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [data, setData] = useState({ links: [], total: 0, page: 1, pages: 1 });
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [o, l] = await Promise.all([
        api.get('/links/overview?days=30'),
        api.get(`/links?page=${page}&limit=8&q=${encodeURIComponent(q)}`),
      ]);
      setOverview(o);
      setData(l);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function copy(link) {
    if (await copyText(link.shortUrl)) {
      setCopied(link.id);
      setTimeout(() => setCopied(''), 1400);
    }
  }

  async function toggle(link) {
    try {
      await api.patch(`/links/${link.id}`, { isActive: !link.isActive });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(link) {
    if (!window.confirm(`Delete ${link.shortUrl}? Its click history will be removed too.`)) return;
    try {
      await api.del(`/links/${link.id}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const a = overview?.analytics;

  return (
    <>
      <CreateLink onCreated={() => { setPage(1); load(); }} />

      {error && <div className="alert" role="alert">{error}</div>}

      <section className="panel">
        <div className="stats">
          <Stat label="Links" value={fmtNumber(overview?.totals.links)} note={`${fmtNumber(overview?.totals.activeLinks)} active`} />
          <Stat label="Clicks, last 30 days" value={fmtNumber(a?.total)} />
          <Stat label="Unique visitors, last 30 days" value={fmtNumber(a?.unique)} />
          <Stat label="Clicks, all time" value={fmtNumber(overview?.totals.allTimeClicks)} />
        </div>
        <ClicksChart data={a?.byDay || []} />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Your links</h2>
          <input
            className="search"
            type="search"
            placeholder="Search by alias, URL or name"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            aria-label="Search links"
          />
        </div>

        {loading ? (
          <p className="empty-note">Loading links…</p>
        ) : data.links.length === 0 ? (
          <div className="empty">
            <strong>{q ? 'No links match that search' : 'No links yet'}</strong>
            <span>{q ? 'Try a different alias, URL or name.' : 'Paste a URL above to create your first short link.'}</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Link</th>
                  <th className="num">Clicks</th>
                  <th>Status</th>
                  <th>Last click</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {data.links.map((l) => (
                  <tr key={l.id}>
                    <td className="link-cell">
                      <div className="short-row">
                        <Link to={`/links/${l.id}`} className="short mono">{stripProtocol(l.shortUrl)}</Link>
                        <button className="btn btn-sm" onClick={() => copy(l)}>{copied === l.id ? 'Copied' : 'Copy'}</button>
                      </div>
                      <div className="orig" title={l.originalUrl}>{l.title ? <strong>{l.title}</strong> : null} {stripProtocol(l.originalUrl)}</div>
                    </td>
                    <td className="num">{fmtNumber(l.clicks)}</td>
                    <td>
                      <StatusChip status={l.status} />
                      {l.expiresAt && <div className="sub">{l.status === 'expired' ? 'Expired' : 'Expires'} {fmtDate(l.expiresAt)}</div>}
                    </td>
                    <td className="sub-cell">{timeAgo(l.lastClickedAt)}</td>
                    <td className="actions">
                      <button className="btn btn-sm" onClick={() => setQr(l)}>QR</button>
                      <Link className="btn btn-sm" to={`/links/${l.id}`}>Analytics</Link>
                      <button className="btn btn-sm" onClick={() => toggle(l)}>{l.isActive ? 'Disable' : 'Enable'}</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(l)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.pages > 1 && (
          <div className="pager">
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {data.page} of {data.pages}</span>
            <button className="btn btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </section>

      {qr && <QRModal link={qr} onClose={() => setQr(null)} />}
    </>
  );
}
