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
import { useMemo, useCallback } from 'react';
import { canDeleteRecord } from '@core/supabase';
import { useSession } from './session';
import { REQUIRE_AUTH } from '../lib/authGate';

/**
 * 예시 가족을 보여줄지.
 *
 * 가드(`REQUIRE_AUTH`)가 켜져 있으면 로그인한 사람만 앱에 들어온다. 그런데 앱을 열면
 * 가족을 불러오는 **잠깐 사이**가 있고, 그때 예시로 채우면 **'지수님'이 번쩍 보였다가
 * '륜호님'으로 바뀐다.** 남의 이름이 스치는 것이다. 그래서 가드가 켜져 있으면 비워둔다.
 */
const USE_SAMPLE = !REQUIRE_AUTH;
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
    () => (members.length ? members.map((m) => m.display_name) : USE_SAMPLE ? SAMPLE_MEMBERS : []),
    [members]
  );
}

/** 지금 나의 짧은 이름. 예전 `CURRENT_USER` 상수를 대신한다. */
export function useMe(): string {
  const me = useSession((s) => s.me);
  return me?.display_name ?? (USE_SAMPLE ? SAMPLE_ME : '');
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

/**
 * DB의 역할 값을 화면에 쓰는 말로.
 *
 * ⚠️ **부/모를 여기서 지어내면 안 된다.** DB의 `role`은 `admin/parent/child/elder/guest`뿐이고
 *    **아빠인지 엄마인지 구분하는 정보가 아예 없다.** 예전에 `admin`을 '모'로 매핑해뒀더니
 *    가족을 만든 사람에게 엉뚱한 역할이 붙었다. `admin`은 역할이 아니라 **권한**이다.
 *    부/모 구분이 필요하면 DB에 칸을 먼저 만들고 사용자가 고르게 해야 한다.
 */
const ROLE_LABEL: Record<string, string> = {
  admin: '관리자', parent: '부모', elder: '조부모', child: '자녀', guest: '손님',
};

/** 구성원 목록 화면이 쓰는 모양 — 이름·전체이름·색·역할 */
export function useMemberCards(): MemberCard[] {
  const members = useSession((s) => s.members);
  const me = useSession((s) => s.me);
  return useMemo(() => {
    if (!members.length) {
      if (!USE_SAMPLE) return [];
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
  /** 로그인은 했는지. **가족이 없는 것과 로그인을 안 한 것은 다른 상태다** */
  signedIn: boolean;
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
  const signedIn = useSession((s) => !!s.userId);
  if (!family) {
    return {
      signedIn,
      name: '우리 가족',
      inviteCode: null,
      memberCount: USE_SAMPLE ? SAMPLE_MEMBERS.length : 0,
      isReal: false,
    };
  }
  return {
    signedIn,
    name: family.name,
    inviteCode: family.invite_code,
    memberCount: members.length,
    isReal: true,
  };
}

/** 훅 밖(이벤트 핸들러 등)에서 지금 나의 이름이 필요할 때 */
export const meName = (): string =>
  useSession.getState().me?.display_name ?? (USE_SAMPLE ? SAMPLE_ME : '');

/**
 * 이 기록을 내가 지울 수 있는지 — **쓴 사람과 관리자만** (2026-09-29 운영자 결정).
 * 규칙 자체는 `canDeleteRecord`(core)에 있고, DB 정책(00008)도 같은 규칙이다.
 */
export function useCanDelete(): (authorId?: string) => boolean {
  const userId = useSession((s) => s.userId);
  const role = useSession((s) => s.me?.role ?? null);
  return useCallback(
    (authorId?: string) => canDeleteRecord({ authorId, myUserId: userId, myRole: role }),
    [userId, role]
  );
}
