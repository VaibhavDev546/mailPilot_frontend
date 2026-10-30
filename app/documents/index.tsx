import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { FileText, Trash2, Upload } from 'lucide-react-native';
import { Banner, Button, Card, EmptyState, ErrorState, Loading, Screen, SectionTitle } from '@/components/ui';
import { colors } from '@/constants';
import { useDeleteDocument, useDocuments, useUploadDocument } from '@/hooks/queries';
import { errMsg, formatBytes, formatDate } from '@/utils/format';

export default function Documents() {
  const q = useDocuments();
  const upload = useUploadDocument();
  const del = useDeleteDocument();
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string }>();

  const pick = async () => {
    setMsg(undefined);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.oasis.opendocument.text',
          'application/rtf',
          'text/rtf',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const f = res.assets[0];
      await upload.mutateAsync({ uri: f.uri, name: f.name, mimeType: f.mimeType ?? 'application/octet-stream', size: f.size });
      setMsg({ tone: 'success', text: `${f.name} uploaded.` });
    } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); }
  };
  const remove = (id: string, name: string) => Alert.alert('Delete document?', name, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { setMsg(undefined); try { await del.mutateAsync(id); } catch (e) { setMsg({ tone: 'error', text: errMsg(e) }); } } },
  ]);

  return (
    <Screen onRefresh={() => q.refetch()} refreshing={q.isRefetching}>
      {!!msg && <Banner tone={msg.tone} text={msg.text} />}
      <SectionTitle>Upload</SectionTitle>
      <Card>
        <Button title="Choose file" icon={<Upload size={16} color={colors.text} />} onPress={pick} loading={upload.isPending} />
        <Text style={{ color: colors.faint, fontSize: 12, marginTop: 8 }}>PDF, Word or text. The backend stores the file and its original name.</Text>
      </Card>

      <SectionTitle>Your documents</SectionTitle>
      {q.isLoading ? <Loading /> : q.isError ? <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} /> : (q.data ?? []).length === 0 ? (
        <EmptyState title="No documents yet" text="Upload a resume or cover letter to attach it to campaigns." />
      ) : (
        q.data!.map((d) => (
          <Card key={d.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <FileText size={22} color={colors.accentLight} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{d.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{formatBytes(d.sizeBytes)} · {d.mimeType} · {formatDate(d.createdAt)}</Text>
              </View>
              <Pressable onPress={() => remove(d.id, d.name)} style={{ padding: 8 }} accessibilityLabel="Delete document"><Trash2 size={18} color={colors.error} /></Pressable>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
