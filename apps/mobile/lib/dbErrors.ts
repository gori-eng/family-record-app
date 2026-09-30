/**
 * DB 함수가 돌려준 오류를 사람 말로.
 *
 * 원칙(2026-09-29 교훈): **확실히 아는 것만 바꿔 말하고, 모르는 오류는 그대로 보여준다.**
 * 틀린 안내는 없는 안내보다 나쁘다 — "다시 로그인해주세요"로 뭉뚱그렸다가 멀쩡한 로그인을 몇 번이나 다시 하게 만든 적이 있다.
 *
 * 우리가 만든 DB 함수(rename_me 등)는 이미 한국어로 이유를 말하므로(RAISE EXCEPTION) 그 글자를 그대로 쓴다.
 */
export function dbErrorText(e: unknown): string {
  const err = e as { message?: string; code?: string } | null;
  const msg = String(err?.message ?? e ?? '');
  // 함수가 아직 DB에 없다 = 새 마이그레이션을 아직 안 돌렸다
  if (err?.code === 'PGRST202' || /Could not find the function/i.test(msg)) {
    return '이 기능에 필요한 DB 준비가 아직이에요. 대시보드 SQL Editor에서 supabase/APPLY_LATEST.sql을 Run 해주세요.';
  }
  // 새 기능이 쓰는 칸·표가 아직 DB에 없다 = 새 마이그레이션을 아직 안 돌렸다
  if (err?.code === '42703' || err?.code === '42P01' || /column .* does not exist|schema cache/i.test(msg)) {
    return '이 기능에 필요한 DB 준비가 아직이에요. 대시보드 SQL Editor에서 supabase/APPLY_LATEST.sql을 Run 해주세요.';
  }
  if (/bucket not found/i.test(msg)) {
    return '사진 창고가 아직 없어요. 대시보드 SQL Editor에서 supabase/APPLY_LATEST.sql을 Run 해주세요.';
  }
  if (/fetch|network/i.test(msg)) return '인터넷 연결을 확인하고 다시 해주세요.';
  return msg;
}
