import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';

const ROLES = [
  { icon: 'heartbeat', label: '건강 비서', color: '#FFB8B8', hint: '건강 관련 질문을 해보세요' },
  { icon: 'line-chart', label: '재무 컨설턴트', color: '#B8E6C8', hint: '지출 분석이나 재무 조언을 받아보세요' },
  { icon: 'star', label: '큐레이터', color: '#FFE4C4', hint: '영화, 책, 활동을 추천받아보세요' },
  { icon: 'file-text', label: '기록 요약', color: '#B8D4E6', hint: '기록을 요약하고 분석해드려요' },
] as const;

export default function AIScreen() {
  const [message, setMessage] = useState('');
  const [selectedRole, setSelectedRole] = useState<number | null>(null);

  const handleSend = () => {
    if (!message.trim()) {
      return;
    }
    const roleName = selectedRole !== null ? ROLES[selectedRole].label : 'AI 비서';
    Alert.alert(
      '준비 중',
      `${roleName} 기능은 곧 연결될 예정이에요.\n\n보내려는 메시지:\n"${message.trim()}"`,
    );
    setMessage('');
  };

  const handleRoleSelect = (index: number) => {
    setSelectedRole(selectedRole === index ? null : index);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.chatArea} contentContainerStyle={styles.chatContent} keyboardShouldPersistTaps="handled">
        {/* AI Welcome */}
        <View style={styles.aiMessage}>
          <View style={styles.aiAvatar}>
            <FontAwesome name="magic" size={16} color="#C05A4E" />
          </View>
          <View style={styles.aiMessageBubble}>
            <Text style={styles.aiMessageText}>
              안녕하세요! 저는 Familog AI 비서입니다. {'\n\n'}
              아래에서 역할을 선택하고 질문해보세요:{'\n'}
              - 건강 비서: "아빠 건강검진 결과 분석해줘"{'\n'}
              - 재무 컨설턴트: "이번 달 지출 패턴 분석해줘"{'\n'}
              - 큐레이터: "가족이 좋아할 영화 추천해줘"{'\n'}
              - 기록 요약: "지우의 첫 해 성장 요약해줘"
            </Text>
          </View>
        </View>

        {/* Role cards */}
        <View style={styles.roleCards}>
          {ROLES.map((role, i) => {
            const isSelected = selectedRole === i;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.roleCard, isSelected && styles.roleCardSelected]}
                onPress={() => handleRoleSelect(i)}
                activeOpacity={0.7}
              >
                <View style={[styles.roleIcon, { backgroundColor: isSelected ? role.color : role.color + '80' }]}>
                  <FontAwesome name={role.icon as any} size={18} color={isSelected ? '#FFFFFF' : '#4A4A4A'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleLabel, isSelected && styles.roleLabelSelected]}>{role.label}</Text>
                  {isSelected && <Text style={styles.roleHint}>{role.hint}</Text>}
                </View>
                {isSelected && <FontAwesome name="check-circle" size={18} color="#C05A4E" />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Selected Role Indicator */}
      {selectedRole !== null && (
        <View style={styles.selectedIndicator}>
          <FontAwesome name={ROLES[selectedRole].icon as any} size={12} color="#C05A4E" />
          <Text style={styles.selectedIndicatorText}>{ROLES[selectedRole].label} 모드</Text>
          <TouchableOpacity onPress={() => setSelectedRole(null)} activeOpacity={0.7}>
            <FontAwesome name="times" size={14} color="#BFAE99" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={[styles.input, message.length > 40 && styles.inputMultiline]}
          placeholder={selectedRole !== null ? ROLES[selectedRole].hint : 'AI 비서에게 물어보세요...'}
          placeholderTextColor="#BFAE99"
          value={message}
          onChangeText={setMessage}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={500}
          numberOfLines={3}
        />
        <TouchableOpacity
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim()}
        >
          <FontAwesome name="send" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F8F5' },
  chatArea: { flex: 1 },
  chatContent: { padding: 20 },
  aiMessage: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  aiAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFDAB9', justifyContent: 'center', alignItems: 'center',
  },
  aiMessageBubble: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#EAEAEA',
  },
  aiMessageText: { fontSize: 14, lineHeight: 22, color: '#1F1F1F' },
  roleCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleCard: {
    width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#EAEAEA',
  },
  roleCardSelected: {
    borderColor: '#C05A4E', borderWidth: 2, backgroundColor: '#FFF8F5',
  },
  roleIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  roleLabel: { fontSize: 13, fontWeight: '600', color: '#1F1F1F' },
  roleLabelSelected: { color: '#C05A4E' },
  roleHint: { fontSize: 10, color: '#888888', marginTop: 2 },
  selectedIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#FFF0ED',
  },
  selectedIndicatorText: { fontSize: 12, fontWeight: '600', color: '#C05A4E', flex: 1 },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#EAEAEA',
  },
  input: {
    flex: 1, backgroundColor: '#F8F4E8', borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: '#1F1F1F',
  },
  inputMultiline: {
    maxHeight: 80,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#C05A4E', justifyContent: 'center', alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },
});
