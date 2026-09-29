import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share } from 'react-native';
import { showAlert } from '../../components/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from '@core/supabase';
import { useFamilyInfo, useMe, useFullName } from '../../store/family';
import { useSession } from '../../store/session';

export default function SettingsScreen() {
  const router = useRouter();
  // 진짜 가족이 없으면 예시가 온다 — `isReal`로 구분한다 (store/family.ts)
  const family = useFamilyInfo();
  const me = useMe();
  const myFullName = useFullName(me);
  const clearSession = useSession((s) => s.clear);

  const handleSignOut = () => {
    showAlert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
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
      showAlert('초대 코드', family.inviteCode);
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
      ],
    },
    {
      title: '내 정보',
      items: [
        { icon: 'user', label: '프로필 수정', action: () => router.push('/settings/profile') },
        { icon: 'bell', label: '알림 설정', action: () => router.push('/settings/notifications') },
        { icon: 'lock', label: '개인정보 보호', action: () => router.push('/settings/privacy') },
      ],
    },
    {
      title: '데이터',
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
      <TouchableOpacity style={styles.profileCard} activeOpacity={0.7} onPress={() => router.push('/settings/profile')}>
        <View style={styles.avatar}>
          <FontAwesome name="user" size={28} color="#4A8C6F" />
        </View>
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
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#EAEAEA', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#E8D0C0', justifyContent: 'center', alignItems: 'center',
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
