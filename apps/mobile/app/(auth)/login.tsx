import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { showAlert } from '../../components/AppAlert';
import { Link, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { signInWithEmail } from '@core/supabase';
import { goAfterAuth, authErrorMessage } from '../../lib/afterAuth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('이메일과 비밀번호를 적어주세요', '둘 다 있어야 들어갈 수 있어요.');
      return;
    }
    setLoading(true);
    try {
      const data = await signInWithEmail(email.trim(), password);
      const userId = data?.user?.id ?? data?.session?.user?.id;
      if (!userId) {
        showAlert('로그인이 끝나지 않았어요', '잠시 뒤에 다시 해주세요.');
        return;
      }
      // 가드(`REQUIRE_AUTH`)가 꺼져 있어도 스스로 들어간다 — lib/afterAuth.ts 참조
      const to = await goAfterAuth(userId);
      router.replace(to as never);
    } catch (error: unknown) {
      showAlert('로그인하지 못했어요', authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Brand */}
        <View style={s.brand}>
          <Text style={s.logo}>familog</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <Text style={s.label}>이메일</Text>
          <TextInput
            style={s.input}
            placeholder="example@email.com"
            placeholderTextColor="#B0B0B0"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={s.label}>비밀번호</Text>
          <View style={s.passwordRow}>
            <TextInput
              style={s.passwordInput}
              placeholder="비밀번호"
              placeholderTextColor="#B0B0B0"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
              <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={18} color="#B0B0B0" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.loginBtn, loading && s.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={s.loginBtnText}>{loading ? '로그인 중...' : '로그인'}</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>또는</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Social */}
          <View style={s.socialRow}>
            <TouchableOpacity style={s.socialBtn} activeOpacity={0.7}
              onPress={() => showAlert('구글 로그인은 준비 중이에요', '지금은 이메일로 들어와 주세요.')}>
              <FontAwesome name="google" size={18} color="#4285F4" />
              <Text style={s.socialText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.socialBtn, s.appleBtn]} activeOpacity={0.7}
              onPress={() => showAlert('Apple 로그인은 준비 중이에요', '지금은 이메일로 들어와 주세요.')}>
              <FontAwesome name="apple" size={18} color="#FFFFFF" />
              <Text style={s.appleText}>Apple</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Register */}
        <View style={s.registerRow}>
          <Text style={s.registerText}>계정이 없으신가요? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity><Text style={s.registerLink}>회원가입</Text></TouchableOpacity>
          </Link>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 48 },

  // Brand
  brand: { alignItems: 'center', marginBottom: 52 },
  logo: {
    fontSize: 48, color: '#2D5A3F',
    fontFamily: 'GaeguBold', letterSpacing: 1,
    transform: [{ rotate: '-2deg' }],
  },

  // Form
  form: { marginBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, fontFamily: 'Pretendard' },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15,
    fontSize: 16, color: '#1F1F1F', marginBottom: 16, fontFamily: 'Pretendard',
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA',
    borderRadius: 14, marginBottom: 20,
  },
  passwordInput: { flex: 1, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, color: '#1F1F1F', fontFamily: 'Pretendard' },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  // 주 버튼은 §9 Primary(세이지 그린). 검은색이면 바로 아래 Apple 버튼과 구분되지 않았다
  loginBtn: {
    backgroundColor: '#4A8C6F', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  loginBtnDisabled: { opacity: 0.5 },
  loginBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'PretendardBold' },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EAEAEA' },
  dividerText: { color: '#B0B0B0', paddingHorizontal: 16, fontSize: 13, fontFamily: 'Pretendard' },

  // Social
  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA',
    borderRadius: 14, paddingVertical: 14,
  },
  socialText: { fontSize: 14, fontWeight: '600', color: '#1F1F1F', fontFamily: 'Pretendard' },
  appleBtn: { backgroundColor: '#1F1F1F', borderColor: '#1F1F1F' },
  appleText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', fontFamily: 'Pretendard' },

  // Register
  registerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { color: '#A0A0A0', fontSize: 14, fontFamily: 'Pretendard' },
  registerLink: { color: '#1F1F1F', fontSize: 14, fontWeight: '700', fontFamily: 'PretendardBold', textDecorationLine: 'underline' },
});
