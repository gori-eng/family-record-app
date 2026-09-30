import { Avatar } from '../../components/Avatar';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share, Modal, Pressable } from 'react-native';
import { useState } from 'react';
import { showAlert } from '../../components/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut, leaveFamily, deleteFamily } from '@core/supabase';
import { useFamilyInfo, useMe, useFullName } from '../../store/family';
import { useSession, useMyFamilies } from '../../store/session';
import { useRecordsStore } from '../../store/records';
import { useEventsStore } from '../../store/events';
import { eulreul } from '../../lib/korean';

export default function SettingsScreen() {
  const router = useRouter();
  // 진짜 가족이 없으면 예시가 온다 — `isReal`로 구분한다 (store/family.ts)
  const family = useFamilyInfo();
  /**
   * 가족 바꾸기 — 구글 계정 전환처럼 (2026-09-29 운영자 결정).
   * 친가 가족, 처가(시댁) 가족처럼 여럿에 속할 수 있고, 여기서 지금 볼 가족을 고른다.
   */
  const families = useMyFamilies();
  const currentFamilyId = useSession((st) => st.family?.id ?? null);
  const switchFamily = useSession((st) => st.switchFamily);
  const [showFamilies, setShowFamilies] = useState(false);
  const pickFamily = async (id: string) => {
    setShowFamilies(false);
    await switchFamily(id);
  };
  const me = useMe();
  const myFullName = useFullName(me);
  /** 프로필에서 고른 이모지 (없으면 사람 아이콘) */
  const myAvatar = useSession((st) => st.me?.avatar_url ?? null);
  const clearSession = useSession((s) => s.clear);
  const refreshSession = useSession((s) => s.refresh);
  const isAdmin = useSession((st) => st.me?.role === 'admin');
  const recordCount = useRecordsStore((st) => st.records.length);
  const eventCount = useEventsStore((st) => st.events.length);

  /**
   * 가족에서 나가기 / 가족 지우기 (00010).
   * - 나 혼자 남은 가족의 관리자 → **지우기**만 된다 (나갈 사람이 나뿐이다)
   * - 그 밖에는 **나가기**. 내가 쓴 기록은 가족에 남는다
   * 관리자가 다른 사람과 함께 있으면 DB가 "관리자를 먼저 넘겨주세요"라고 거절한다.
   * 끝나면 가족 목록을 다시 불러온다 — 남은 가족이 없으면 가드가 온보딩으로 보낸다.
   */
  const soleAdmin = isAdmin && family.memberCount === 1;
  const afterFamilyGone = async () => {
    await refreshSession();
    router.replace('/');
  };

  const handleLeave = () => {
    showAlert(
      `${family.name}에서 나갈까요?`,
      '내가 쓴 기록은 가족에게 그대로 남아요. 다시 들어오려면 초대 코드가 필요해요.',
      [
        { text: '그냥 있을게요', style: 'cancel' },
        {
          text: '나가기',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveFamily(currentFamilyId!);
              await afterFamilyGone();
            } catch (e: any) {
              showAlert('나가지 못했어요', String(e?.message ?? e));
            }
          },
        },
      ]
    );
  };

  const reallyDelete = () => {
    showAlert('정말 지울까요?', '지운 가족은 되살릴 수 없어요.', [
      { text: '그냥 둘게요', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFamily(currentFamilyId!);
            await afterFamilyGone();
          } catch (e: any) {
            showAlert('지우지 못했어요', String(e?.message ?? e));
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    const what = recordCount || eventCount
      ? `기록 ${recordCount}개와 일정 ${eventCount}개가 함께 지워져요.`
      : '아직 쓴 기록은 없어요.';
    showAlert(`${family.name}${eulreul(family.name)} 지울까요?`, `${what}\n먼저 파일로 담아두면 나중에 다른 가족에 되살릴 수 있어요.`, [
      { text: '파일로 먼저 담기', onPress: () => router.push('/settings/export') },
      { text: '지우기', style: 'destructive', onPress: reallyDelete },
      { text: '그냥 둘게요', style: 'cancel' },
    ]);
  };

  const handleSignOut = () => {
    showAlert('로그아웃할까요?', '기록은 그대로 남아 있어요. 다시 로그인하면 이어서 볼 수 있어요.', [
      { text: '그냥 있을게요', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          // ⚠️ 예전에는 signOut()만 불렀다. 가드(REQUIRE_AUTH)가 꺼져 있으면
          //    아무도 화면을 옮기지 않아 "눌러도 아무 일 없는" 것처럼 보였다
          //    (로그인 화면과 같은 함정 — CLAUDE.md 2026-09-28 ④).
          try { await signOut(); } catch { /* 이미 로그아웃이어도 계속 진행 */ }
          clearSession();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleShareInviteCode = async () => {
    if (!family.inviteCode) {
      showAlert('아직 가족이 없어요', '가족을 먼저 만들면 초대 코드가 생겨요.', [
        { text: '나중에', style: 'cancel' },
        { text: '가족 만들기', onPress: () => router.replace('/onboarding') },
      ]);
      return;
    }
    try {
      await Share.share({ message: `familog에 초대합니다! 초대 코드: ${family.inviteCode}` });
    } catch {
      showAlert('초대 코드', `${family.inviteCode}\n\n이 코드를 가족에게 보내주세요.`);
    }
  };

  /** 설정 목록 한 줄. subtitle은 있는 줄도 있고 없는 줄도 있다 */
  type MenuItem = { icon: string; label: string; subtitle?: string; action: () => void };
  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: '가족 관리',
      items: [
        { icon: 'users', label: '가족 구성원', subtitle: `${family.memberCount}명`,
          action: () => router.push('/settings/members') },
        { icon: 'qrcode', label: '초대 코드', subtitle: family.inviteCode ?? '아직 없어요',
          action: handleShareInviteCode },
        // 진짜 가족이 있을 때만. 혼자 남은 관리자는 지우기, 그 밖에는 나가기
        ...(family.isReal && currentFamilyId
          ? [soleAdmin
              ? { icon: 'trash-o', label: '이 가족 지우기', subtitle: '나 혼자 남은 가족', action: handleDelete }
              : { icon: 'sign-out', label: '이 가족에서 나가기', action: handleLeave }]
          : []),
      ],
    },
    {
      title: '내 정보',
      items: [
        { icon: 'user', label: '내 프로필', action: () => router.push('/settings/profile') },
        { icon: 'bell', label: '알림', subtitle: '준비 중', action: () => router.push('/settings/notifications') },
        { icon: 'lock', label: '개인정보 보호', subtitle: '무엇이 지켜지나요', action: () => router.push('/settings/privacy') },
      ],
    },
    {
      title: '기록 지키기',
      items: [
        // ⚠️ 여기 있던 '백업 관리'는 아무것도 하지 않으면서 "마지막 백업: 4월 4일",
        //    "백업이 완료되었습니다"를 띄웠다. **기록이 안전하다고 거짓으로 알려주는**
        //    가장 나쁜 종류의 가짜라 지웠다. 실제 백업은 아래 한 곳에서 한다.
        { icon: 'download', label: '기록 내보내기 · 되살리기', subtitle: '백업',
          action: () => router.push('/settings/export') },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {family.signedIn && (
        <TouchableOpacity style={styles.familySwitch} activeOpacity={0.7} onPress={() => setShowFamilies(true)}>
          <FontAwesome name="home" size={15} color="#2D5A3F" />
          <View style={{ flex: 1 }}>
            <Text style={styles.familySwitchLabel}>지금 보는 가족</Text>
            <Text style={styles.familySwitchName}>{family.isReal ? family.name : '아직 없어요'}</Text>
          </View>
          <Text style={styles.familySwitchAction}>
            {families.length > 1 ? `바꾸기 · ${families.length}` : '가족 더하기'}
          </Text>
          <FontAwesome name="chevron-down" size={11} color="#7A6B55" />
        </TouchableOpacity>
      )}

      <Modal visible={showFamilies} transparent animationType="fade" onRequestClose={() => setShowFamilies(false)}>
        <View style={styles.sheetWrap}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setShowFamilies(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>어느 가족을 볼까요?</Text>
            {families.map((f) => {
              const on = f.id === currentFamilyId;
              return (
                <TouchableOpacity key={f.id} style={[styles.sheetRow, on && styles.sheetRowOn]} activeOpacity={0.7}
                  onPress={() => pickFamily(f.id)}>
                  <View style={[styles.sheetDot, on && styles.sheetDotOn]}>
                    <Text style={[styles.sheetInitial, on && styles.sheetInitialOn]}>{f.name.slice(0, 1)}</Text>
                  </View>
                  <Text style={[styles.sheetName, on && styles.sheetNameOn]}>{f.name}</Text>
                  {on && <FontAwesome name="check" size={14} color="#2D5A3F" />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.sheetAdd} activeOpacity={0.7}
              onPress={() => { setShowFamilies(false); router.push('/settings/add-family'); }}>
              <FontAwesome name="plus" size={13} color="#2D5A3F" />
              <Text style={styles.sheetAddText}>가족 더하기 — 새로 만들거나 초대 코드로</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.profileCard} activeOpacity={0.7} onPress={() => router.push('/settings/profile')}>
        <Avatar avatar={myAvatar} size={56} bg="#E8D0C0"
          fallback={<FontAwesome name="user" size={28} color="#4A8C6F" />} />
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>{myFullName}</Text>
          <Text style={styles.profileRole}>
            {family.isReal
              ? family.name
              : family.signedIn
                ? '아직 가족을 만들지 않았어요'
                : '아직 로그인하지 않았어요'}
          </Text>
        </View>
        <View style={styles.editProfileButton}>
          <FontAwesome name="pencil" size={14} color="#4A8C6F" />
        </View>
      </TouchableOpacity>

      {!family.isReal && (
        <TouchableOpacity style={styles.sampleBanner} activeOpacity={0.8}
          onPress={() => router.replace('/onboarding')}>
          <FontAwesome name="info-circle" size={14} color="#7A6B55" />
          <Text style={styles.sampleText}>
            {family.signedIn ? (
              <>
                로그인은 됐어요. 이제 <Text style={styles.sampleStrong}>가족을 만들면</Text>{' '}
                여기가 우리 가족 것으로 바뀌어요.
              </>
            ) : (
              <>
                지금 보이는 가족은 <Text style={styles.sampleStrong}>예시</Text>예요.
                로그인하고 가족을 만들면 우리 가족 것으로 바뀌어요.
              </>
            )}
          </Text>
          <FontAwesome name="chevron-right" size={11} color="#B0A590" />
        </TouchableOpacity>
      )}

      {sections.map((section, si) => (
        <View key={si} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, ii) => (
            <TouchableOpacity key={ii} style={styles.menuItem} onPress={item.action} activeOpacity={0.6}>
              <View style={styles.menuLeft}>
                <View style={styles.menuIconCircle}>
                  <FontAwesome name={item.icon as any} size={16} color="#5C4A32" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <View style={styles.menuRight}>
                {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
                <FontAwesome name="chevron-right" size={12} color="#D4C8B0" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.6}>
        <FontAwesome name="sign-out" size={18} color="#D94040" />
        <Text style={styles.signOutText}>로그아웃</Text>
      </TouchableOpacity>

      <Text style={styles.version}>familog v1.0.0</Text>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sampleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F4F2EE', borderRadius: 12, padding: 14,
    marginHorizontal: 20, marginBottom: 8,
    borderWidth: 1, borderColor: '#EAE6DE',
  },
  sampleText: { flex: 1, fontSize: 12, color: '#7A6B55', lineHeight: 18, fontFamily: 'Pretendard' },
  sampleStrong: { color: '#2D5A3F', fontWeight: '700' },
  safeArea: { flex: 1, backgroundColor: '#F9F8F5' },
  container: { flex: 1, backgroundColor: '#F9F8F5', padding: 20 },
  familySwitch: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginTop: 12, marginBottom: 4,
    backgroundColor: '#EFF6F1', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
  },
  familySwitchLabel: { fontSize: 11, color: '#4A8C6F', fontFamily: 'Pretendard' },
  familySwitchName: { fontSize: 15, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', marginTop: 1 },
  familySwitchAction: { fontSize: 12, color: '#2D5A3F', fontFamily: 'Pretendard' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', marginBottom: 14 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  sheetRowOn: { backgroundColor: '#EFF6F1' },
  sheetDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F2EE', justifyContent: 'center', alignItems: 'center' },
  sheetDotOn: { backgroundColor: '#4A8C6F' },
  sheetInitial: { fontSize: 15, fontWeight: '700', color: '#7A6B55', fontFamily: 'PretendardBold' },
  sheetInitialOn: { color: '#FFFFFF' },
  sheetName: { flex: 1, fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard' },
  sheetNameOn: { fontWeight: '700', color: '#2D5A3F' },
  sheetAdd: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 12, marginTop: 6, borderTopWidth: 1, borderTopColor: '#F0EEE9' },
  sheetAddText: { fontSize: 14, color: '#2D5A3F', fontFamily: 'Pretendard' },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#EAEAEA', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  profileName: { fontSize: 18, fontWeight: '700', color: '#1F1F1F', fontFamily: 'PretendardBold', letterSpacing: -0.3 },
  profileRole: { fontSize: 13, color: '#888', marginTop: 2, fontFamily: 'Pretendard' },
  editProfileButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#EFF6F1', justifyContent: 'center', alignItems: 'center',
  },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#A0A0A0', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'PretendardBold' },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#EAEAEA',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFF8F0', justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuSubtitle: { fontSize: 13, color: '#A0A0A0', fontFamily: 'Pretendard' },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, marginTop: 8,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#D94040', fontFamily: 'Pretendard' },
  version: { textAlign: 'center', color: '#A0A0A0', fontSize: 12, marginTop: 16, marginBottom: 32, fontFamily: 'Pretendard' },
});
