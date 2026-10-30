import type { Lead, Settings } from '@/types';

export type Vars = Record<string, string>;

export function buildVars(lead?: Lead, settings?: Settings): Vars {
  const full = lead?.recruiterName?.trim() ?? '';
  return {
    name: full,
    firstName: full.split(/\s+/)[0] ?? '',
    email: lead?.email ?? '',
    companyName: lead?.companyName ?? '',
    companyWebsite: lead?.companyWebsite ?? '',
    jobTitle: lead?.jobTitle ?? '',
    jobUrl: lead?.jobUrl ?? '',
    linkedInUrl: lead?.linkedinUrl ?? '',
    senderName: settings?.senderName ?? '',
  };
}

/** Replaces known variables; a variable with no value is left as {{name}} so gaps stay visible. */
export function render(text: string, vars: Vars) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => (vars[k] ? vars[k] : m));
}

export function unresolved(text: string, vars: Vars): string[] {
  const found = new Set<string>();
  text.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => {
    if (!vars[k]) found.add(k);
    return m;
  });
  return [...found];
}
