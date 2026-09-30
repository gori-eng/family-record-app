/**
 * 아주 작은 ZIP 작성기 — 파일 여러 개를 **압축 없이** 한 파일로 묶는다.
 *
 * ── 왜 직접 만들었나 ────────────────────────────────────
 * 사진(JPEG)은 이미 압축돼 있어서 ZIP이 다시 눌러봐야 거의 줄지 않는다. 그래서 "담기만"(STORE) 하면
 * 충분하고, 그 정도는 100줄이면 된다. 이 프로젝트는 패키지 설치가 자주 실패하므로(pnpm) 라이브러리를
 * 하나 덜 들이는 편이 안전하다.
 *
 * ZIP 규격의 최소 형태: [파일 항목]… [중앙 목록]… [목록 끝 표시]. 파일 이름은 UTF-8(플래그 0x800).
 * 검증은 Node에서 `unzip -t`와 같은 검사를 흉내 낸 CRC 비교로 한다.
 */

// CRC-32 표 — 파일이 깨지지 않았는지 확인하는 검산 숫자. ZIP 규격이 요구한다
const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** 날짜·시각을 ZIP이 쓰는 DOS 형식(2초 단위)으로 */
function dosTime(d: Date): { time: number; date: number } {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

export type ZipEntry = { name: string; data: Uint8Array; date?: Date };

export function buildZip(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);
    const { time, date } = dosTime(e.date ?? new Date());
    const size = e.data.length;

    // 파일 항목 머리 (30바이트 + 이름)
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);        // 필요한 버전 2.0
    lh.setUint16(6, 0x0800, true);    // 이름이 UTF-8
    lh.setUint16(8, 0, true);         // 압축 없음(STORE)
    lh.setUint16(10, time, true);
    lh.setUint16(12, date, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true);
    lh.setUint32(22, size, true);
    lh.setUint16(26, name.length, true);
    lh.setUint16(28, 0, true);
    locals.push(new Uint8Array(lh.buffer), name, e.data);

    // 중앙 목록 항목 (46바이트 + 이름)
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, time, true);
    ch.setUint16(14, date, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true);
    ch.setUint32(24, size, true);
    ch.setUint16(28, name.length, true);
    ch.setUint16(30, 0, true);
    ch.setUint16(32, 0, true);
    ch.setUint16(34, 0, true);
    ch.setUint16(36, 0, true);
    ch.setUint32(38, 0, true);
    ch.setUint32(42, offset, true);   // 이 파일 항목이 시작하는 자리
    centrals.push(new Uint8Array(ch.buffer), name);

    offset += 30 + name.length + size;
  }

  const centralSize = centrals.reduce((s, b) => s + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(4, 0, true);
  end.setUint16(6, 0, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  end.setUint16(20, 0, true);

  const parts = [...locals, ...centrals, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((s, b) => s + b.length, 0));
  let p = 0;
  for (const b of parts) { out.set(b, p); p += b.length; }
  return out;
}
