/**
 * 자주 가는 곳 (00014). 일정에 장소를 적을 때마다 쌓이고, 많이 고른 순으로 펼쳐 준다.
 */
import { supabase } from './client';

export type AppPlace = { id: string; name: string; useCount: number; lastUsedAt: string };

export async function fetchPlaces(familyId: string): Promise<AppPlace[]> {
  const { data, error } = await supabase
    .from('family_places')
    .select('id, name, use_count, last_used_at')
    .eq('family_id', familyId)
    .order('use_count', { ascending: false })
    .order('last_used_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name, useCount: r.use_count, lastUsedAt: r.last_used_at }));
}

/** 장소를 하나 썼다 — 있으면 횟수를 올리고 없으면 새로 적는다 */
export async function touchPlace(familyId: string, name: string): Promise<void> {
  const { error } = await supabase.rpc('touch_place', { p_family_id: familyId, p_name: name });
  if (error) throw error;
}

export async function deletePlace(id: string): Promise<void> {
  const { error } = await supabase.from('family_places').delete().eq('id', id);
  if (error) throw error;
}
