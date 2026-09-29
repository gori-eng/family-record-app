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
  fetchMyFamilies, fetchMembers,
  type Family, type FamilyMember,
} from '@core/supabase';
import { getSync, setSync } from '../lib/storage';

/**
 * 마지막에 보던 가족 — 다음에 앱을 열어도 그 가족으로 연다.
 * 계정마다 따로 기억한다(한 기기에서 두 사람이 번갈아 쓸 수 있으므로).
 * 저장이 막힌 환경이면 그냥 첫 가족으로 연다.
 */
const lastFamilyKey = (userId: string) => `familog.currentFamily.${userId}`;
// 웹·휴대폰 공용 서랍 (lib/storage.ts) — 예전엔 localStorage라 휴대폰에선 안 남았다
const rememberFamily = (userId: string, familyId: string) => setSync(lastFamilyKey(userId), familyId);
const recallFamily = (userId: string): string | null => getSync(lastFamilyKey(userId));

type SessionState = {
  /** 로그인한 계정의 id. 없으면 로그아웃 상태 */
  userId: string | null;
  /**
   * 내가 속한 가족 **전부** — 친가, 처가(시댁)처럼 여럿일 수 있다
   * (2026-09-29 운영자 결정). 구글 계정 전환처럼 이 중 하나를 골라 본다.
   */
  families: Family[];
  /** 지금 보고 있는 가족. 화면의 기록·일정·가계부는 전부 이 가족 것이다 */
  family: Family | null;
  members: FamilyMember[];
  /** 지금 가족에서의 나 */
  me: FamilyMember | null;
  /** 첫 조회가 끝났는지 — 끝나기 전에는 화면을 판단하지 않는다 */
  ready: boolean;
  loading: boolean;
  error: string | null;

  setUserId: (id: string | null) => void;
  /** 로그인 후 가족 목록을 불러오고, 마지막에 보던 가족을 연다 */
  refresh: () => Promise<void>;
  /** 다른 가족으로 바꿔 본다 */
  switchFamily: (familyId: string) => Promise<void>;
  /** 가족을 막 만들었거나 합류했을 때 — 목록에 넣고 그 가족으로 바꾼다 */
  setFamily: (family: Family, members: FamilyMember[]) => void;
  /** 내 프로필을 DB에 저장한 뒤 화면에도 바로 반영한다 (다시 불러오지 않고) */
  patchMe: (patch: Partial<Pick<FamilyMember, 'full_name' | 'avatar_url' | 'display_name'>>) => void;
  clear: () => void;
};

export const useSession = create<SessionState>((set, get) => ({
  userId: null,
  families: [],
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
      set({ families: [], family: null, members: [], me: null, ready: true });
      return;
    }
    set({ loading: true, error: null });
    try {
      const families = await fetchMyFamilies();
      if (!families.length) {
        // 로그인은 했지만 아직 가족이 없다 → 온보딩으로 보낸다
        set({ families: [], family: null, members: [], me: null, ready: true, loading: false });
        return;
      }
      // 마지막에 보던 가족이 아직 목록에 있으면 그 가족, 아니면 첫 가족
      const lastId = recallFamily(userId);
      const family = families.find((f) => f.id === lastId) ?? families[0];
      const members = await fetchMembers(family.id);
      set({
        families,
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

  switchFamily: async (familyId) => {
    const { userId, families, family: current } = get();
    if (!userId || current?.id === familyId) return;
    const next = families.find((f) => f.id === familyId);
    if (!next) return;
    rememberFamily(userId, familyId);
    // 구성원을 불러오는 동안 **예전 가족의 구성원이 새 가족 이름 아래 보이지 않게** 먼저 비운다
    set({ family: next, members: [], me: null });
    const members = await fetchMembers(familyId);
    // 그사이 또 바꿨으면 늦게 온 결과는 버린다
    if (get().family?.id !== familyId) return;
    set({ members, me: members.find((m) => m.user_id === userId) ?? null });
  },

  setFamily: (family, members) => {
    const userId = get().userId;
    if (userId) rememberFamily(userId, family.id);
    const families = get().families.some((f) => f.id === family.id)
      ? get().families
      : [...get().families, family];
    set({
      families,
      family,
      members,
      me: members.find((m) => m.user_id === userId) ?? null,
      ready: true,
    });
  },

  patchMe: (patch) => {
    const me = get().me;
    if (!me) return;
    const next = { ...me, ...patch };
    set({ me: next, members: get().members.map((m) => (m.id === me.id ? next : m)) });
  },

  clear: () => set({ userId: null, families: [], family: null, members: [], me: null, ready: true }),
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

/** 내가 속한 가족 목록 — 가족 바꾸기 화면에서 쓴다 */
export function useMyFamilies(): Family[] {
  return useSession((s) => s.families);
}
