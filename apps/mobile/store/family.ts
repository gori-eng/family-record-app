/**
 * 화면이 보는 "우리 가족".
 *
 * ── 왜 이 파일이 필요한가 ──────────────────────────────
 * 가족 정보가 나올 수 있는 곳이 두 군데다.
 *   1. 로그인해서 불러온 **진짜 가족** (`store/session.ts` ← Supabase)
 *   2. 로그인 전에 쓰는 **예시 가족** (`constants/family.ts`)
 *
 * 화면마다 "지금은 어느 쪽이지?"를 따지게 두면 열세 군데가 전부 같은 분기를
 * 갖게 된다. 그래서 그 판단을 여기 한 곳에 모으고, 화면은 그냥 "우리 가족"을 묻는다.
 *
 * **진짜가 있으면 진짜, 없으면 예시.** 로그인 없이도 앱을 둘러볼 수 있어야
 * 하기 때문이다 (CLAUDE.md §2 "인증은 후순위").
 *
 * ⚠️ Supabase 연동이 끝나고 `REQUIRE_AUTH`를 켜면 예시 쪽은 쓸 일이 없어진다.
 *    그때 `constants/family.ts`와 이 파일의 폴백을 함께 지우면 된다.
 */
import { useMemo } from 'react';
import { useSession } from './session';
import {
  FAMILY_MEMBERS, MEMBERS as SAMPLE_MEMBERS, CURRENT_USER as SAMPLE_ME,
  MEMBER_COLORS, fullNameOf as sampleFullNameOf,
} from '../constants/family';

/** 구성원 아바타·배지 색이 모자랄 때 돌려쓸 색 */
const FALLBACK_COLORS = ['#E8D0C0', '#B0C8D8', '#F0B8B8', '#B8D8C0', '#D8CDB8', '#E0B0B0'];

/**
 * 가족 구성원의 **짧은 이름** 목록 (기록의 `recordedBy`가 가리키는 그 이름).
 * 예전 `MEMBERS` 상수를 대신한다.
 */
export function useFamilyMembers(): string[] {
  const members = useSession((s) => s.members);
  return useMemo(
    () => (members.length ? members.map((m) => m.display_name) : SAMPLE_MEMBERS),
    [members]
  );
}

/** 지금 나의 짧은 이름. 예전 `CURRENT_USER` 상수를 대신한다. */
export function useMe(): string {
  const me = useSession((s) => s.me);
  return me?.display_name ?? SAMPLE_ME;
}

/** 짧은 이름 → 프로필에 쓸 전체 이름 */
export function useFullName(displayName: string): string {
  const members = useSession((s) => s.members);
  return useMemo(() => {
    const found = members.find((m) => m.display_name === displayName);
    if (found) return found.full_name || found.display_name;
    return members.length ? displayName : sampleFullNameOf(displayName);
  }, [members, displayName]);
}

export type MemberCard = {
  display: string;
  full: string;
  color: string;
  role: string;
  /** 로그인한 나 자신인지 */
  isMe: boolean;
};

/** DB의 역할 값을 화면에 쓰는 말로 (CLAUDE.md 2026-04-28 항목) */
const ROLE_LABEL: Record<string, string> = {
  admin: '모', parent: '부', elder: '조부모', child: '자녀', guest: '손님',
};

/** 구성원 목록 화면이 쓰는 모양 — 이름·전체이름·색·역할 */
export function useMemberCards(): MemberCard[] {
  const members = useSession((s) => s.members);
  const me = useSession((s) => s.me);
  return useMemo(() => {
    if (!members.length) {
      // 예시 가족 — 역할은 constants에 없으므로 순서대로 넣는다
      const sampleRoles = ['모', '부', '자녀', '자녀'];
      return FAMILY_MEMBERS.map((m, i) => ({
        display: m.display,
        full: m.full,
        color: m.color,
        role: sampleRoles[i] ?? '가족',
        isMe: m.display === SAMPLE_ME,
      }));
    }
    return members.map((m, i) => ({
      display: m.display_name,
      full: m.full_name || m.display_name,
      color: MEMBER_COLORS[m.display_name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      role: ROLE_LABEL[m.role] ?? '가족',
      isMe: !!me && m.id === me.id,
    }));
  }, [members, me]);
}

export type FamilyInfo = {
  /** 가족 이름. 진짜가 없으면 '우리 가족' */
  name: string;
  /** 초대 코드. 진짜가 없으면 null — 화면은 이걸로 "아직 없음"을 판단한다 */
  inviteCode: string | null;
  memberCount: number;
  /** DB에서 불러온 진짜 가족인지. 화면에서 "예시입니다" 표시에 쓴다 */
  isReal: boolean;
};

/**
 * 설정 화면이 쓰는 가족 한 줄 요약.
 *
 * `isReal`이 중요하다 — 이게 `false`면 화면에 보이는 값은 **예시**다.
 * 예전에는 이 구분이 없어서 로그인이 됐는지 눈으로 알 수 없었다.
 */
export function useFamilyInfo(): FamilyInfo {
  const family = useSession((s) => s.family);
  const members = useSession((s) => s.members);
  if (!family) {
    return { name: '우리 가족', inviteCode: null, memberCount: SAMPLE_MEMBERS.length, isReal: false };
  }
  return {
    name: family.name,
    inviteCode: family.invite_code,
    memberCount: members.length,
    isReal: true,
  };
}

/** 훅 밖(이벤트 핸들러 등)에서 지금 나의 이름이 필요할 때 */
export const meName = (): string =>
  useSession.getState().me?.display_name ?? SAMPLE_ME;
