import React, { useMemo } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowUpDown, Search } from 'lucide-react-native';
import { Chip, ChipRow, EmptyState, ErrorState, Fab, Loading, ScreenHeader, st } from '@/components/ui';
import { LeadCard } from '@/components/LeadCard';
import { colors, LEAD_STATUSES } from '@/constants';
import { useLeads } from '@/hooks/queries';
import { useUi } from '@/store/ui';
import { errMsg } from '@/utils/format';

export default function LeadsTab() {
  const router = useRouter();
  const q = useLeads();
  const { leadSearch, leadStatus, setLeadSearch, setLeadStatus } = useUi();

  const data = useMemo(() => {
    const s = leadSearch.trim().toLowerCase();
    return (q.data ?? [])
      .filter((l) => (leadStatus === 'All' || l.status === leadStatus) && (!s || [l.recruiterName, l.email, l.companyName, l.jobTitle ?? ''].some((v) => v.toLowerCase().includes(s))))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [q.data, leadSearch, leadStatus]);

  return (
    <SafeAreaView style={st.screen} edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Leads"
        subtitle={q.data ? `${q.data.length} total` : undefined}
        right={
          <Pressable onPress={() => router.push('/leads/import')} style={{ padding: 8 }} accessibilityLabel="Import or export">
            <ArrowUpDown color={colors.text} size={22} />
          </Pressable>
        }
      />
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 12, marginBottom: 10 }}>
          <Search size={18} color={colors.faint} />
          <TextInput value={leadSearch} onChangeText={setLeadSearch} placeholder="Search name, company, email" placeholderTextColor={colors.faint} style={{ flex: 1, color: colors.text, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15 }} />
        </View>
        <ChipRow>
          {(['All', ...LEAD_STATUSES] as const).map((s) => (
            <Chip key={s} label={s} active={leadStatus === s} onPress={() => setLeadStatus(s)} />
          ))}
        </ChipRow>
      </View>

      {q.isLoading ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          style={{ marginTop: 12 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 90, flexGrow: 1 }}
          data={data}
          keyExtractor={(l) => l.id}
          renderItem={({ item }) => <LeadCard lead={item} onPress={() => router.push(`/leads/${item.id}`)} />}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          ListEmptyComponent={
            (q.data ?? []).length === 0 ? (
              <EmptyState title="No leads yet" text="Add a recruiter or company contact, or import a CSV." actionLabel="Add lead" onAction={() => router.push('/leads/edit')} />
            ) : (
              <EmptyState title="No matches" text="Try a different search or status filter." />
            )
          }
        />
      )}
      <Fab label="Add lead" onPress={() => router.push('/leads/edit')} />
    </SafeAreaView>
  );
}
