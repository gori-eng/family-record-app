import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';

/**
 * 알림 설정.
 *
 * ── 예전 화면은 켜지지 않는 스위치였다 (2026-09-29) ───────────
 * '일정 30분 전 알림' · 'AI 오늘의 질문' 같은 스위치 다섯 개가 있었지만 어디에도 저장되지
 * 않았고, 애초에 **보낼 방법(푸시)이 없다.** 켜둔 사람은 알림이 올 거라 믿고 기다리게 된다.
 *
 * 푸시는 휴대폰 앱(EAS 빌드)이 있어야 붙일 수 있다. 그때 이 화면을 진짜 스위치로 바꾼다.
 * 없는 기능을 약속하는 문구("곧 알려드릴게요")는 쓰지 않는다.
 */
export default function NotificationsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: '알림' }} />
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <FontAwesome name="bell-slash-o" size={22} color="#A39682" />
          </View>
          <Text style={s.title}>휴대폰 알림은 아직 준비 중이에요</Text>
          <Text style={s.desc}>
            휴대폰으로 알림을 보내려면 앱을 휴대폰에 설치할 수 있어야 해요.{'\n'}
            그전까지는 홈 위쪽의 종 모양을 눌러보세요. 가족이 새로 남긴 기록과{'\n'}
            오늘과 내일 일정이 모여 있어요.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  content: { padding: 20 },
  card: {
    alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: '#EDE8DF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F4F0E8', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 16, color: '#1F1F1F', fontFamily: 'PretendardBold', marginBottom: 8 },
  desc: { fontSize: 13, color: '#7A6B55', lineHeight: 20, textAlign: 'center', fontFamily: 'Pretendard' },
});
