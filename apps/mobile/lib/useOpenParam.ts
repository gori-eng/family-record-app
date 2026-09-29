/**
 * 주소에 실려 온 "이 기록을 열어줘"를 받아 상세를 한 번 열어준다.
 *
 * 홈 최근 기록·가족 소식·통합 검색이 기록 화면으로 보낼 때 `openId`(기록 id)를 싣는다.
 * 옛 방식 `openTitle`(제목)도 받는다 — 제목이 같은 기록이 둘이면 엉뚱한 걸 열 수 있어서 id가 우선이다.
 *
 * **한 번만 연다.** 예전엔 목록이 바뀔 때마다(새 기록을 쓸 때마다) 상세가 다시 열렸다 (점검 B5).
 * 목록이 아직 안 불러와졌으면 불러와질 때까지 기다렸다가 연다.
 */
import { useEffect, useRef } from 'react';
import { useLocalSearchParams } from 'expo-router';

export function useOpenParam<T extends { id: string; title: string }>(
  items: T[],
  open: (item: T) => void
) {
  const { openId, openTitle } = useLocalSearchParams<{ openId?: string; openTitle?: string }>();
  const key = openId || openTitle || '';
  const openedFor = useRef<string>('');
  useEffect(() => {
    if (!key || openedFor.current === key) return;
    const match = openId ? items.find((i) => i.id === openId) : items.find((i) => i.title === openTitle);
    if (!match) return;
    openedFor.current = key;
    open(match);
    // open은 화면마다 매번 새로 만들어지는 함수라 넣지 않는다 (넣으면 매번 다시 돈다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, items]);
}
