import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';

export default function AIScreen() {
  const [message, setMessage] = useState('');

  return (
    <View style={styles.container}>
      <ScrollView style={styles.chatArea} contentContainerStyle={styles.chatContent}>
        {/* AI Welcome */}
        <View style={styles.aiMessage}>
          <View style={styles.aiAvatar}>
            <FontAwesome name="magic" size={16} color="#C85A4A" />
          </View>
          <View style={styles.aiMessageBubble}>
            <Text style={styles.aiMessageText}>
              안녕하세요! 저는 우리 가족 AI 비서입니다. {'\n\n'}
              저에게 물어볼 수 있어요:{'\n'}
              - 건강 비서: "아빠 건강검진 결과 분석해줘"{'\n'}
              - 재무 컨설턴트: "이번 달 지출 패턴 분석해줘"{'\n'}
              - 큐레이터: "가족이 좋아할 영화 추천해줘"{'\n'}
              - 기록 요약: "지우의 첫 해 성장 요약해줘"
            </Text>
          </View>
        </View>

        {/* Role cards */}
        <View style={styles.roleCards}>
          {[
            { icon: 'heartbeat', label: '건강 비서', color: '#FFB8B8' },
            { icon: 'line-chart', label: '재무 컨설턴트', color: '#B8E6C8' },
            { icon: 'star', label: '큐레이터', color: '#FFE4C4' },
            { icon: 'file-text', label: '기록 요약', color: '#B8D4E6' },
          ].map((role, i) => (
            <TouchableOpacity key={i} style={styles.roleCard}>
              <View style={[styles.roleIcon, { backgroundColor: role.color }]}>
                <FontAwesome name={role.icon as any} size={18} color="#5C4A32" />
              </View>
              <Text style={styles.roleLabel}>{role.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="AI 비서에게 물어보세요..."
          placeholderTextColor="#BFAE99"
          value={message}
          onChangeText={setMessage}
        />
        <TouchableOpacity style={styles.sendButton}>
          <FontAwesome name="send" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0' },
  chatArea: { flex: 1 },
  chatContent: { padding: 20 },
  aiMessage: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  aiAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FFDAB9', justifyContent: 'center', alignItems: 'center',
  },
  aiMessageBubble: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#F0E8D8',
  },
  aiMessageText: { fontSize: 14, lineHeight: 22, color: '#2D2D2D' },
  roleCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleCard: {
    width: '47%', flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#F0E8D8',
  },
  roleIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  roleLabel: { fontSize: 13, fontWeight: '600', color: '#2D2D2D' },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#F0E8D8',
  },
  input: {
    flex: 1, backgroundColor: '#F8F4E8', borderRadius: 24,
    paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: '#2D2D2D',
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#C85A4A', justifyContent: 'center', alignItems: 'center',
  },
});
