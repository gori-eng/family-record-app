/**
 * 가족 합치기 — 다른 가족을 **지금 보는 가족**으로 흡수한다 (00012).
 *
 * 운영자 상황: 친가 식구와 쓰는 가족, 결혼 뒤 시댁과 쓰는 가족이 따로 생겼다가 하나로 합치고 싶을 때.
 *
 * - 남는 쪽은 지금 보는 가족. 사라지는 쪽(흡수되는 가족)을 여기서 고른다
 * - **두 가족 모두의 관리자**만 할 수 있다 — DB가 막는다. 화면은 후보만 보여준다
 * - 흡수되는 가족의 기록·일정·구성원·가계부 설정이 넘어오고, 그 가족은 사라진다. **되돌릴 수 없다**
 *   그래서 무엇이 넘어오는지 숫자로 보여주고, 파일로 먼저 담기를 권한 뒤, 두 번 확인받는다
 * - 같은 사람이 양쪽에 다른 이름이면(박씨네 '링호' / 고씨네 '륜호') 흡수되는 쪽 기록의 이름이 남는 쪽 이름으로 바뀐다
 * - 다른 두 사람이 같은 이름이면 DB가 거절하고 이유를 말한다 → 그대로 보여준다
 */
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { showAlert } from '../../components/AppAlert';
import { useSession, useMyFamilies } from '../../store/session';
import { useRecordsStore } from '../../store/records';
import { useEventsStore } from '../../store/events';
import { fetchMyMemberships, fetchRecords, fetchEvents, fetchMembers, mergeFamilies, type Family } from '@core/supabase';
import { dbErrorText } from '../../lib/dbErrors';
import { attachFinanceSettings } from '../../store/financeSettings';
import { ro, iga, eulreul, euneun } from '../../lib/korean';

type Membership = { family_id: string; role: string; display_name: string };

