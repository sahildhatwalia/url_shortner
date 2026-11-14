import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function QRModal({ link, onClose }) {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/links/${link.id}/qr`).then((d) => setDataUrl(d.dataUrl)).catch((e) => setError(e.message));
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [link.id, onClose]);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="QR code" onClick={(e) => e.stopPropagation()}>
        <h3>QR code</h3>
        <p className="mono small">{link.shortUrl.replace(/^https?:\/\//, '')}</p>
        {error && <div className="alert">{error}</div>}
        {dataUrl ? <img src={dataUrl} alt={`QR code for ${link.shortUrl}`} width="240" height="240" /> : !error && <div className="qr-skel" />}
        <div className="row">
          {dataUrl && (
            <a className="btn btn-primary" href={dataUrl} download={`linkly-${link.code}.png`}>Download PNG</a>
          )}
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
