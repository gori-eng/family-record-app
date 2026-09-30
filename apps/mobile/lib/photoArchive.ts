/**
 * 가족 사진을 한 파일(ZIP)로 모아 내려받는다 — 기록 지키기 화면의 '사진 모아 담기'.
 *
 * 사진은 창고에만 있고 백업(JSON)에는 **경로만** 적힌다. 그래서 "기록이 사라지지 않는다"(§1)를
 * 지키려면 사진도 손에 쥘 수 있어야 한다. 폴더는 카테고리, 파일 이름은 `날짜_제목_n.jpg`라
 * familog 없이 탐색기에서 열어도 무슨 사진인지 안다.
 *
 * - 🔒 잠긴 타임캡슐 사진은 넣지 않는다 (책·검색과 같은 규칙)
 * - 얼굴 사진(프로필)도 `구성원/이름.jpg`로 넣는다
 * - 한 장이라도 못 받으면 개수를 세어 알려주고, 나머지는 그대로 담는다
 */
import { photoUrlsFor, photosOf } from './photos';
import { buildZip, type ZipEntry } from './zip';
import { capsuleIsOpen } from './search';
import { avatarPhotoPath } from '../components/Avatar';
import { dayOf, type BookRecord } from './bookHtml';
import { CATEGORY_LABELS, type RecordCategory } from '../store/records';

export type ArchiveInput = {
  records: BookRecord[];
  members: { display_name: string; avatar_url: string | null }[];
  today: string;
};

/** 파일 이름에 못 쓰는 글자를 뺀다 */
const safe = (s: string) => s.replace(/[\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40) || '기록';

/** 무엇을 담을지 — 경로와 파일 이름 짝. 순수 함수라 따로 검증한다 */
export function planArchive(input: ArchiveInput): { path: string; name: string }[] {
  const out: { path: string; name: string }[] = [];
  const used = new Set<string>();
  const unique = (name: string) => {
    let n = name, i = 2;
    while (used.has(n)) { n = name.replace(/\.jpg$/, `_${i++}.jpg`); }
    used.add(n);
    return n;
  };
  const sorted = [...input.records].sort((a, b) => dayOf(a).localeCompare(dayOf(b)) || a.createdAt - b.createdAt);
  for (const r of sorted) {
    if (r.category === 'time-capsule' && !capsuleIsOpen(r.data ?? {}, input.today)) continue;
    const paths = photosOf(r.data);
    if (!paths.length) continue;
    const folder = CATEGORY_LABELS[r.category as RecordCategory] ?? r.category;
    const day = dayOf(r) || '날짜없음';
    paths.forEach((path, i) => {
      out.push({ path, name: unique(`${folder}/${day}_${safe(r.title)}_${i + 1}.jpg`) });
    });
  }
  for (const m of input.members) {
    const p = avatarPhotoPath(m.avatar_url);
    if (p) out.push({ path: p, name: unique(`구성원/${safe(m.display_name)}.jpg`) });
  }
  return out;
}

export type ArchiveResult = { zip: Uint8Array; count: number; failed: number };

/** 사진을 실제로 받아 ZIP으로 묶는다 */
export async function buildPhotoArchive(
  input: ArchiveInput,
  onProgress?: (done: number, total: number) => void
): Promise<ArchiveResult> {
  const plan = planArchive(input);
  const urls = await photoUrlsFor(plan.map((p) => p.path));
  const entries: ZipEntry[] = [];
  let failed = 0;
  let done = 0;
  for (const item of plan) {
    const url = urls[item.path];
    try {
      if (!url) throw new Error('no url');
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      entries.push({ name: item.name, data: new Uint8Array(await res.arrayBuffer()) });
    } catch {
      failed += 1;
    }
    done += 1;
    onProgress?.(done, plan.length);
  }
  const readme = [
    'familog 사진 묶음',
    `만든 날: ${input.today}`,
    `사진 ${entries.length}장` + (failed ? `, 받지 못한 사진 ${failed}장` : ''),
    '',
    '기록 종류마다 폴더를 나눴고, 파일 이름은 날짜와 제목이에요.',
    '기록 글은 앱의 파일로 담아두기에서 따로 담아두세요.',
  ].join('\n');
  entries.push({ name: '읽어보세요.txt', data: new TextEncoder().encode(readme) });
  return { zip: buildZip(entries), count: entries.length - 1, failed };
}
