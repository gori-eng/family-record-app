/**
 * 자주 가는 곳 보관소 — 일정 폼의 "어디서?" 아래에 펼쳐 주는 목록.
 *
 * 가족이 함께 쓴다(DB `family_places`, 00014). 일정을 저장할 때 장소가 적혀 있으면 `remember()`가
 * 횟수를 올리고, 목록은 많이 고른 순이다. 새로고침 없이 바로 보이게 화면에 먼저 반영하고 뒤에서 보낸다.
 */
import { useMemo } from 'react';
import { create } from 'zustand';
import { fetchPlaces, touchPlace, deletePlace, type AppPlace } from '@core/supabase';

type PlacesState = {
  places: AppPlace[];
  familyId: string | null;
  load: (familyId: string) => Promise<void>;
  clear: () => void;
  /** 장소를 하나 썼다 */
  remember: (name: string) => void;
  forget: (id: string) => void;
};

export const usePlacesStore = create<PlacesState>((set, get) => ({
  places: [],
  familyId: null,
  load: async (familyId) => {
    if (get().familyId !== familyId) set({ familyId, places: [] });
    try {
      const rows = await fetchPlaces(familyId);
      if (get().familyId !== familyId) return;
      set({ places: rows });
    } catch {
      // 못 불러오면 빈 목록 — 장소는 직접 적으면 된다
    }
  },
  clear: () => set({ places: [], familyId: null }),
  remember: (name) => {
    const v = name.trim();
    const { familyId, places } = get();
    if (!v || !familyId) return;
    const hit = places.find((p) => p.name === v);
    const next = hit
      ? places.map((p) => (p.id === hit.id ? { ...p, useCount: p.useCount + 1, lastUsedAt: new Date().toISOString() } : p))
      : [...places, { id: `tmp-${Date.now()}`, name: v, useCount: 1, lastUsedAt: new Date().toISOString() }];
    set({ places: next.sort((a, b) => b.useCount - a.useCount || b.lastUsedAt.localeCompare(a.lastUsedAt)) });
    touchPlace(familyId, v).then(() => get().load(familyId)).catch(() => {});
  },
  forget: (id) => {
    set({ places: get().places.filter((p) => p.id !== id) });
    if (!id.startsWith('tmp-')) deletePlace(id).catch(() => {});
  },
}));

/** 입력한 글자로 거른 추천 — 비어 있으면 많이 간 곳 위주로 몇 개 */
export function usePlaceSuggestions(typed: string, limit = 6): AppPlace[] {
  const places = usePlacesStore((s) => s.places);
  return useMemo(() => {
    const q = typed.trim().toLowerCase();
    const list = q ? places.filter((p) => p.name.toLowerCase().includes(q) && p.name !== typed.trim()) : places;
    return list.slice(0, limit);
  }, [places, typed, limit]);
}
