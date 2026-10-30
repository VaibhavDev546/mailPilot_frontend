export const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatBytes(n?: number) {
  if (n == null) return 'Unknown size';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export function toInput(iso: string, withTime: boolean) {
  const d = new Date(iso);
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return withTime ? `${base} ${pad(d.getHours())}:${pad(d.getMinutes())}` : base;
}

/** Parses "YYYY-MM-DD" (defaults to 09:00) or "YYYY-MM-DD HH:mm" in local time. */
export function fromInput(text: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/.exec(text.trim());
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const h = m[4] !== undefined ? +m[4] : 9;
  const mi = m[5] !== undefined ? +m[5] : 0;
  const dt = new Date(y, mo - 1, d, h, mi);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d || h > 23 || mi > 59) return null;
  return dt;
}

export function inDays(n: number, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export const isDueByToday = (iso?: string | null) => !!iso && new Date(iso).getTime() <= endOfToday().getTime();
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
