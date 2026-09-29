/**
 * 이미 가족이 있는데 **하나 더** 더할 때 (친가 + 처가처럼).
 *
 * 온보딩 주소(`/onboarding`)는 가드가 "가족이 있으면 홈으로" 돌려보낸다.
 * 그래서 설정 아래에 같은 화면을 한 번 더 연다 — 본체는 `components/FamilySetup.tsx`.
 */
import { Stack } from 'expo-router';
import FamilySetup from '../../components/FamilySetup';

export default function AddFamilyScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <FamilySetup adding />
    </>
  );
}
