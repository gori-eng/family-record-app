import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { signOut } from '@core/supabase';

const INVITE_CODE = 'ABC12345';

export default function SettingsScreen() {
  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleShareInviteCode = async () => {
    try {
      await Share.share({
        message: `우리 가족 앱에 초대합니다! 초대 코드: ${INVITE_CODE}`,
      });
    } catch {
      Alert.alert('초대 코드', INVITE_CODE);
    }
  };

  const handleMenuPress = (label: string) => {
    const messages: Record<string, string> = {
      '가족 구성원': '가족 구성원 관리 기능이 곧 추가됩니다.',
      '프로필 수정': '프로필 수정 기능이 곧 추가됩니다.',
      '알림 설정': '알림 설정 기능이 곧 추가됩니다.',
      '개인정보 보호': '개인정보 보호 설정이 곧 추가됩니다.',
      '데이터 내보내기 (PDF/JSON)': '데이터 내보내기 기능이 곧 추가됩니다.',
      '백업 관리': '백업 관리 기능이 곧 추가됩니다.',
    };
    Alert.alert('준비 중', messages[label] || '이 기능은 곧 추가됩니다.');
  };

  const sections = [
    {
      title: '가족 관리',
      items: [
        { icon: 'users', label: '가족 구성원', subtitle: '4명', action: () => handleMenuPress('가족 구성원') },
        { icon: 'qrcode', label: '초대 코드', subtitle: INVITE_CODE, action: handleShareInviteCode },
      ],
    },
    {
      title: '내 정보',
      items: [
        { icon: 'user', label: '프로필 수정', action: () => handleMenuPress('프로필 수정') },
        { icon: 'bell', label: '알림 설정', action: () => handleMenuPress('알림 설정') },
        { icon: 'lock', label: '개인정보 보호', action: () => handleMenuPress('개인정보 보호') },
      ],
    },
    {
      title: '데이터',
      items: [
        { icon: 'download', label: '데이터 내보내기 (PDF/JSON)', action: () => handleMenuPress('데이터 내보내기 (PDF/JSON)') },
        { icon: 'cloud-upload', label: '백업 관리', action: () => handleMenuPress('백업 관리') },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <TouchableOpacity style={styles.profileCard} activeOpacity={0.7} onPress={() => handleMenuPress('프로필 수정')}>
        <View style={styles.avatar}>
          <FontAwesome name="user" size={28} color="#C85A4A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.profileName}>김지수</Text>
          <Text style={styles.profileRole}>관리자 (부모)</Text>
        </View>
        <View style={styles.editProfileButton}>
          <FontAwesome name="pencil" size={14} color="#C85A4A" />
        </View>
      </TouchableOpacity>

      {sections.map((section, si) => (
        <View key={si} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, ii) => (
            <TouchableOpacity
              key={ii}
              style={styles.menuItem}
              onPress={item.action}
              activeOpacity={0.6}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIconCircle}>
                  <FontAwesome name={item.icon as any} size={16} color="#5C4A32" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <View style={styles.menuRight}>
                {item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
                <FontAwesome name="chevron-right" size={12} color="#BFAE99" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.6}>
        <FontAwesome name="sign-out" size={18} color="#C85A4A" />
        <Text style={styles.signOutText}>로그아웃</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => Alert.alert('우리 가족', '버전: v1.0.0\n빌드: 2026.04.03\n\nMade with love for families.')} activeOpacity={0.7}>
        <Text style={styles.version}>우리 가족 v1.0.0</Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFDF0' },
  container: { flex: 1, backgroundColor: '#FFFDF0', padding: 20 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#F0E8D8', marginBottom: 24,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FFDAB9', justifyContent: 'center', alignItems: 'center',
  },
  profileName: { fontSize: 18, fontWeight: '700', color: '#2D2D2D' },
  profileRole: { fontSize: 13, color: '#7A6B55', marginTop: 2 },
  editProfileButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFF0ED', justifyContent: 'center', alignItems: 'center',
  },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9C8B75', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 6,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#FFF8F0', justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { fontSize: 15, color: '#2D2D2D' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuSubtitle: { fontSize: 13, color: '#9C8B75' },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, marginTop: 8,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#C85A4A' },
  version: { textAlign: 'center', color: '#9C8B75', fontSize: 12, marginTop: 16, marginBottom: 32 },
});
