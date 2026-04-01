import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { signOut } from '@core/supabase';

export default function SettingsScreen() {
  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const sections = [
    {
      title: '가족 관리',
      items: [
        { icon: 'users', label: '가족 구성원', subtitle: '4명' },
        { icon: 'qrcode', label: '초대 코드', subtitle: 'ABC12345' },
      ],
    },
    {
      title: '내 정보',
      items: [
        { icon: 'user', label: '프로필 수정' },
        { icon: 'bell', label: '알림 설정' },
        { icon: 'lock', label: '개인정보 보호' },
      ],
    },
    {
      title: '데이터',
      items: [
        { icon: 'download', label: '데이터 내보내기 (PDF/JSON)' },
        { icon: 'cloud-upload', label: '백업 관리' },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <FontAwesome name="user" size={28} color="#C85A4A" />
        </View>
        <View>
          <Text style={styles.profileName}>김지수</Text>
          <Text style={styles.profileRole}>관리자 (부모)</Text>
        </View>
      </View>

      {sections.map((section, si) => (
        <View key={si} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.items.map((item, ii) => (
            <TouchableOpacity key={ii} style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <FontAwesome name={item.icon as any} size={18} color="#5C4A32" />
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

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <FontAwesome name="sign-out" size={18} color="#C85A4A" />
        <Text style={styles.signOutText}>로그아웃</Text>
      </TouchableOpacity>

      <Text style={styles.version}>우리 가족 v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  profileRole: { fontSize: 13, color: '#8B7355', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#BFAE99', marginBottom: 8, textTransform: 'uppercase' },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 6,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuLabel: { fontSize: 15, color: '#2D2D2D' },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  menuSubtitle: { fontSize: 13, color: '#BFAE99' },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, marginTop: 8,
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: '#C85A4A' },
  version: { textAlign: 'center', color: '#BFAE99', fontSize: 12, marginTop: 16, marginBottom: 32 },
});
