import { useState } from 'react';
import { api } from '../api.js';
import { copyText } from '../utils.js';

export default function CreateLink({ onCreated }) {
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [title, setTitle] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setCreated(null);
    setBusy(true);
    try {
      const link = await api.post('/links', {
        url,
        alias: alias || undefined,
        title: title || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      setCreated(link);
      setUrl('');
      setAlias('');
      setTitle('');
      setExpiresAt('');
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (await copyText(created.shortUrl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  const host = (import.meta.env.VITE_SHORT_HOST || 'localhost:5000') + '/';

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-main">
        <input
          className="composer-url"
          type="text"
          inputMode="url"
          placeholder="Paste a long URL, like https://example.com/a-very-long-page"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label="Long URL"
          required
        />
        <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Shortening…' : 'Shorten link'}</button>
      </div>
      <div className="composer-opts">
        <label className="opt">
          <span>Custom alias</span>
          <div className="prefixed">
            <span className="prefix mono">{host}</span>
            <input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="optional" maxLength={30} pattern="[A-Za-z0-9_\-]{3,30}" title="3-30 letters, numbers, hyphens or underscores" />
          </div>
        </label>
        <label className="opt">
          <span>Name</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="optional" maxLength={80} />
        </label>
        <label className="opt">
          <span>Expires</span>
          <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </label>
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
      {created && (
        <div className="success" role="status">
          <span>Link created</span>
          <a className="mono" href={created.shortUrl} target="_blank" rel="noreferrer">{created.shortUrl.replace(/^https?:\/\//, '')}</a>
          <button type="button" className="btn btn-sm" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
      )}
    </form>
  );
}
