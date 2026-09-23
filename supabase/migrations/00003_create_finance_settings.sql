-- ============================================================
-- 가계부 설정 (가족 공유)
-- ============================================================
-- 지금은 apps/mobile/store/financeSettings.ts가 브라우저 localStorage에 들고 있다.
-- 그런데 이 값들은 원래 "가족 공유 설정"이다.
--   · 카드 ···380이 민준 것이라는 사실은 민준 폰에서만 맞는 게 아니다
--   · 이 달 예산 80만원은 가족 모두가 같이 봐야 한다
--   · 스타벅스를 '식비'로 고쳤으면 다음엔 누가 넣어도 식비여야 한다
-- 그래서 가족당 한 줄로 DB에 둔다.

CREATE TABLE finance_settings (
  -- 가족당 한 줄
  family_id UUID PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,

  -- 카드 뒷자리 → 가족 구성원 표시 이름
  --   예: { "380": "민준", "969": "지수" }
  card_owners JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 카드사별 열 맞추기 프로필 (SavedProfile[])
  --   헤더 지문으로 같은 모양의 파일을 알아본다
  saved_profiles JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 정규화된 가맹점명 → 카테고리
  --   예: { "anthropic*claudesub": "기타" }
  category_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- 할부를 결제한 달에 전액으로 볼지, 매달 나눠 볼지
  installment_policy TEXT NOT NULL DEFAULT 'full'
    CHECK (installment_policy IN ('full', 'split')),

  -- 매달 반복하는 거래 (RecurringItem[])
  recurring JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- 예산 { total: number, byCategory: { [카테고리]: number } }
  budgets JSONB NOT NULL DEFAULT '{"total": 0, "byCategory": {}}'::jsonb,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER finance_settings_touch BEFORE UPDATE ON finance_settings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE finance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_settings_select" ON finance_settings
  FOR SELECT USING (family_id IN (SELECT my_family_ids()));
CREATE POLICY "finance_settings_insert" ON finance_settings
  FOR INSERT WITH CHECK (family_id IN (SELECT my_family_ids()));
CREATE POLICY "finance_settings_update" ON finance_settings
  FOR UPDATE USING (family_id IN (SELECT my_family_ids()));

-- ⚠️ 동시 수정 주의.
--    두 사람이 같은 순간에 설정을 고치면 나중 것이 앞의 것을 덮는다.
--    지금은 설정을 자주 바꾸지 않으니 그대로 두지만, 문제가 되면
--    JSONB 통째 쓰기 대신 필드별 부분 갱신(jsonb_set)으로 바꿀 것.
