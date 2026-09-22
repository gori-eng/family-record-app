/**
 * 앱 공용 알림창.
 *
 * React Native의 `Alert.alert`은 웹에서 **아무 일도 하지 않는다.**
 * react-native-web의 구현이 빈 함수이기 때문이다.
 *
 *   // node_modules/react-native-web/dist/exports/Alert/index.js
 *   class Alert { static alert() {} }
 *
 * 그래서 웹에서는 확인창이 뜨지 않고, 버튼의 onPress도 실행되지 않는다.
 * "정말 삭제할까요?" 같은 확인 절차가 통째로 무력화되므로 삭제·로그아웃이
 * 아예 동작하지 않았다. 이 파일이 그 대체품이고, Web/iOS/Android에서 똑같이 동작한다.
 *
 * 사용법 — `Alert.alert`과 시그니처가 같아서 그대로 바꿔 쓰면 된다.
 *   showAlert('삭제할까요?', '되돌릴 수 없어요', [
 *     { text: '취소', style: 'cancel' },
 *     { text: '삭제', style: 'destructive', onPress: doDelete },
 *   ]);
 *
 * `<AlertHost />`를 app/_layout.tsx에 한 번 올려두어야 화면에 그려진다.
 */
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { create } from 'zustand';

export type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AlertState = {
  open: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  show: (title: string, message?: string, buttons?: AlertButton[]) => void;
  close: () => void;
};

const useAlertStore = create<AlertState>((set) => ({
  open: false,
  title: '',
  message: undefined,
  buttons: [],
  show: (title, message, buttons) =>
    set({
      open: true,
      title,
      message,
      // 버튼을 안 주면 확인 버튼 하나만 보여준다
      buttons: buttons?.length ? buttons : [{ text: '확인' }],
    }),
  close: () => set({ open: false }),
}));

/** 어디서든 호출 가능한 알림창. Alert.alert 대신 이것을 쓴다. */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  useAlertStore.getState().show(title, message, buttons);
}

/** app/_layout.tsx에 한 번만 올려둔다. */
export function AlertHost() {
  const { open, title, message, buttons, close } = useAlertStore();

  const press = (b: AlertButton) => {
    close();
    // 닫는 애니메이션 없이 즉시 실행해도 되지만, 상태 갱신이 겹치지 않게 한 틱 미룬다
    if (b.onPress) setTimeout(b.onPress, 0);
  };

  return (
    <Modal visible={open} transparent statusBarTranslucent animationType="fade" onRequestClose={close}>
      <View style={s.wrap}>
        {/* 바깥을 눌러도 닫히지만, 버튼 콜백은 실행되지 않는다 (취소와 같은 효과) */}
        <Pressable style={s.backdrop} onPress={close} />
        <View style={s.card}>
          <Text style={s.title}>{title}</Text>
          {message ? <Text style={s.message}>{message}</Text> : null}
          <View style={[s.btnRow, buttons.length > 2 && s.btnCol]}>
            {buttons.map((b, i) => {
              const danger = b.style === 'destructive';
              const cancel = b.style === 'cancel';
              return (
                <TouchableOpacity
                  key={`${b.text}-${i}`}
                  style={[s.btn, cancel && s.btnCancel, danger && s.btnDanger]}
                  activeOpacity={0.7}
                  onPress={() => press(b)}>
                  <Text style={[s.btnText, cancel && s.btnTextCancel, danger && s.btnTextDanger]}>
                    {b.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingHorizontal: 22, paddingTop: 24, paddingBottom: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 12,
  },
  title: {
    fontSize: 17, color: '#1F1F1F', fontFamily: 'PretendardBold',
    letterSpacing: -0.3, textAlign: 'center',
  },
  message: {
    fontSize: 14, color: '#4A4A4A', fontFamily: 'Pretendard',
    lineHeight: 21, textAlign: 'center', marginTop: 10,
  },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 22 },
  btnCol: { flexDirection: 'column' },
  btn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: '#4A8C6F', alignItems: 'center', justifyContent: 'center',
  },
  btnCancel: { backgroundColor: '#F1EFEA' },
  btnDanger: { backgroundColor: '#D94040' },
  btnText: { fontSize: 15, color: '#FFFFFF', fontFamily: 'PretendardBold' },
  btnTextCancel: { color: '#4A4A4A' },
  btnTextDanger: { color: '#FFFFFF' },
});
