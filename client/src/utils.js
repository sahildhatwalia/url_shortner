export const fmtNumber = (n) => new Intl.NumberFormat('en', { notation: n >= 10000 ? 'compact' : 'standard' }).format(n || 0);

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const fmtShortDay = (iso) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function timeAgo(d) {
  if (!d) return 'Never';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const stripProtocol = (u) => u.replace(/^https?:\/\//, '');

// Converts an ISO date to the value format of <input type="datetime-local">.
export function toLocalInput(d) {
  if (!d) return '';
  const date = new Date(d);
  const off = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - off).toISOString().slice(0, 16);
}

const regionNames = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
export function countryName(code) {
  if (!code || code === 'Unknown') return 'Unknown';
  try {
    return regionNames?.of(code) || code;
  } catch {
    return code;
  }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}
