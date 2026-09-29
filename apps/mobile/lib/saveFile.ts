/**
 * 만든 파일을 사용자 손에 넘긴다 / 사용자가 고른 파일을 읽어온다.
 *
 * 이 일만 플랫폼마다 다르다. 백업 내용을 만드는 일(`store/backup.ts`)과
 * 떼어놓은 이유가 그것이다 — 내용 만들기는 어디서나 같고, 건네는 방법만 다르다.
 *
 * - 웹: 보이지 않는 `<a download>`를 눌러 내려받기 / `<input type=file>`로 고르기
 * - 휴대폰: 임시 폴더에 파일을 쓰고 **공유 시트**를 띄운다(파일 앱·카톡·메일로 보낼 수 있다) /
 *   문서 고르기 대화상자로 파일을 받아 읽는다 (2026-09-29 전체 점검에서 채움)
 */
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export type SaveResult =
  | { ok: true; how: 'download' | 'share' }
  | { ok: false; reason: string };

/** 글자로 된 파일(JSON·CSV 등)을 내려준다. */
export async function saveTextFile(
  fileName: string,
  text: string,
  mimeType = 'application/json'
): Promise<SaveResult> {
  if (Platform.OS !== 'web') {
    try {
      const file = new File(Paths.cache, fileName);
      if (file.exists) file.delete();
      file.write(text);
      if (!(await Sharing.isAvailableAsync())) {
        return { ok: false, reason: '이 기기에서는 파일을 내보낼 방법이 없어요.' };
      }
      await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: '백업 파일을 어디에 둘까요?', UTI: 'public.json' });
      return { ok: true, how: 'share' };
    } catch (e: unknown) {
      return { ok: false, reason: `파일을 만들지 못했어요. (${String((e as Error)?.message ?? e)})` };
    }
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

/** 파일 하나를 고르게 하고 글자로 읽어온다. 고르지 않으면 null */
export async function pickTextFile(
  accept = '.json,application/json'
): Promise<{ name: string; text: string } | null> {
  if (Platform.OS !== 'web') {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.length) return null;
    const asset = res.assets[0];
    const text = await new File(asset.uri).text();
    return { name: asset.name ?? '백업.json', text };
  }

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
