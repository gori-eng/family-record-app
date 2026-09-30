import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRecordsStore } from '../store/records';
import { useEventsStore } from '../store/events';

/**
 * 불러오는 동안 보여주는 자리.
 *
 * 예전엔 앱을 켜면 기록을 받아오기 **전에** "아직 기록이 없어요"가 먼저 보였다가 기록이
 * 번쩍 나타났다(2026-09-29 점검 B11). 없다고 말하려면 정말 없는지 확인한 뒤여야 한다.
 */
export function LoadingRows({ label = '불러오고 있어요' }: { label?: string }) {
  return (
    <View style={s.wrap}>
      <ActivityIndicator color="#4A8C6F" />
      <Text style={s.text}>{label}</Text>
    </View>
  );
}

/** 기록을 다 받아왔는지. 가족이 없으면(둘러보기) 받아올 게 없으니 바로 준비된 것으로 본다 */
export function useRecordsReady(): boolean {
  return useRecordsStore((s) => s.ready || !s.familyId);
}

export function useEventsReady(): boolean {
  return useEventsStore((s) => s.ready || !s.familyId);
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  text: { fontSize: 13, color: '#9C8B75', fontFamily: 'Pretendard' },
});
