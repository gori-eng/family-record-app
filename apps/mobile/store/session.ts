/**
 * 지금 로그인한 사람과 그 가족.
 *
 * 그동안 `constants/family.ts`에 `MEMBERS = ['지수', ...]`, `CURRENT_USER = '지수'`로
 * 박아두고 썼다. 이제 DB에서 온다.
 *
 * 화면은 여전히 **이름**으로 사람을 다룬다(기록의 `recordedBy` / `ownerMember`).
 * 그래서 이 스토어가 "이름 목록"과 "지금 나의 이름"을 그대로 제공해,
 * 화면 코드를 거의 고치지 않아도 되게 한다.
 */
import { create } from 'zustand';
import {
  fetchMyFamily, fetchMembers,
  type Family, type FamilyMember,
} from '@core/supabase';

type SessionState = {
  /** 로그인한 계정의 id. 없으면 로그아웃 상태 */
  userId: string | null;
  family: Family | null;
  members: FamilyMember[];
  /** 지금 나에 해당하는 구성원 */
  me: FamilyMember | null;
  /** 첫 조회가 끝났는지 — 끝나기 전에는 화면을 판단하지 않는다 */
  ready: boolean;
  loading: boolean;
  error: string | null;

  setUserId: (id: string | null) => void;
  /** 로그인 후 가족·구성원을 불러온다 */
  refresh: () => Promise<void>;
  /** 가족을 막 만들었거나 합류했을 때 바로 반영 */
  setFamily: (family: Family, members: FamilyMember[]) => void;
  clear: () => void;
};

export const useSession = create<SessionState>((set, get) => ({
  userId: null,
  family: null,
  members: [],
  me: null,
  ready: false,
  loading: false,
  error: null,

  setUserId: (userId) => set({ userId }),

  refresh: async () => {
    const userId = get().userId;
    if (!userId) {
      set({ family: null, members: [], me: null, ready: true });
      return;
    }
    set({ loading: true, error: null });
    try {
      const family = await fetchMyFamily();
      if (!family) {
        // 로그인은 했지만 아직 가족이 없다 → 온보딩으로 보낸다
        set({ family: null, members: [], me: null, ready: true, loading: false });
        return;
      }
      const members = await fetchMembers(family.id);
      set({
        family,
        members,
        me: members.find((m) => m.user_id === userId) ?? null,
        ready: true,
        loading: false,
      });
    } catch (e: any) {
      set({ error: String(e?.message ?? e), ready: true, loading: false });
    }
  },

  setFamily: (family, members) =>
    set({
      family,
      members,
      me: members.find((m) => m.user_id === get().userId) ?? null,
      ready: true,
    }),

  clear: () => set({ userId: null, family: null, members: [], me: null, ready: true }),
}));

// ── 화면이 쓰는 모양 ──────────────────────────────────────
/**
 * 가족 구성원 이름 목록. 예전 `MEMBERS` 상수를 대신한다.
 * 아직 가족을 못 불러왔으면 빈 배열이다.
 */
export function useMemberNames(): string[] {
  return useSession((s) => s.members).map((m) => m.display_name);
}

/** 지금 나의 짧은 이름 (기록에 뜨는 이름). 예전 `CURRENT_USER` 상수를 대신한다. */
export function useCurrentUserName(): string {
  return useSession((s) => s.me?.display_name ?? '');
}

/** 지금 나의 전체 이름 (프로필에 뜨는 이름) */
export function useCurrentFullName(): string {
  return useSession((s) => s.me?.full_name ?? s.me?.display_name ?? '');
}

/** 짧은 이름 → 전체 이름. 구성원 목록·프로필에서 쓴다. */
export function useFullNameOf(displayName: string): string {
  return useSession(
    (s) => s.members.find((m) => m.display_name === displayName)?.full_name ?? displayName
  );
}

/** 훅 밖(이벤트 핸들러 등)에서 필요할 때 */
export const currentUserName = () => useSession.getState().me?.display_name ?? '';
export const currentFamilyId = () => useSession.getState().family?.id ?? null;
export const currentUserId = () => useSession.getState().userId;
