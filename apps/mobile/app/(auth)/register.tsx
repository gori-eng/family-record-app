import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { signUpWithEmail } from '@core/supabase';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password) { Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.'); return; }
    if (password !== confirmPassword) { Alert.alert('알림', '비밀번호가 일치하지 않습니다.'); return; }
    if (password.length < 6) { Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.'); return; }
    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      Alert.alert('가입 완료', '이메일 인증 후 로그인해주세요.', [
        { text: '확인', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error: any) {
      Alert.alert('가입 실패', error.message);
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        <View style={s.brand}>
          <View style={s.logoMark}>
            <View style={s.logoBook}>
              <FontAwesome name="book" size={28} color="#FFFFFF" />
            </View>
            <View style={s.logoLeaf}>
              <FontAwesome name="leaf" size={14} color="#3D7A5A" />
            </View>
          </View>
          <Text style={s.logo}>패밀로그</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>이메일</Text>
          <TextInput style={s.input} placeholder="example@email.com" placeholderTextColor="#B0B0B0"
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

          <Text style={s.label}>비밀번호</Text>
          <View style={s.passwordRow}>
            <TextInput style={s.passwordInput} placeholder="6자 이상 입력하세요" placeholderTextColor="#B0B0B0"
              value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
              <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={18} color="#B0B0B0" />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>비밀번호 확인</Text>
          <View style={s.passwordRow}>
            <TextInput style={s.passwordInput} placeholder="비밀번호를 다시 입력하세요" placeholderTextColor="#B0B0B0"
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
  brand: { alignItems: 'center', marginBottom: 48 },
  logoMark: { position: 'relative', marginBottom: 16 },
  logoBook: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#4A8C6F', justifyContent: 'center', alignItems: 'center', shadowColor: '#4A8C6F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  logoLeaf: { position: 'absolute', top: -6, right: -6, width: 28, height: 28, borderRadius: 14, backgroundColor: '#EFF6F1', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  logo: { fontSize: 38, color: '#2D5A3F', fontFamily: 'Cafe24Ssurround', letterSpacing: -0.5, transform: [{ rotate: '-1deg' }] },
  form: { marginBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, fontFamily: 'Pretendard' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, color: '#1F1F1F', marginBottom: 16, fontFamily: 'Pretendard' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', borderRadius: 14, marginBottom: 16 },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, color: '#1F1F1F', fontFamily: 'Pretendard' },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  submitBtn: { backgroundColor: '#1F1F1F', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { color: '#A0A0A0', fontSize: 14, fontFamily: 'Pretendard' },
  loginLink: { color: '#1F1F1F', fontSize: 14, fontWeight: '700', fontFamily: 'PretendardBold', textDecorationLine: 'underline' },
});
