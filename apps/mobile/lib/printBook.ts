/**
 * 기록책 HTML을 PDF로 뽑아 사용자 손에 건넨다.
 *
 * - 휴대폰: expo-print가 HTML을 PDF 파일로 바꾼다 → 이름을 붙여 **공유 창**을 띄운다(파일 앱·카톡·메일)
 * - 웹: expo-print는 웹에서 받은 HTML을 무시하고 **지금 화면**을 인쇄한다(도구의 한계).
 *   그래서 보이지 않는 틀(iframe)에 책을 넣고 그 틀을 인쇄한다. 인쇄 창에서 'PDF로 저장'을 고르면 된다.
 */
import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

export type PrintResult = { ok: true } | { ok: false; reason: string };

/** 틀 안의 사진·글꼴이 다 불러와질 때까지 (오래 걸리면 8초에서 끊고 그냥 뽑는다) */
async function waitForAssets(doc: Document) {
  const imgs = Array.from(doc.images);
  const loaded = Promise.all(imgs.map((img) =>
    img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); })
  ));
  const fonts = (doc as any).fonts?.ready ?? Promise.resolve();
  await Promise.race([Promise.all([loaded, fonts]), new Promise((r) => setTimeout(r, 8000))]);
}

export async function printBook(html: string, fileName: string): Promise<PrintResult> {
  if (Platform.OS !== 'web') {
    try {
      const { uri } = await Print.printToFileAsync({ html });
      // 받은 파일은 이름이 무작위라, 알아보기 쉬운 이름으로 옮긴다
      const src = new File(uri);
      const dest = new File(Paths.cache, fileName);
      if (dest.exists) dest.delete();
      src.move(dest);
      if (!(await Sharing.isAvailableAsync())) {
        return { ok: false, reason: '이 기기에서는 파일을 내보낼 방법이 없어요.' };
      }
      await Sharing.shareAsync(dest.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: '기록책을 어디에 둘까요?' });
      return { ok: true };
    } catch (e: unknown) {
      return { ok: false, reason: `기록책을 만들지 못했어요. (${String((e as Error)?.message ?? e)})` };
    }
  }

  try {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(frame);
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    await waitForAssets(doc);
    const win = frame.contentWindow!;
    // 인쇄 창이 닫히면 틀을 치운다 (afterprint가 안 오는 브라우저를 위해 1분 뒤에도)
    const cleanup = () => { if (frame.parentNode) frame.parentNode.removeChild(frame); };
    win.addEventListener('afterprint', () => setTimeout(cleanup, 500));
    setTimeout(cleanup, 60_000);
    win.focus();
    win.print();
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, reason: `기록책을 만들지 못했어요. (${String((e as Error)?.message ?? e)})` };
  }
}
