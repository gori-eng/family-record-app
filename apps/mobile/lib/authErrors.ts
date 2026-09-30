/**
 * 인증 오류를 사람 말로 바꾼다.
 *
 * 일부러 **아무것도 import하지 않는다.** 그래야 Node에서 단독으로 돌려
 * 모든 경우를 확인할 수 있다 (세션 스토어를 끌고 들어오면 그게 안 된다).
 */
/**
 * Supabase가 돌려주는 영어 오류를 사람 말로 바꾼다.
 * 그대로 보여주면 무슨 뜻인지 알 수 없고, 무엇을 고쳐야 할지도 모른다.
 */
export function authErrorMessage(e: unknown): string {
  const m = String((e as Error)?.message ?? e);
  if (/invalid login credentials/i.test(m)) {
    return '이메일이나 비밀번호가 맞지 않아요. 다시 확인해주세요.';
  }
  if (/email not confirmed/i.test(m)) {
    return '메일로 보낸 확인 링크를 아직 누르지 않았어요.\n\n' +
      '메일이 안 보이면 스팸함도 한 번 봐주세요.';
  }
  if (/user already registered|already been registered/i.test(m)) {
    return '이미 가입된 이메일이에요. 로그인해주세요.';
  }
  if (/password should be at least/i.test(m)) {
    return '비밀번호는 6자 이상으로 지어주세요.';
  }
  if (/rate limit|too many requests|over_email_send_rate/i.test(m)) {
    return '메일을 너무 자주 보냈어요. 잠시 뒤에 다시 해주세요.';
  }
  if (/fetch|network|failed to fetch/i.test(m)) {
    return '서버에 닿지 못했어요. 인터넷 연결을 확인해주세요.';
  }
  return m;
}
