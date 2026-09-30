import { iga } from '../lib/korean';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Platform, Share } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { createFamily, joinFamilyByCode, fetchMembers } from '@core/supabase';
import type { Family, FamilyMember } from '@core/supabase';
import { showAlert } from './AppAlert';
import { useSession } from '../store/session';

/**
 * 가족 만들기 / 초대 코드로 합류 — **두 곳에서 쓴다.**
 *   1. `app/onboarding.tsx` — 처음 가입한 사람 (가족이 하나도 없음)
 *   2. `app/settings/add-family.tsx` — 이미 가족이 있는데 **하나 더** (친가 + 처가처럼)
 *      2026-09-29 운영자 결정: 한 사람이 여러 가족에 속할 수 있다.
 *      온보딩 주소는 가드가 "가족 있으면 홈으로" 돌려보내므로 설정 아래에 따로 연다.
 *
 * ── 왜 이 화면이 로그인 다음에 오는가 ──────────────────
 * 이 앱의 모든 기록은 **가족 단위로 격리**된다(RLS). 로그인만으로는 아무것도
 * 읽거나 쓸 수 없고, 가족에 속해야 비로소 동작한다. 그래서 로그인 → 가족 →
 * 그 다음이 앱이다. (CLAUDE.md §11)
 */
type Mode = 'choose' | 'create' | 'join';

/** 알림창에서 문단을 띄울 때 */
const BR = String.fromCharCode(10, 10);

