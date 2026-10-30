import type { Lead, LeadStatus } from '@/types';
import type { LeadInput } from '@/repositories/types';
import { LEAD_STATUSES } from '@/constants';
import { fromInput, isEmail } from './format';

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = ''; rows.push(row); row = [];
    } else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const ALIASES: Record<string, keyof LeadInput> = {
  name: 'recruiterName', recruitername: 'recruiterName', contact: 'recruiterName', contactname: 'recruiterName',
  email: 'email', emailaddress: 'email',
  company: 'companyName', companyname: 'companyName',
  website: 'companyWebsite', companywebsite: 'companyWebsite',
  jobtitle: 'jobTitle', title: 'jobTitle',
  joburl: 'jobUrl', jobposting: 'jobUrl',
  linkedin: 'linkedinUrl', linkedinurl: 'linkedinUrl',
  notes: 'notes', status: 'status',
  lastcontacted: 'lastContactedAt', lastcontactedat: 'lastContactedAt',
  nextfollowup: 'nextFollowUpAt', nextfollowupat: 'nextFollowUpAt',
};

export function csvToLeads(text: string): { leads: LeadInput[]; errors: string[] } {
  const rows = parseCsv(text);
  const errors: string[] = [];
  const leads: LeadInput[] = [];
  if (rows.length < 2) return { leads, errors: ['The file needs a header row and at least one data row.'] };
  const map = rows[0].map((h) => ALIASES[h.trim().toLowerCase().replace(/[\s_-]/g, '')]);
  if (!map.includes('email')) return { leads, errors: ['No "email" column found in the header row.'] };
  const seen = new Set<string>();
  rows.slice(1).forEach((r, idx) => {
    const rec: Record<string, string> = {};
    map.forEach((key, i) => { if (key) rec[key] = (r[i] ?? '').trim(); });
    const n = idx + 2;
    if (!rec.email || !isEmail(rec.email)) { errors.push(`Row ${n}: invalid or missing email`); return; }
    if (!rec.recruiterName) { errors.push(`Row ${n}: missing name`); return; }
    if (!rec.companyName) { errors.push(`Row ${n}: missing company`); return; }
    const key = rec.email.toLowerCase();
    if (seen.has(key)) { errors.push(`Row ${n}: duplicate email in file (${rec.email})`); return; }
    seen.add(key);
    const status = LEAD_STATUSES.find((s) => s.toLowerCase() === (rec.status ?? '').toLowerCase()) ?? 'New';
    const toIso = (v?: string) => { const d = v ? fromInput(v) : null; return d ? d.toISOString() : undefined; };
    leads.push({
      recruiterName: rec.recruiterName,
      email: rec.email,
      companyName: rec.companyName,
      companyWebsite: rec.companyWebsite || undefined,
      jobTitle: rec.jobTitle || undefined,
      jobUrl: rec.jobUrl || undefined,
      linkedinUrl: rec.linkedinUrl || undefined,
      notes: rec.notes || undefined,
      status: status as LeadStatus,
      lastContactedAt: toIso(rec.lastContactedAt),
      nextFollowUpAt: toIso(rec.nextFollowUpAt),
    });
  });
  return { leads, errors };
}

const esc = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function leadsToCsv(leads: Lead[]): string {
  const cols: (keyof Lead)[] = ['recruiterName', 'email', 'companyName', 'companyWebsite', 'jobTitle', 'jobUrl', 'linkedinUrl', 'status', 'lastContactedAt', 'nextFollowUpAt', 'notes', 'createdAt'];
  return [cols.join(','), ...leads.map((l) => cols.map((c) => esc(l[c])).join(','))].join('\n');
}
