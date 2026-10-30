import React from 'react';
import { Text, View } from 'react-native';
import { Calendar } from 'lucide-react-native';
import type { Lead } from '@/types';
import { colors, leadStatusColor } from '@/constants';
import { Badge, Card } from './ui';
import { formatDate, isDueByToday } from '@/utils/format';

export function LeadCard({ lead, onPress }: { lead: Lead; onPress: () => void }) {
  const due = isDueByToday(lead.nextFollowUpAt);
  return (
    <Card onPress={onPress}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>{lead.recruiterName}</Text>
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
            {lead.companyName}{lead.jobTitle ? `  ·  ${lead.jobTitle}` : ''}
          </Text>
          <Text style={{ color: colors.faint, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{lead.email}</Text>
        </View>
        <Badge label={lead.status} color={leadStatusColor[lead.status]} />
      </View>
      {!!lead.nextFollowUpAt && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
          <Calendar size={14} color={due ? colors.warning : colors.muted} />
          <Text style={{ color: due ? colors.warning : colors.muted, fontSize: 12 }}>Follow up {formatDate(lead.nextFollowUpAt)}</Text>
        </View>
      )}
    </Card>
  );
}
