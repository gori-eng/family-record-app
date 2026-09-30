/**
 * 초대 문자에 넣을 주소들.
 *
 * 초대 코드만 보내면 받은 사람이 앱을 열고 코드를 직접 쳐야 했다.
 * 앱 주소(`familog://join?code=…`)를 같이 보내면, 앱이 깔린 휴대폰에서는 누르는 순간
 * 코드가 채워진 합류 화면이 열린다(`app/join.tsx`). `app.json`의 `scheme`이 `familog`다.
 */

/** 스토어 주소 — 출시 전까지 비어 있다. 비어 있으면 초대 문자에 그 줄을 넣지 않는다 */
export const STORE_URL = '';

/** 앱에서 바로 여는 주소 */
export const joinLink = (code: string) => `familog://join?code=${encodeURIComponent(code.trim())}`;

/** 가족에게 보내는 초대 문자. 카톡이나 문자에 그대로 붙는다 */
export function inviteMessage(familyName: string, code: string): string {
  const lines = [
    `${familyName} 가족 기록장에 초대해요.`,
    `초대 코드: ${code}`,
    `앱에서 열기: ${joinLink(code)}`,
  ];
  if (STORE_URL) lines.push(`앱이 아직 없다면 여기서 받아요: ${STORE_URL}`);
  return lines.join('\n');
}