export default function MergeFamilyScreen() {
  const router = useRouter();
  const families = useMyFamilies();
  const target = useSession((s) => s.family);
  const userId = useSession((s) => s.userId);
  const refresh = useSession((s) => s.refresh);
  const switchFamily = useSession((s) => s.switchFamily);

  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  useEffect(() => {
    if (!userId) return;
    fetchMyMemberships(userId).then(setMemberships).catch(() => setMemberships([]));
  }, [userId]);

  const roleIn = (familyId: string) => memberships?.find((m) => m.family_id === familyId)?.role ?? null;
  const nameIn = (familyId: string) => memberships?.find((m) => m.family_id === familyId)?.display_name ?? '';
  const iAmTargetAdmin = !!target && roleIn(target.id) === 'admin';

  /** 흡수할 수 있는 후보 — 지금 가족이 아니면서 내가 관리자인 가족 */
  const candidates = useMemo(
    () => families.filter((f) => f.id !== target?.id && roleIn(f.id) === 'admin'),
    [families, target?.id, memberships]
  );
  /** 관리자가 아니라서 못 합치는 가족 — 왜 목록에 없는지 알려주려고 */
  const others = useMemo(
    () => families.filter((f) => f.id !== target?.id && roleIn(f.id) !== 'admin'),
    [families, target?.id, memberships]
  );

  const [busy, setBusy] = useState<string | null>(null);

  const pick = async (source: Family) => {
    if (!target || !userId) return;
    setBusy(source.id);
    try {
      const [recs, evs, mems] = await Promise.all([fetchRecords(source.id), fetchEvents(source.id), fetchMembers(source.id)]);
      const myOld = nameIn(source.id), myNew = nameIn(target.id);
      const renameNote = myOld && myNew && myOld !== myNew
        ? `\n${source.name}에서 '${myOld}'${ro(myOld)} 남긴 내 기록은 '${myNew}'${ro(myNew)} 바뀌어요.` : '';
      const what = [
        recs.length ? `기록 ${recs.length}개` : '',
        evs.length ? `일정 ${evs.length}개` : '',
        `구성원 ${mems.length}명`,
      ].filter(Boolean).join(' · ');
      showAlert(
        `${source.name}${eulreul(source.name)} ${target.name}에 합칠까요?`,
        `${source.name}의 ${what}${iga(what)} ${target.name}${ro(target.name)} 들어오고, ${source.name}${euneun(source.name)} 사라져요.${renameNote}\n\n되돌릴 수 없어요. 먼저 파일로 담아두는 게 안전해요.`,
        [
          { text: '파일로 먼저 담기', onPress: () => router.push('/settings/export') },
          { text: '합치기', style: 'destructive', onPress: () => confirm(source) },
          { text: '그냥 둘게요', style: 'cancel' },
        ]
      );
    } catch (e) {
      showAlert('가족 정보를 읽지 못했어요', dbErrorText(e));
    } finally {
      setBusy(null);
    }
  };

  const confirm = (source: Family) => {
    showAlert('정말 합칠까요?', `${source.name}${euneun(source.name)} 없어지고 되살릴 수 없어요.`, [
      { text: '그냥 둘게요', style: 'cancel' },
      { text: '합치기', style: 'destructive', onPress: () => run(source) },
    ]);
  };

  const run = async (source: Family) => {
    if (!target || !userId) return;
    setBusy(source.id);
    try {
      const r = await mergeFamilies(source.id, target.id);
      // 가족 목록을 다시 받고, 남는 가족을 보게 한 뒤, 넘어온 기록·일정을 다시 불러온다
      await refresh();
      await switchFamily(target.id);
      await Promise.all([
        useRecordsStore.getState().load(target.id, userId),
        useEventsStore.getState().load(target.id, userId),
        // 합치기가 두 가족의 가계부 설정을 합쳤다 — 옛 값을 들고 있다가 다음 저장 때 덮지 않게 다시 받는다
        attachFinanceSettings(target.id),
      ]);
      const parts = [
        r.movedRecords ? `기록 ${r.movedRecords}개` : '',
        r.movedEvents ? `일정 ${r.movedEvents}개` : '',
        r.movedMembers ? `새 구성원 ${r.movedMembers}명` : '',
      ].filter(Boolean).join(' · ');
      showAlert(
        `${target.name} 하나가 됐어요`,
        (parts ? `${parts}${iga(parts)} 들어왔어요.` : '들어온 기록은 없었어요.') +
          (r.skippedDuplicates ? `\n양쪽에 똑같이 있던 거래 ${r.skippedDuplicates}건은 한 번만 남겼어요.` : ''),
        [{ text: '확인', onPress: () => router.replace('/') }]
      );
    } catch (e) {
      // DB 함수가 이유를 한국어로 말한다(이름 겹침 등). 아무것도 바뀌지 않은 상태다
      showAlert('합치지 못했어요', dbErrorText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '가족 합치기' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Text style={s.intro}>
          다른 가족을 <Text style={s.bold}>{target?.name ?? '지금 가족'}</Text>에 합쳐요.
          기록·일정·구성원이 넘어오고, 합쳐진 가족은 사라져요.
        </Text>

        {memberships === null ? (
          <ActivityIndicator color="#4A8C6F" style={s.spinner} />
        ) : !target ? (
          <Text style={s.note}>먼저 가족을 만들어주세요.</Text>
        ) : !iAmTargetAdmin ? (
          <View style={s.noteBox}>
            <FontAwesome name="lock" size={13} color="#9C8B75" />
            <Text style={s.note}>
              합치기는 두 가족 모두의 관리자만 할 수 있어요. {target.name}에서 나는 관리자가 아니에요.
            </Text>
          </View>
        ) : candidates.length === 0 ? (
          <View style={s.noteBox}>
            <FontAwesome name="info-circle" size={13} color="#9C8B75" />
            <Text style={s.note}>
              {families.length <= 1
                ? '합칠 다른 가족이 아직 없어요. 가족이 둘 이상일 때 쓸 수 있어요.'
                : `다른 가족에서 내가 관리자가 아니에요. 그 가족의 관리자가 나에게 관리자를 넘겨주면 합칠 수 있어요.`}
            </Text>
          </View>
        ) : (
          <>
            <Text style={s.label}>어느 가족을 {target.name}에 합칠까요?</Text>
            {candidates.map((f) => (
              <TouchableOpacity key={f.id} style={s.card} activeOpacity={0.7} onPress={() => pick(f)} disabled={!!busy}>
                <View style={s.dot}><Text style={s.initial}>{f.name.slice(0, 1)}</Text></View>
                <View style={s.info}>
                  <Text style={s.name}>{f.name}</Text>
                  <Text style={s.sub}>{nameIn(f.id) ? `기록에는 '${nameIn(f.id)}'${ro(nameIn(f.id))} 남아 있어요` : ''}</Text>
                </View>
                {busy === f.id ? <ActivityIndicator color="#4A8C6F" /> : <FontAwesome name="chevron-right" size={12} color="#B0A590" />}
              </TouchableOpacity>
            ))}
            {others.length > 0 && (
              <Text style={s.hint}>
                {others.map((f) => f.name).join(', ')}{euneun(others[others.length - 1].name)} 내가 관리자가 아니라 여기 없어요.
              </Text>
            )}
          </>
        )}

        <View style={s.infoBox}>
          <FontAwesome name="info-circle" size={14} color="#7A6B55" />
          <Text style={s.infoText}>
            같은 사람이 두 가족에서 다른 이름이면, 합쳐진 가족의 기록 속 이름이 남는 가족의 이름으로 바뀌어요.
            다른 두 사람이 같은 이름이면 기록이 섞이지 않게 합치기 전에 한쪽 이름을 바꿔달라고 알려드려요.
            사진은 그대로 보여요.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}


const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  content: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 14, color: '#4A4A4A', fontFamily: 'Pretendard', lineHeight: 21, marginBottom: 20 },
  bold: { fontFamily: 'PretendardBold', color: '#1F1F1F' },
  spinner: { marginTop: 30 },
  label: { fontSize: 13, color: '#4A4A4A', fontFamily: 'PretendardBold', marginBottom: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF',
    borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA',
  },
  dot: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6F1', alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 16, color: '#2D5A3F', fontFamily: 'PretendardBold' },
  info: { flex: 1 },
  name: { fontSize: 15, color: '#1F1F1F', fontFamily: 'PretendardBold' },
  sub: { fontSize: 12, color: '#888888', fontFamily: 'Pretendard', marginTop: 2 },
  hint: { fontSize: 12, color: '#9C8B75', fontFamily: 'Pretendard', marginTop: 4, lineHeight: 18 },
  noteBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#F4F2EE', borderRadius: 12, padding: 14 },
  note: { flex: 1, fontSize: 13, color: '#7A6B55', fontFamily: 'Pretendard', lineHeight: 19 },
  infoBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#EFF6F1', borderRadius: 12, padding: 14, marginTop: 24 },
  infoText: { flex: 1, fontSize: 12, color: '#4A4A4A', fontFamily: 'Pretendard', lineHeight: 18 },
});
