/**
 * 재설정 링크로 돌아온 뒤 새 비밀번호를 정하는 화면.
 *
 * 링크를 누르면 Supabase가 잠깐짜리 "복구 세션"을 만들어 준다. 그 세션이 있는 동안만 새 비밀번호를 받는다.
 * 가드(lib/authGate)는 이 화면을 예외로 두어 홈으로 끌고 가지 않는다.
 */
import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { showAlert } from '../../components/AppAlert';
import { getSession, updatePassword } from '@core/supabase';
import { authErrorMessage, goAfterAuth } from '../../lib/afterAuth';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [ready, setReady] = useState<boolean | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  // 링크에 실려 온 복구 세션이 있는지 (주소의 토큰은 supabase-js가 읽는다)
  useEffect(() => {
    let tries = 0;
    const check = async () => {
      const s = await getSession().catch(() => null);
      if (s) { setReady(true); return; }
      if (tries++ < 10) setTimeout(check, 300);
      else setReady(false);
    };
    check();
  }, []);

  const save = async () => {
    if (pw.length < 6) { showAlert('비밀번호를 조금만 더 길게', '6자 이상이면 돼요.'); return; }
    if (pw !== pw2) { showAlert('비밀번호가 서로 달라요', '확인 칸에 같은 비밀번호를 한 번 더 적어주세요.'); return; }
    setBusy(true);
    try {
      await updatePassword(pw);
      const s = await getSession();
      const uid = s?.user?.id;
      showAlert('비밀번호를 바꿨어요', '이제 새 비밀번호로 들어와요.', [
        { text: '확인', onPress: async () => router.replace((uid ? await goAfterAuth(uid) : '/(auth)/login') as never) },
      ]);
    } catch (e) {
      showAlert('바꾸지 못했어요', authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.form}>
        {ready === null ? (
          <Text style={s.desc}>링크를 확인하고 있어요</Text>
        ) : ready === false ? (
          <>
            <Text style={s.title}>링크가 더 이상 유효하지 않아요</Text>
            <Text style={s.desc}>재설정 링크는 잠깐만 쓸 수 있어요. 다시 한 번 보내드릴게요.</Text>
            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={s.btn}><Text style={s.btnText}>링크 다시 받기</Text></TouchableOpacity>
            </Link>
          </>
        ) : (
          <>
            <Text style={s.title}>새 비밀번호를 정해주세요</Text>
            <Text style={s.label}>새 비밀번호</Text>
            <View style={s.row}>
              <TextInput style={s.input} placeholder="6자 이상이면 돼요" placeholderTextColor="#A39682"
                value={pw} onChangeText={setPw} secureTextEntry={!show} autoFocus />
              <TouchableOpacity style={s.eye} onPress={() => setShow((v) => !v)} activeOpacity={0.7}>
                <FontAwesome name={show ? 'eye' : 'eye-slash'} size={18} color="#A39682" />
              </TouchableOpacity>
            </View>
            <Text style={s.label}>한 번 더</Text>
            <TextInput style={[s.input, s.inputSolo]} placeholder="같은 비밀번호를 한 번 더" placeholderTextColor="#A39682"
              value={pw2} onChangeText={setPw2} secureTextEntry={!show} />
            <TouchableOpacity style={[s.btn, busy && s.btnOff]} onPress={save} disabled={busy} activeOpacity={0.8}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.btnText}>비밀번호 바꾸기</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5', justifyContent: 'center' },
  form: { paddingHorizontal: 28 },
  title: { fontSize: 22, color: '#1F1F1F', fontFamily: 'PretendardBold', marginBottom: 20 },
  desc: { fontSize: 14, color: '#4A4A4A', fontFamily: 'Pretendard', lineHeight: 21, marginBottom: 24 },
  label: { fontSize: 13, color: '#4A4A4A', fontFamily: 'PretendardBold', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 12, marginBottom: 20 },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1F1F1F', fontFamily: 'Pretendard' },
  inputSolo: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE8DF', borderRadius: 12, marginBottom: 24 },
  eye: { paddingHorizontal: 14 },
  btn: { backgroundColor: '#4A8C6F', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnOff: { opacity: 0.6 },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'PretendardBold' },
});
