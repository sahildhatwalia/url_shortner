import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { ClicksChart, Donut, BarList } from '../components/Charts.jsx';
import QRModal from '../components/QRModal.jsx';
import { copyText, countryName, fmtDate, fmtNumber, stripProtocol, timeAgo, toLocalInput } from '../utils.js';

export default function LinkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [link, setLink] = useState(null);
  const [stats, setStats] = useState(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [edit, setEdit] = useState({ url: '', expiresAt: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadLink = useCallback(async () => {
    try {
      const l = await api.get(`/links/${id}`);
      setLink(l);
      setEdit({ url: l.originalUrl, expiresAt: toLocalInput(l.expiresAt) });
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => { loadLink(); }, [loadLink]);

  useEffect(() => {
    api.get(`/links/${id}/analytics?days=${days}`).then(setStats).catch((e) => setError(e.message));
  }, [id, days]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const body = { url: edit.url, expiresAt: edit.expiresAt ? new Date(edit.expiresAt).toISOString() : null };
      const l = await api.patch(`/links/${id}`, body);
      setLink(l);
      setEdit({ url: l.originalUrl, expiresAt: toLocalInput(l.expiresAt) });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle() {
    try {
      setLink(await api.patch(`/links/${id}`, { isActive: !link.isActive }));
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this link and all of its click history?')) return;
    try {
      await api.del(`/links/${id}`);
      navigate('/');
    } catch (e) {
      setError(e.message);
    }
  }

  if (error && !link) {
    return (
      <div className="empty">
        <strong>{error}</strong>
        <Link to="/" className="btn">Back to your links</Link>
      </div>
    );
  }
  if (!link) return <p className="empty-note">Loading…</p>;

  return (
    <>
      <Link to="/" className="back">Your links</Link>

      <section className="detail-head">
        <div>
          <h1 className="mono detail-short">{stripProtocol(link.shortUrl)}</h1>
          <p className="detail-dest" title={link.originalUrl}>
            {link.title && <strong>{link.title}. </strong>}Redirects to {stripProtocol(link.originalUrl)}
          </p>
        </div>
        <div className="detail-actions">
          <span className={`chip chip-${link.status}`}>{link.status}</span>
          <button className="btn" onClick={async () => { if (await copyText(link.shortUrl)) { setCopied(true); setTimeout(() => setCopied(false), 1400); } }}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button className="btn" onClick={() => setShowQr(true)}>QR code</button>
        </div>
      </section>

      {error && <div className="alert" role="alert">{error}</div>}

      <section className="panel">
        <div className="panel-head">
          <h2>Clicks</h2>
          <div className="seg" role="group" aria-label="Date range">
            {[7, 30, 90].map((d) => (
              <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{d} days</button>
            ))}
          </div>
        </div>
        <div className="stats">
          <div className="stat"><div className="stat-value">{fmtNumber(stats?.total)}</div><div className="stat-label">Clicks, last {days} days</div></div>
          <div className="stat"><div className="stat-value">{fmtNumber(stats?.unique)}</div><div className="stat-label">Unique visitors</div></div>
          <div className="stat"><div className="stat-value">{fmtNumber(link.clicks)}</div><div className="stat-label">Clicks, all time</div></div>
          <div className="stat"><div className="stat-value small">{timeAgo(link.lastClickedAt)}</div><div className="stat-label">Last click</div></div>
        </div>
        <ClicksChart data={stats?.byDay || []} />
      </section>

      <div className="grid">
        <section className="panel"><h2>Devices</h2><Donut items={stats?.devices || []} /></section>
        <section className="panel"><h2>Countries</h2><BarList items={stats?.countries || []} format={countryName} /></section>
        <section className="panel"><h2>Referrers</h2><BarList items={stats?.referrers || []} /></section>
        <section className="panel"><h2>Browsers</h2><BarList items={stats?.browsers || []} /></section>
        <section className="panel"><h2>Operating systems</h2><BarList items={stats?.os || []} /></section>

        <section className="panel">
          <h2>Settings</h2>
          <form className="settings" onSubmit={save}>
            <label>
              Destination URL
              <input value={edit.url} onChange={(e) => setEdit({ ...edit, url: e.target.value })} required />
            </label>
            <label>
              Expires
              <input type="datetime-local" value={edit.expiresAt} onChange={(e) => setEdit({ ...edit, expiresAt: e.target.value })} />
              <small>{link.expiresAt ? `Currently set to ${fmtDate(link.expiresAt)}. Clear the field to remove it.` : 'Never expires'}</small>
            </label>
            <div className="row">
              <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}</button>
              <button type="button" className="btn" onClick={toggle}>{link.isActive ? 'Disable link' : 'Enable link'}</button>
              <button type="button" className="btn btn-danger" onClick={remove}>Delete</button>
            </div>
            <small>Created {fmtDate(link.createdAt)}</small>
          </form>
        </section>
      </div>

      {showQr && <QRModal link={link} onClose={() => setShowQr(false)} />}
    </>
  );
}
