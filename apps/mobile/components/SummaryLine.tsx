/**
 * 기록 화면 맨 위의 한 문장 — 숫자판 대신 (제품 검토 6번, 운영자 결정 b)
 *
 * 예전엔 `본 영화 3 / 평균 별점 4.3 / 보고 싶은 0`처럼 숫자 세 개가 카드로 섰다.
 * 기록이 두세 개뿐인 새 가족에겐 "0 / 0 / 0" 숫자판이 재촉처럼 보이고,
 * 평균 별점 같은 값은 가족 기록장에서 별 의미가 없다.
 * 그래서 "지금까지 영화 세 편을 같이 봤어요" 한 문장으로 말한다.
 * 문장이 비면(기록 0개) 아무것도 그리지 않는다 — 아래 빈 상태 문구가 대신 말한다.
 */
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

type Props = {
  text: string;
  /** 문장 앞 작은 아이콘 (FontAwesome 이름) */
  icon?: string;
  /** 누르면 할 일이 있을 때만 (예: 처음 해낸 일 목록 보기) */
  onPress?: () => void;
};

export function SummaryLine({ text, icon = 'leaf', onPress }: Props) {
  if (!text) return null;
  const body = (
    <View style={s.card}>
      <FontAwesome name={icon as any} size={14} color="#4A8C6F" style={s.icon} />
      <Text style={s.text}>{text}</Text>
      {onPress ? <FontAwesome name="chevron-right" size={11} color="#A39682" /> : null}
    </View>
  );
  if (onPress) {
    return <TouchableOpacity activeOpacity={0.7} onPress={onPress}>{body}</TouchableOpacity>;
  }
  return body;
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginTop: 16, marginBottom: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#EDE8DF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1,
  },
  icon: { marginTop: 1 },
  text: { flex: 1, fontSize: 14, lineHeight: 21, color: '#4A4A4A', fontFamily: 'Pretendard' },
});
