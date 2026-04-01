import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { signInWithEmail } from '@core/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <FontAwesome name="users" size={40} color="#C85A4A" />
          </View>
          <Text style={styles.appName}>우리 가족</Text>
          <Text style={styles.tagline}>소중한 추억을 따스하게 담아보세요</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            placeholder="example@family.com"
            placeholderTextColor="#BFAE99"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            placeholder="비밀번호를 입력하세요"
            placeholderTextColor="#BFAE99"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? '로그인 중...' : '로그인'}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>또는</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Login */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton}>
              <FontAwesome name="google" size={20} color="#4285F4" />
              <Text style={styles.socialText}>Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.socialButton, styles.appleButton]}>
              <FontAwesome name="apple" size={20} color="#FFFFFF" />
              <Text style={styles.appleText}>Apple</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Register Link */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>계정이 없으신가요? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.registerLink}>회원가입</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF0',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFDAB9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#C85A4A',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#8B7355',
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C4A32',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8D8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D2D2D',
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#C85A4A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0E8D8',
  },
  dividerText: {
    color: '#BFAE99',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0E8D8',
    borderRadius: 12,
    paddingVertical: 14,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  appleButton: {
    backgroundColor: '#2D2D2D',
    borderColor: '#2D2D2D',
  },
  appleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#8B7355',
    fontSize: 14,
  },
  registerLink: {
    color: '#C85A4A',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
