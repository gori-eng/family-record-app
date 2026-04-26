import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { signInWithEmail } from '@core/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (error: any) {
      Alert.alert('로그인 실패', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Brand + Logo */}
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
              placeholder="비밀번호를 입력하세요"
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
              onPress={() => Alert.alert('준비 중', 'Google 로그인은 곧 지원될 예정이에요.')}>
              <FontAwesome name="google" size={18} color="#4285F4" />
              <Text style={s.socialText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.socialBtn, s.appleBtn]} activeOpacity={0.7}
              onPress={() => Alert.alert('준비 중', 'Apple 로그인은 곧 지원될 예정이에요.')}>
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
  brand: { alignItems: 'center', marginBottom: 48 },
  logoMark: { position: 'relative', marginBottom: 16 },
  logoBook: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: '#4A8C6F', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#4A8C6F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  logoLeaf: {
    position: 'absolute', top: -6, right: -6,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#EFF6F1', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  logo: {
    fontSize: 38, color: '#2D5A3F',
    fontFamily: 'Cafe24Ssurround', letterSpacing: -0.5,
    transform: [{ rotate: '-1deg' }],
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
  loginBtn: {
    backgroundColor: '#1F1F1F', borderRadius: 14,
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