export default function FamilySetup({ adding = false }: { adding?: boolean }) {
  const router = useRouter();
  const userId = useSession((s) => s.userId);
  const setFamily = useSession((s) => s.setFamily);

  const [mode, setMode] = useState<Mode>('choose');
  const [busy, setBusy] = useState(false);

  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  /** 기록에 뜰 짧은 이름 (지수) */
  const [display, setDisplay] = useState('');
  /** 프로필에 뜰 이름 (김지수) */
  const [full, setFull] = useState('');
  /**
   * 합류할 때 고르는 역할 (2026-09-29 운영자 결정).
   * 관리자는 목록에 없다 — 고를 수 있으면 누구나 관리자가 되어 지우기 권한이 무너진다.
   * 관리자는 가족을 만든 사람뿐이다. (DB도 막는다 — 00008)
   */
  const [role, setRole] = useState<'parent' | 'child' | 'elder'>('parent');

  /** 가족을 막 만든 뒤 보여줄 초대 코드 */
  const [madeFamily, setMadeFamily] = useState<Family | null>(null);

  /**
   * 서버가 돌려준 말은 개발자용이라 그대로 보여주면 무섭다.
   * 지금 이 프로젝트에서 실제로 마주칠 수 있는 것들을 알아보고 바꿔 말한다.
   */
  const friendlyError = (e: unknown): string => {
    const msg = String((e as Error)?.message ?? e);
    const code = String((e as { code?: string })?.code ?? '');

    // ── 아직 DB에 없는 것들 ──────────────────────────────
    if (msg.includes('create_family_with_me') || msg.includes('join_family_by_code') || code === 'PGRST202') {
      return '가족을 만드는 기능이 아직 데이터베이스에 없어요.' + BR +
        'Supabase 대시보드 > SQL Editor에서 supabase/APPLY_LATEST.sql 을 붙여넣고 Run 해주세요.';
    }
    if (msg.includes('full_name')) {
      return '아직 데이터베이스 준비가 안 됐어요.' + BR +
        'Supabase 대시보드 > SQL Editor에서 supabase/APPLY_LATEST.sql 을 붙여넣고 Run 해주세요.';
    }

    // ── 사람이 고칠 수 있는 것들 ─────────────────────────
    if (msg.includes('이름이 이미 있어요')) return msg;
    if (msg.includes('역할은')) return msg;
    if (msg.includes('로그인이 필요해요')) {
      return '로그인 정보가 확인되지 않았어요. 다시 로그인해주세요.';
    }
    if (code === '23505' || msg.includes('duplicate key')) {
      return '같은 이름이 이미 있어요. 다른 이름으로 해주세요.';
    }
    if (/fetch|network|failed to fetch/i.test(msg)) {
      return '서버에 닿지 못했어요. 인터넷 연결을 확인해주세요.';
    }

    /**
     * ⚠️ 모르는 오류는 **그대로 보여준다.**
     *    예전에는 RLS 관련 문구를 전부 "다시 로그인해주세요"로 바꿨는데,
     *    실제 원인은 정책이 막은 것이었다(닭과 달걀). 그래서 운영자가
     *    멀쩡한 로그인을 몇 번이나 다시 했다. **틀린 안내는 없는 안내보다 나쁘다.**
     */
    return msg;
  };

  /** 이름 두 칸 검사 — 두 화면이 같이 쓴다 */
  const checkNames = (): string | null => {
    if (!display.trim()) return '기록에 뜰 이름을 적어주세요. 짧게 부르는 이름이 좋아요.';
    if (display.trim().length > 10) return '기록에 뜰 이름은 10자까지가 좋아요. 매일 화면에 뜨는 이름이라서요.';
    // 가계부 거래 지문이 '이름|날짜|…' 모양이라 | 가 섞이면 지문이 깨진다 (DB도 막는다 — 00013)
    if (display.includes('|')) return '이름에 | 기호는 쓸 수 없어요.';
    return null;
  };

  const requireLogin = (): boolean => {
    if (userId) return false;
    showAlert('먼저 로그인이 필요해요', '가족을 만들려면 누구인지 알아야 해요.', [
      { text: '나중에', style: 'cancel' },
      { text: '로그인하기', onPress: () => router.replace('/(auth)/login') },
    ]);
    return true;
  };

  const handleCreate = async () => {
    if (requireLogin()) return;
    if (!familyName.trim()) {
      showAlert('가족 이름을 적어주세요', '"김씨네", "우리 가족"처럼 부르고 싶은 대로요.');
      return;
    }
    const nameError = checkNames();
    if (nameError) { showAlert('이름을 확인해주세요', nameError); return; }

    setBusy(true);
    try {
      const { family, member } = await createFamily(
        familyName.trim(), display.trim(), userId!, full.trim() || undefined
      );
      setFamily(family, [member]);
      setMadeFamily(family);
    } catch (e) {
      showAlert('가족을 만들지 못했어요', friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (requireLogin()) return;
    if (!inviteCode.trim()) {
      showAlert('초대 코드를 적어주세요', '먼저 들어간 가족에게 코드를 받아보세요.');
      return;
    }
    const nameError = checkNames();
    if (nameError) { showAlert('이름을 확인해주세요', nameError); return; }

    setBusy(true);
    try {
      const { family } = await joinFamilyByCode(inviteCode.trim(), display.trim(), full.trim() || undefined, role);
      const members: FamilyMember[] = await fetchMembers(family.id);
      setFamily(family, members);
      showAlert('가족에 들어왔어요', `이제 ${family.name}의 기록을 함께 볼 수 있어요.`, [
        { text: '시작하기', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (e) {
      showAlert('가족에 들어가지 못했어요', friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (!madeFamily) return;
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(madeFamily.invite_code);
        showAlert('코드를 복사했어요', '가족에게 보내주세요.');
        return;
      } catch {
        /* 복사가 막힌 브라우저도 있다 — 아래 안내로 넘어간다 */
      }
      showAlert('초대 코드', madeFamily.invite_code);
      return;
    }
    // 휴대폰 — 공유 시트로 카톡·문자에 바로 보낸다 (예전엔 웹 전용 복사라 알림창만 떴다, 점검 B12)
    try {
      await Share.share({ message: `familog 초대 코드: ${madeFamily.invite_code}` + String.fromCharCode(10) + "앱에서 '초대 코드로 들어가기'에 넣어주세요." });
    } catch {
      showAlert('초대 코드', madeFamily.invite_code);
    }
  };

  // ── 가족을 만든 직후 — 초대 코드를 건네는 화면 ──────────
  if (madeFamily) {
    return (
      <View style={s.container}>
        <View style={s.doneIcon}>
          <FontAwesome name="home" size={30} color="#2D5A3F" />
        </View>
        <Text style={s.title}>{madeFamily.name}{iga(madeFamily.name)} 생겼어요</Text>
        <Text style={s.lead}>
          이 코드를 가족에게 보내주세요.{'\n'}코드를 받은 사람은 같은 기록을 함께 보게 돼요.
        </Text>

        <TouchableOpacity style={s.codeBox} activeOpacity={0.7} onPress={copyCode}>
          <Text style={s.code}>{madeFamily.invite_code}</Text>
          <View style={s.copyRow}>
            <FontAwesome name="copy" size={12} color="#2D5A3F" />
            <Text style={s.copyText}>눌러서 복사</Text>
          </View>
        </TouchableOpacity>

        <Text style={s.codeNote}>
          설정 &gt; 가족 관리에서 언제든 다시 볼 수 있어요.
        </Text>

        <TouchableOpacity style={s.primaryBtn} activeOpacity={0.8} onPress={() => router.replace('/(tabs)')}>
          <Text style={s.primaryBtnText}>기록 시작하기</Text>
          <FontAwesome name="arrow-right" size={15} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  // ── 처음 — 만들까 들어갈까 ──────────────────────────────
  if (mode === 'choose') {
    return (
      <View style={s.container}>
        {adding && (
          <TouchableOpacity style={s.backTop} activeOpacity={0.7} onPress={() => router.back()}>
            <FontAwesome name="chevron-left" size={14} color="#4A4A4A" />
            <Text style={s.backText}>설정으로</Text>
          </TouchableOpacity>
        )}
        <Text style={s.brand}>familog</Text>
        <Text style={s.title}>{adding ? '가족을 하나 더 더해요' : '함께 쓸 가족을 정해요'}</Text>
        {adding ? (
          <Text style={s.lead}>
            친가·처가처럼 다른 가족과도 따로 기록을 모을 수 있어요.{'\n'}새로 만들거나, 받은 초대 코드로 들어가요.
          </Text>
        ) : (
          <Text style={s.lead}>
            기록은 가족 단위로 모여요.{'\n'}처음이면 가족을 만들고, 이미 있으면 코드로 들어가면 돼요.
          </Text>
        )}

        <TouchableOpacity style={s.choice} activeOpacity={0.8} onPress={() => setMode('create')}>
          <View style={[s.choiceIcon, { backgroundColor: '#EFF6F1' }]}>
            <FontAwesome name="plus" size={16} color="#2D5A3F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.choiceTitle}>가족 새로 만들기</Text>
            <Text style={s.choiceDesc}>내가 처음이에요. 만들면 초대 코드가 생겨요.</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color="#B0A590" />
        </TouchableOpacity>

        <TouchableOpacity style={s.choice} activeOpacity={0.8} onPress={() => setMode('join')}>
          <View style={[s.choiceIcon, { backgroundColor: '#EFF6F1' }]}>
            <FontAwesome name="users" size={15} color="#2D5A3F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.choiceTitle}>초대 코드로 들어가기</Text>
            <Text style={s.choiceDesc}>가족에게 받은 코드가 있어요.</Text>
          </View>
          <FontAwesome name="chevron-right" size={12} color="#B0A590" />
        </TouchableOpacity>
      </View>
    );
  }

  // ── 가족 만들기 / 합류 폼 ───────────────────────────────
  const creating = mode === 'create';
  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollInner}>
      <TouchableOpacity style={s.back} activeOpacity={0.7} onPress={() => setMode('choose')}>
        <FontAwesome name="chevron-left" size={14} color="#4A4A4A" />
        <Text style={s.backText}>뒤로</Text>
      </TouchableOpacity>

      <Text style={s.title}>{creating ? '가족 만들기' : '초대 코드로 들어가기'}</Text>

      {creating ? (
        <>
          <Text style={s.label}>가족 이름</Text>
          <TextInput style={s.input} placeholder="예: 김씨네" placeholderTextColor="#A0A0A0"
            value={familyName} onChangeText={setFamilyName} />
        </>
      ) : (
        <>
          <Text style={s.label}>초대 코드</Text>
          <TextInput style={[s.input, s.codeInput]} placeholder="예: ABC12345" placeholderTextColor="#A0A0A0"
            value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" />
        </>
      )}

      {!creating && (
        <>
          <Text style={s.label}>나는 이 가족에서</Text>
          <View style={s.roleRow}>
            {([
              ['parent', '부모'],
              ['child', '자녀'],
              ['elder', '조부모'],
            ] as const).map(([value, label]) => (
              <TouchableOpacity key={value} activeOpacity={0.7}
                style={[s.roleChip, role === value && s.roleChipOn]}
                onPress={() => setRole(value)}>
                <Text style={[s.roleText, role === value && s.roleTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={s.label}>기록에 뜰 이름</Text>
      <TextInput style={s.input} placeholder="예: 지수" placeholderTextColor="#A0A0A0"
        value={display} onChangeText={setDisplay} />
      <Text style={s.hint}>
        가계부나 일기에 "누가 썼는지"로 뜨는 이름이에요. 가족 안에서 겹치지 않게, 짧게 부르는 이름이 좋아요.
      </Text>

      <Text style={s.label}>프로필에 뜰 이름 (선택)</Text>
      <TextInput style={s.input} placeholder="예: 김지수" placeholderTextColor="#A0A0A0"
        value={full} onChangeText={setFull} />
      <Text style={s.hint}>비워두면 위에 적은 이름을 그대로 써요.</Text>

      <TouchableOpacity
        style={[s.primaryBtn, busy && s.primaryBtnOff]}
        activeOpacity={0.8}
        disabled={busy}
        onPress={creating ? handleCreate : handleJoin}>
        <Text style={s.primaryBtnText}>
          {busy ? '잠시만요...' : creating ? '가족 만들기' : '들어가기'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5', justifyContent: 'center', paddingHorizontal: 28 },
  scroll: { flex: 1, backgroundColor: '#F9F8F5' },
  scrollInner: { paddingHorizontal: 28, paddingTop: 48, paddingBottom: 48 },

  brand: { fontSize: 30, color: '#2D5A3F', fontFamily: 'GaeguBold', transform: [{ rotate: '-2deg' }], textAlign: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', textAlign: 'center', marginBottom: 10 },
  lead: { fontSize: 14, color: '#7A6B55', fontFamily: 'Pretendard', textAlign: 'center', lineHeight: 21, marginBottom: 32 },

  choice: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#EAEAEA' },
  choiceIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  choiceTitle: { fontSize: 15, fontWeight: '600', color: '#1F1F1F', fontFamily: 'Pretendard' },
  choiceDesc: { fontSize: 12, color: '#7A6B55', marginTop: 3, fontFamily: 'Pretendard' },

  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 20 },
  backTop: { position: 'absolute', top: 48, left: 24, flexDirection: 'row', alignItems: 'center', gap: 6 },
  backText: { fontSize: 14, color: '#4A4A4A', fontFamily: 'Pretendard' },

  label: { fontSize: 13, fontWeight: '600', color: '#4A4A4A', fontFamily: 'Pretendard', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard' },
  codeInput: { letterSpacing: 2, fontFamily: 'PretendardBold' },
  hint: { fontSize: 12, color: '#9C8B75', fontFamily: 'Pretendard', marginTop: 6, lineHeight: 17 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF' },
  roleChipOn: { borderColor: '#4A8C6F', backgroundColor: '#EFF6F1' },
  roleText: { fontSize: 14, color: '#7A6B55', fontFamily: 'Pretendard' },
  roleTextOn: { color: '#2D5A3F', fontWeight: '700' },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, marginTop: 28 },
  primaryBtnOff: { backgroundColor: '#A8C4B4' },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', fontFamily: 'PretendardBold' },

  doneIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6F1', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20 },
  codeBox: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#4A8C6F', paddingVertical: 20, alignItems: 'center' },
  code: { fontSize: 28, fontWeight: '700', color: '#2D5A3F', fontFamily: 'PretendardBold', letterSpacing: 4 },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  copyText: { fontSize: 12, color: '#2D5A3F', fontFamily: 'Pretendard' },
  codeNote: { fontSize: 12, color: '#9C8B75', fontFamily: 'Pretendard', textAlign: 'center', marginTop: 14 },
});
