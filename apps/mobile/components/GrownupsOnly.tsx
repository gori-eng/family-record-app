import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import type { ComponentType } from 'react';
import { useCanSee } from '../store/family';

/**
 * 어른만 들어오는 화면 — 가계부·건강 기록 (00010).
 *
 * 기록 허브에서 칸을 숨겨도, 주소를 직접 치거나 옛 링크로 들어올 수 있다.
 * 그때 빈 화면이나 "저장하지 못했어요" 오류 대신 **왜 못 보는지**를 말해준다.
 * (DB도 아이 계정에는 이 기록을 내주지 않으므로 여기서 새는 것은 없다 — 안내일 뿐이다)
 *
 * 화면 파일 맨 아래에서 `export default withGrownupsOnly('finance', FinanceScreen)`처럼 감싼다.
 * 훅 순서를 건드리지 않으려고 화면 안이 아니라 바깥에서 가른다.
 */
export function withGrownupsOnly<P extends object>(category: string, Screen: ComponentType<P>) {
  return function GrownupsOnly(props: P) {
    const canSee = useCanSee();
    if (canSee(category)) return <Screen {...props} />;
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <View style={s.wrap}>
          <View style={s.icon}>
            <FontAwesome name="lock" size={22} color="#4A8C6F" />
          </View>
          <Text style={s.title}>어른들이 쓰는 기록이에요</Text>
          <Text style={s.desc}>가계부와 건강 기록은 부모님과 조부모님만 볼 수 있어요.</Text>
        </View>
      </>
    );
  };
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F9F8F5', alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EFF6F1', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 16, color: '#1F1F1F', fontFamily: 'PretendardBold', marginBottom: 6 },
  desc: { fontSize: 13, color: '#888888', textAlign: 'center', lineHeight: 19, fontFamily: 'Pretendard' },
});
