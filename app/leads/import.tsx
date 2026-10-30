import React, { useState } from 'react';
import { Text } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Banner, Button, Card, Screen, SectionTitle } from '@/components/ui';
import { colors } from '@/constants';
import { useExportLeads, useImportLeads, useLeads } from '@/hooks/queries';
import type { LeadInput } from '@/repositories/types';
import { csvToLeads } from '@/utils/csv';
import { errMsg } from '@/utils/format';

export default function ImportExport() {
  const leads = useLeads();
  const importer = useImportLeads();
  const exporter = useExportLeads();
  const [parsed, setParsed] = useState<{ file: string; leads: LeadInput[]; errors: string[] }>();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string }>();

  const pick = async () => {
    setMsg(undefined); setParsed(undefined);
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (res.canceled) return;
      const f = res.assets[0];
      const text = await FileSystem.readAsStringAsync(f.uri);
      setParsed({ file: f.name, ...csvToLeads(text) });
    } catch (e) { setMsg({ tone: 'error', text: `Could not read the file. ${errMsg(e)}` }); }
  };

  const runImport = async () => {
    if (!parsed) return;
    try {
      const r = await importer.mutateAsync(parsed.leads);
      setMsg({ tone: 'success', text: `Imported ${r.created} lead(s). Skipped ${r.skipped} with an existing email.` });
      setParsed(undefined);
    } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  };

  const exportCsv = async () => {
    setMsg(undefined);
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      const path = `${FileSystem.cacheDirectory}mailpilot-leads.csv`;
      const csv = await exporter.mutateAsync();
      await FileSystem.writeAsStringAsync(path, csv);
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export leads' });
    } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  };

  return (
    <Screen>
      {!!msg && <Banner tone={msg.tone} text={msg.text} />}
      <SectionTitle>Import from CSV</SectionTitle>
      <Card>
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>
          First row must be headers. Required columns: name, email, company. Optional: website, jobTitle, jobUrl, linkedin, status, notes, nextFollowUp (YYYY-MM-DD). Existing emails are skipped.
        </Text>
        <Button title="Choose CSV file" variant="secondary" onPress={pick} />
        {!!parsed && (
          <>
            <Text style={{ color: colors.text, marginTop: 14, fontWeight: '600' }}>{parsed.file}</Text>
            <Text style={{ color: colors.success, marginTop: 4 }}>{parsed.leads.length} valid row(s)</Text>
            {parsed.errors.length > 0 && (
              <Text style={{ color: colors.warning, marginTop: 4, fontSize: 13 }}>
                {parsed.errors.length} row(s) skipped:{'\n'}{parsed.errors.slice(0, 8).join('\n')}{parsed.errors.length > 8 ? '\n…' : ''}
              </Text>
            )}
            <Button title={`Import ${parsed.leads.length} lead(s)`} onPress={runImport} disabled={parsed.leads.length === 0} loading={importer.isPending} style={{ marginTop: 14 }} />
          </>
        )}
      </Card>
      <SectionTitle>Export</SectionTitle>
      <Card>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 12 }}>{leads.data ? `${leads.data.length} lead(s) will be exported as CSV.` : 'Loading leads…'}</Text>
        <Button title="Export leads" variant="secondary" onPress={exportCsv} disabled={!leads.data || leads.data.length === 0} />
      </Card>
    </Screen>
  );
}
