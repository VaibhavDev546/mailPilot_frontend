import React, { ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleProp,
  StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import type { UseQueryResult } from '@tanstack/react-query';
import { AlertTriangle, Inbox, Plus } from 'lucide-react-native';
import { colors, DATA_SOURCE } from '@/constants';
import { errMsg, fromInput, inDays, toInput } from '@/utils/format';

export function Screen({
  children, scroll = true, edges = ['left', 'right', 'bottom'], onRefresh, refreshing = false, contentStyle,
}: {
  children: ReactNode; scroll?: boolean; edges?: Edge[]; onRefresh?: () => void; refreshing?: boolean; contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={st.screen} edges={edges}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[st.content, contentStyle]}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} /> : undefined}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={st.header}>
      <View style={{ flex: 1 }}>
        <Text style={st.h1}>{title}</Text>
        {!!subtitle && <Text style={st.sub}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [st.card, style, pressed && { opacity: 0.75 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[st.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={st.sectionRow}>
      <Text style={st.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

type BtnProps = {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean; disabled?: boolean; icon?: ReactNode; small?: boolean; style?: StyleProp<ViewStyle>;
};
export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, small, style }: BtnProps) {
  const bg = { primary: colors.accent, secondary: colors.cardAlt, danger: colors.errorBg, ghost: 'transparent' }[variant];
  const fg = variant === 'danger' ? colors.error : variant === 'ghost' ? colors.accentLight : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [st.btn, small && st.btnSmall, { backgroundColor: bg }, (disabled || loading) && { opacity: 0.5 }, pressed && { opacity: 0.8 }, style]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : icon}
      <Text style={[st.btnText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[st.badge, { backgroundColor: color + '26', borderColor: color + '66' }]}>
      <Text style={[st.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress, color }: { label: string; active?: boolean; onPress: () => void; color?: string }) {
  const c = color ?? colors.accent;
  return (
    <Pressable onPress={onPress} style={[st.chip, active && { backgroundColor: c + '33', borderColor: c }]}>
      <Text style={[st.chipText, active && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Input({ label, error, style, multiline, ...rest }: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {!!label && <Text style={st.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.faint}
        multiline={multiline}
        style={[st.input, multiline && { minHeight: 120, textAlignVertical: 'top' }, !!error && { borderColor: colors.error }, style]}
        {...rest}
      />
      {!!error && <Text style={st.err}>{error}</Text>}
    </View>
  );
}

type FormInputProps<T extends FieldValues> = { control: Control<T>; name: Path<T>; label: string; error?: string } & Omit<TextInputProps, 'value' | 'onChangeText'>;
export function FormInput<T extends FieldValues>({ control, name, label, error, ...rest }: FormInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur } }) => (
        <Input label={label} error={error} value={(value as string) ?? ''} onChangeText={onChange} onBlur={onBlur} {...rest} />
      )}
    />
  );
}

/** Text date input (YYYY-MM-DD or YYYY-MM-DD HH:mm) with quick-pick chips. No native picker dependency. */
export function DateField({ label, value, onChange, withTime = false, error }: { label: string; value: string; onChange: (iso: string) => void; withTime?: boolean; error?: string }) {
  const [text, setText] = useState(value ? toInput(value, withTime) : '');
  useEffect(() => {
    const cur = fromInput(text);
    if ((cur ? cur.toISOString() : '') !== (value ?? '')) setText(value ? toInput(value, withTime) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const invalid = text.trim() !== '' && !fromInput(text);
  const change = (t: string) => {
    setText(t);
    const d = fromInput(t);
    onChange(d ? d.toISOString() : '');
  };
  const pick = (n: number) => change(toInput(inDays(n).toISOString(), withTime));
  return (
    <View style={{ marginBottom: 14 }}>
      <Input
        label={label}
        value={text}
        onChangeText={change}
        placeholder={withTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        error={error ?? (invalid ? `Use ${withTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'}` : undefined)}
        style={{ marginBottom: 0 }}
      />
      <View style={{ marginTop: 8 }}>
        <ChipRow>
          <Chip label="Tomorrow" onPress={() => pick(1)} />
          <Chip label="+3 days" onPress={() => pick(3)} />
          <Chip label="+1 week" onPress={() => pick(7)} />
          <Chip label="Clear" onPress={() => change('')} />
        </ChipRow>
      </View>
    </View>
  );
}

export function ListRow({ title, subtitle, right, onPress, bold }: { title: string; subtitle?: string; right?: ReactNode; onPress?: () => void; bold?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [st.row, pressed && { opacity: 0.7 }]}>
      <View style={{ flex: 1 }}>
        <Text style={[st.rowTitle, bold && { fontWeight: '700' }]} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={st.rowSub} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

export function KeyValue({ k, v }: { k: string; v?: string | null }) {
  return (
    <View style={st.kv}>
      <Text style={st.kvK}>{k}</Text>
      <Text style={st.kvV} selectable>{v || '—'}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={st.center}>
      <ActivityIndicator color={colors.accent} />
      {!!label && <Text style={[st.sub, { marginTop: 10 }]}>{label}</Text>}
    </View>
  );
}

export function EmptyState({ title, text, actionLabel, onAction }: { title: string; text?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={st.center}>
      <Inbox color={colors.faint} size={34} />
      <Text style={[st.rowTitle, { marginTop: 12, textAlign: 'center' }]}>{title}</Text>
      {!!text && <Text style={[st.sub, { textAlign: 'center', marginTop: 4 }]}>{text}</Text>}
      {!!actionLabel && !!onAction && <Button title={actionLabel} onPress={onAction} small style={{ marginTop: 16 }} />}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={st.center}>
      <AlertTriangle color={colors.error} size={32} />
      <Text style={[st.rowTitle, { marginTop: 12 }]}>Request failed</Text>
      <Text style={[st.sub, { textAlign: 'center', marginTop: 4 }]}>{message}</Text>
      {!!onRetry && <Button title="Try again" variant="secondary" onPress={onRetry} small style={{ marginTop: 16 }} />}
    </View>
  );
}

export function Banner({ text, tone = 'warning' }: { text: string; tone?: 'warning' | 'error' | 'success' | 'info' }) {
  const c = { warning: colors.warning, error: colors.error, success: colors.success, info: colors.accentLight }[tone];
  const bg = { warning: colors.warningBg, error: colors.errorBg, success: colors.successBg, info: colors.accentBg }[tone];
  return (
    <View style={[st.banner, { backgroundColor: bg, borderColor: c + '66' }]}>
      <Text style={{ color: c, fontSize: 13, lineHeight: 18 }}>{text}</Text>
    </View>
  );
}

export function MockBanner() {
  if (DATA_SOURCE !== 'mock') return null;
  return <Banner tone="info" text="Mock mode: data lives in memory only, is not sent anywhere, and resets when the app restarts. Set EXPO_PUBLIC_DATA_SOURCE=api to use the backend." />;
}

/** Renders loading / error states for a query, then children with the data. */
export function Async<T>({ q, children }: { q: UseQueryResult<T>; children: (data: T) => ReactNode }) {
  if (q.isLoading) return <Loading />;
  if (q.isError) return <ErrorState message={errMsg(q.error)} onRetry={() => q.refetch()} />;
  if (q.data === undefined) return null;
  return <>{children(q.data)}</>;
}

export function Fab({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} style={({ pressed }) => [st.fab, pressed && { opacity: 0.85 }]}>
      <Plus color="#fff" size={26} />
    </Pressable>
  );
}

export function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <View style={st.stat}>
      <Text style={[st.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

export const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  h1: { color: colors.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  sub: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 10 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, minHeight: 46 },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 36, borderRadius: 10 },
  btnText: { fontSize: 15, fontWeight: '600' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: colors.card },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '500' },
  label: { color: colors.muted, fontSize: 13, fontWeight: '500', marginBottom: 6 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, color: colors.text, paddingHorizontal: 13, paddingVertical: 11, fontSize: 15 },
  err: { color: colors.error, fontSize: 12, marginTop: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  kv: { flexDirection: 'row', paddingVertical: 6, gap: 12 },
  kvK: { color: colors.muted, fontSize: 13, width: 110 },
  kvV: { color: colors.text, fontSize: 14, flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  fab: { position: 'absolute', right: 18, bottom: 18, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  stat: { width: '48.5%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14 },
  statValue: { color: colors.text, fontSize: 28, fontWeight: '700' },
  statLabel: { color: colors.muted, fontSize: 13, marginTop: 2 },
});
