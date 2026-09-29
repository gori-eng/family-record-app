-- ============================================================
-- 일정 테이블을 앱 모양에 맞춘다
-- ============================================================
-- 왜 다시 만드나:
--   `calendar_events`(00002)는 캘린더 화면을 만들기 **전에** 짐작으로 설계했다.
--   이후 만든 앱의 일정 모양과 세 군데가 어긋난다.
--
--     DB (예전)                      앱 (store/events.ts)
--     start_time / end_time          date 'YYYY-MM-DD' + time 'HH:MM' (빈 값 = 하루 종일)
--     member  TEXT   (한 명)          members string[]  (여러 명, 비면 가족 전체)
--     created_by UUID 만              createdBy '지수'  (화면에 뜨는 짧은 이름)
--
--   특히 **참여자가 한 칸**이라 "지우·지수 둘 다"를 담을 수 없다. 끼워 맞추면 정보가 샌다.
--
-- 왜 날짜·시각을 타임스탬프가 아니라 따로 두나:
--   "9월 29일 오후 6시 저녁 식사"는 **그 집의 달력에 적힌 날짜**다. 타임스탬프로 바꾸면
--   시간대 변환이 끼어들어, 자정 무렵 일정이 하루 앞뒤로 밀리는 전형적인 버그가 생긴다.
--   가족 달력에는 적힌 그대로 두는 게 맞다. (구글 캘린더를 붙일 때 그때 변환한다)
--
-- 안전장치 두 가지:
--   1. **이미 새 모양이면 아무것도 하지 않는다** — 여러 번 실행해도 안전하다
--   2. 옛 모양인데 일정이 **한 건이라도 있으면 멈춘다** — 데이터를 날리지 않는다
--      (앱은 지금까지 일정을 DB에 쓴 적이 없어 비어 있어야 정상이다)

DO $$
BEGIN
  -- 1) 이미 새 모양이면 건너뛴다
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'event_date'
  ) THEN
    RAISE NOTICE '일정 표가 이미 새 모양이라 건너뜁니다.';
    RETURN;
  END IF;

  -- 2) 옛 모양인데 데이터가 있으면 멈춘다
  IF EXISTS (SELECT 1 FROM calendar_events) THEN
    RAISE EXCEPTION '일정이 이미 들어 있어서 표를 다시 만들지 않았어요. 먼저 백업해주세요.';
  END IF;

  DROP TABLE calendar_events;

  CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,

    -- 달력에 적힌 그대로 (시간대 변환 없음)
    event_date DATE NOT NULL,
    -- 'HH:MM'. 빈 문자열이면 하루 종일
    event_time TEXT NOT NULL DEFAULT ''
      CHECK (event_time = '' OR event_time ~ '^[0-2][0-9]:[0-5][0-9]$'),

    title TEXT NOT NULL,
    location TEXT,
    -- 함께하는 사람의 짧은 이름들. 비어 있으면 가족 전체
    members TEXT[] NOT NULL DEFAULT '{}',
    memo TEXT,
    color TEXT NOT NULL DEFAULT '#4A8C6F',

    created_by UUID NOT NULL REFERENCES auth.users(id),
    -- 화면에 "적어둔 사람"으로 뜨는 짧은 이름 (기록의 recorded_by와 같은 이유)
    created_by_name TEXT NOT NULL,

    -- 나중에 구글 캘린더와 이을 때 쓴다
    google_event_id TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- 달력은 "그 달의 일정"을 찾는 일이 대부분이다
  CREATE INDEX idx_calendar_events_family_date ON calendar_events(family_id, event_date);

  -- 00002에서 만든 함수를 그대로 쓴다
  CREATE TRIGGER calendar_events_touch BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

  -- RLS — 기록과 같은 규칙
  ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "calendar_select" ON calendar_events
    FOR SELECT USING (family_id IN (SELECT my_family_ids()));
  CREATE POLICY "calendar_insert" ON calendar_events
    FOR INSERT WITH CHECK (family_id IN (SELECT my_family_ids()) AND auth.uid() = created_by);
  CREATE POLICY "calendar_update" ON calendar_events
    FOR UPDATE USING (family_id IN (SELECT my_family_ids()));
  CREATE POLICY "calendar_delete" ON calendar_events
    FOR DELETE USING (family_id IN (SELECT my_family_ids()));
END $$;
