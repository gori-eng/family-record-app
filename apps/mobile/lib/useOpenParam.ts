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
import { useLocalSearchParams, useRouter } from 'expo-router';

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

/**
 * 홈 '바로 적기'에서 `new=1`을 싣고 오면 작성 폼을 한 번 연다.
 * 칩 이름이 "바로 적기"인데 화면만 열고 + 를 또 눌러야 했다 (제품 검토).
 */
export function useNewParam(open: () => void) {
  const { new: fresh } = useLocalSearchParams<{ new?: string }>();
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    // 파라미터가 지워지면 다음 '바로 적기'를 또 받을 수 있게 (탭 화면은 남아 있으니까)
    if (!fresh) { done.current = false; return; }
    if (done.current) return;
    done.current = true;
    // 화면이 다 그려진 다음 한 박자 뒤에 연다 (모달이 마운트 전에 열리지 않게)
    const t = setTimeout(() => { open(); router.setParams({ new: undefined } as any); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh]);
}
