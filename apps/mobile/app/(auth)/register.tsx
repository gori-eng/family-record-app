import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { showAlert } from '../../components/AppAlert';
import { Link, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { signUpWithEmail } from '@core/supabase';
import { goAfterAuth, authErrorMessage } from '../../lib/afterAuth';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password) { showAlert('이메일과 비밀번호를 적어주세요', '둘 다 있어야 가입할 수 있어요.'); return; }
    if (password !== confirmPassword) { showAlert('비밀번호가 서로 달라요', '확인 칸에 같은 비밀번호를 한 번 더 적어주세요.'); return; }
    if (password.length < 6) { showAlert('비밀번호를 조금만 더 길게', '6자 이상이면 돼요.'); return; }
    setLoading(true);
    try {
      const data = await signUpWithEmail(email.trim(), password);
      // 이메일 확인이 꺼져 있으면 가입과 동시에 세션이 생긴다 → 바로 들어간다
      const userId = data?.session ? (data.user?.id ?? data.session.user?.id) : null;
      if (userId) {
        const to = await goAfterAuth(userId);
        router.replace(to as never);
        return;
      }
      // 확인 메일을 기다려야 하는 경우
      showAlert('가입했어요', '메일로 보낸 확인 링크를 누르고 로그인해주세요.', [
        { text: '확인', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error: any) {
      showAlert('가입하지 못했어요', authErrorMessage(error));
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        <View style={s.brand}>
          <Text style={s.logo}>familog</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>이메일</Text>
          <TextInput style={s.input} placeholder="example@email.com" placeholderTextColor="#B0B0B0"
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

          <Text style={s.label}>비밀번호</Text>
          <View style={s.passwordRow}>
            <TextInput style={s.passwordInput} placeholder="6자 이상이면 돼요" placeholderTextColor="#B0B0B0"
              value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
              <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={18} color="#B0B0B0" />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>비밀번호 확인</Text>
          <View style={s.passwordRow}>
            <TextInput style={s.passwordInput} placeholder="한 번 더 적어주세요" placeholderTextColor="#B0B0B0"
              value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />
          </View>

          <TouchableOpacity style={[s.submitBtn, loading && s.submitBtnDisabled]} onPress={handleRegister}
            disabled={loading} activeOpacity={0.8}>
            <Text style={s.submitBtnText}>{loading ? '가입 중...' : '가입하기'}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.loginRow}>
          <Text style={s.loginText}>이미 계정이 있으신가요? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity><Text style={s.loginLink}>로그인</Text></TouchableOpacity>
          </Link>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 48 },
  brand: { alignItems: 'center', marginBottom: 52 },
  logo: { fontSize: 48, color: '#2D5A3F', fontFamily: 'GaeguBold', letterSpacing: 1, transform: [{ rotate: '-2deg' }] },
  form: { marginBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, fontFamily: 'Pretendard' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, color: '#1F1F1F', marginBottom: 16, fontFamily: 'Pretendard' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 14, marginBottom: 16 },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, color: '#1F1F1F', fontFamily: 'Pretendard' },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  submitBtn: { backgroundColor: '#4A8C6F', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { color: '#A0A0A0', fontSize: 14, fontFamily: 'Pretendard' },
  loginLink: { color: '#1F1F1F', fontSize: 14, fontWeight: '700', fontFamily: 'PretendardBold', textDecorationLine: 'underline' },
});
