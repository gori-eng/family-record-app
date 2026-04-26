import React from 'react';
import { Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter, useSegments } from 'expo-router';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#C85A4A',
        tabBarInactiveTintColor: '#BFAE99',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0E8D8',
          paddingBottom: Platform.OS === 'ios' ? 20 : 4,
          height: Platform.OS === 'ios' ? 80 : 60,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarHideOnKeyboard: true,
        headerStyle: {
          backgroundColor: '#FFFDF0',
        },
        headerTintColor: '#2D2D2D',
        headerShadowVisible: false,
        animation: 'shift',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: '캘린더',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: '기록',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
        }}
        listeners={{
          tabPress: (e) => {
            // 이미 기록 탭에 있으면 카테고리 목록(index)으로 돌아가기
            const inRecords = segments[1] === 'records';
            const inSubPage = segments.length > 2;
            if (inRecords && inSubPage) {
              e.preventDefault();
              router.replace('/(tabs)/records');
            }
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
      {/* AI 비서 탭 숨김 */}
      <Tabs.Screen name="ai" options={{ href: null }} />
    </Tabs>
  );
}
