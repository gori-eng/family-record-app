/**
 * 만든 파일을 사용자 손에 넘긴다.
 *
 * 이 일만 플랫폼마다 다르다. 백업 내용을 만드는 일(`store/backup.ts`)과
 * 떼어놓은 이유가 그것이다 — 내용 만들기는 어디서나 같고, 건네는 방법만 다르다.
 *
 * ⚠️ **지금은 웹만 된다.** 휴대폰에서 파일을 저장·공유하려면
 *    `expo-file-system` + `expo-sharing`이 필요한데,
 *    - `expo-sharing`이 아직 설치돼 있지 않고
 *    - 이 프로젝트는 의존성 설치가 자주 실패한다 (CLAUDE.md 가져오기 2차 참조)
 *    - 애초에 휴대폰에 설치할 수 있는 빌드(EAS)가 아직 없다
 *    그래서 EAS 빌드를 붙이는 작업과 함께 채운다. 그때 아래 native 쪽만 고치면 된다.
 */
import { Platform } from 'react-native';

export type SaveResult =
  | { ok: true; how: 'download' }
  | { ok: false; reason: string };

/** 글자로 된 파일(JSON·CSV 등)을 내려준다. */
export function saveTextFile(fileName: string, text: string, mimeType = 'application/json'): SaveResult {
  if (Platform.OS !== 'web') {
    return {
      ok: false,
      reason: '휴대폰에서 파일로 저장하는 건 아직 준비 중이에요. 지금은 웹에서 내보내주세요.',
    };
  }

  try {
    // 브라우저에 "이 내용을 이 이름으로 받아라"고 시키는 표준 방법이다.
    // 눈에 안 보이는 링크를 하나 만들어 누른 뒤 치우는 것이다.
    const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // 바로 지우면 다운로드가 끊기는 브라우저가 있어 한 박자 뒤에 치운다
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { ok: true, how: 'download' };
  } catch (e: unknown) {
    return { ok: false, reason: `파일을 만들지 못했어요. (${String((e as Error)?.message ?? e)})` };
  }
}

/** 웹에서 파일 하나를 고르게 하고 글자로 읽어온다. 고르지 않으면 null */
export function pickTextFile(accept = '.json,application/json'): Promise<{ name: string; text: string } | null> {
  if (Platform.OS !== 'web') return Promise.resolve(null);

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    document.body.appendChild(input);

    const cleanup = () => {
      if (input.parentNode) document.body.removeChild(input);
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        cleanup();
        resolve({ name: file.name, text: String(reader.result ?? '') });
      };
      reader.onerror = () => {
        cleanup();
        resolve(null);
      };
      reader.readAsText(file, 'utf-8');
    };

    // 사용자가 대화상자를 그냥 닫으면 onchange가 오지 않는다.
    // 창에 다시 초점이 돌아온 뒤에도 파일이 없으면 취소로 본다.
    const onFocus = () => {
      setTimeout(() => {
        if (input.parentNode && !input.files?.length) {
          cleanup();
          resolve(null);
        }
        window.removeEventListener('focus', onFocus);
      }, 400);
    };
    window.addEventListener('focus', onFocus);

    input.click();
  });
}
