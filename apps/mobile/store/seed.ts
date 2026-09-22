/**
 * 시드(초기) 기록 데이터.
 *
 * 화면 파일마다 박혀 있던 예시 데이터를 창고 형식으로 옮겨둔 곳이다.
 * Supabase를 붙이면 이 파일은 통째로 지우면 된다 — 화면 코드는 손대지 않아도 된다.
 */
import { useRecordsStore, type NewRecord } from './records';

const DAY = 86_400_000;
/** n일 전 시각. 시드 기록이 최신순으로 자연스럽게 줄 서도록 쓴다. */
const daysAgo = (n: number) => Date.now() - n * DAY;

const TRAVEL_SEED: NewRecord[] = [
  {
    category: 'travel',
    title: '제주도',
    recordedBy: '지수',
    createdAt: daysAgo(2),
    data: {
      dest: '제주도', country: '한국', status: '다녀옴', date: '2025.8',
      color: '#4FC3F7', icon: 'sun-o', members: '전체',
      highlight: '우도 자전거 투어가 최고였어요!', budget: '180만원',
      journal: '3박 4일 일정으로 다녀온 여름 가족 여행. 첫째 날은 협재해변에서 물놀이를 했고, 둘째 날 우도에서 자전거를 빌려 섬을 한 바퀴 돌았다. 지우는 처음 자전거 뒷자리를 타봐서 신기해했고, 서준이는 우도땅콩 아이스크림에 푹 빠졌다. 셋째 날엔 한라산 어승생악 코스를 가족 모두 무리 없이 완등. 마지막 날 흑돼지 구이로 마무리.',
    },
  },
  {
    category: 'travel',
    title: '오사카',
    recordedBy: '민준',
    createdAt: daysAgo(9),
    data: {
      dest: '오사카', country: '일본', status: '계획 중', date: '2026.7 예정',
      color: '#FF8A65', icon: 'plane', members: '전체',
      highlight: '유니버설 스튜디오 + 도톤보리 맛집 투어', budget: '400만원',
      journal: 'USJ 1일권은 사전 예매 필수. 슈퍼닌텐도월드는 입장 정리권 챙기기. 도톤보리 → 신세카이 → 우메다 동선으로 둘째 날 진행. 서준이가 엑스프레스 패스를 원함. 숙소는 USJ 인근 호텔 1박, 도심 호텔 2박으로 분산.',
    },
  },
  {
    category: 'travel',
    title: '방콕',
    recordedBy: '지수',
    createdAt: daysAgo(21),
    data: {
      dest: '방콕', country: '태국', status: '가고 싶은', date: '',
      color: '#CE93D8', icon: 'map-marker', members: '지수, 민준',
      highlight: '부부 여행으로 가보고 싶은 곳', budget: '250만원',
      journal: '아이들 학기 중에 부부 둘이서 4박 5일 정도 다녀오면 좋겠다. 차오프라야 강 야경 디너 크루즈, 짜뚜짝 주말시장, 아유타야 당일 투어가 위시리스트.',
    },
  },
  {
    category: 'travel',
    title: '강릉',
    recordedBy: '민준',
    createdAt: daysAgo(35),
    data: {
      dest: '강릉', country: '한국', status: '다녀옴', date: '2026.1',
      color: '#81C784', icon: 'tree', members: '전체',
      highlight: '겨울 바다와 카페 투어. 아이들이 모래놀이 좋아했어요.', budget: '85만원',
      journal: '1박 2일로 가볍게 다녀온 겨울 여행. 안목해변 카페거리에서 따뜻한 코코아 한 잔, 정동진에서 일출 시도(흐려서 실패). 아이들은 추운데도 모래놀이를 멈추지 않아 손이 빨개져서 차에서 핫팩으로 데웠다.',
    },
  },
  {
    category: 'travel',
    title: '파리',
    recordedBy: '지수',
    createdAt: daysAgo(48),
    data: {
      dest: '파리', country: '프랑스', status: '가고 싶은', date: '',
      color: '#FFD54F', icon: 'building', members: '전체',
      highlight: '서준이가 에펠탑 보고 싶대요', budget: '800만원',
      journal: '서준이 초등 졸업 기념 여행으로 계획 중. 에펠탑, 루브르, 베르사유는 필수. 디즈니랜드 파리 1일 추가. 시차 적응을 위해 7박 이상 권장.',
    },
  },
];

const MOVIES_SEED: NewRecord[] = [
  {
    category: 'movies',
    title: '인사이드 아웃 2',
    recordedBy: '지수',
    createdAt: daysAgo(1),
    data: {
      title: '인사이드 아웃 2', genre: '애니메이션', date: '2026.3.28', rating: 5,
      watchedWith: ['지수', '민준', '지우', '서준'], color: '#FFD54F',
      review: '온 가족이 함께 울고 웃었어요. 불안이 새 감정이 된다는 메시지가 좋았어요.',
    },
  },
  {
    category: 'movies',
    title: '파묘',
    recordedBy: '민준',
    createdAt: daysAgo(14),
    data: {
      title: '파묘', genre: '미스터리', date: '2026.3.15', rating: 4,
      watchedWith: ['지수', '민준'], color: '#90A4AE',
      review: '긴장감 넘치는 전개! 부부 데이트로 딱이었어요.',
    },
  },
  {
    category: 'movies',
    title: '듄: 파트 2',
    recordedBy: '민준',
    createdAt: daysAgo(38),
    data: {
      title: '듄: 파트 2', genre: 'SF', date: '2026.2.20', rating: 4,
      watchedWith: ['민준', '서준'], color: '#CE93D8',
      review: '서준이가 SF에 빠지는 계기가 된 영화. 영상미 최고.',
    },
  },
  {
    category: 'movies',
    title: '위시',
    recordedBy: '지수',
    createdAt: daysAgo(79),
    data: {
      title: '위시', genre: '애니메이션', date: '2026.1.10', rating: 3,
      watchedWith: ['지수', '민준', '지우', '서준'], color: '#80DEEA',
      review: '지우가 노래를 따라 부르며 좋아했어요.',
    },
  },
  {
    category: 'movies',
    title: '오펜하이머',
    recordedBy: '지수',
    createdAt: daysAgo(95),
    data: {
      title: '오펜하이머', genre: '드라마', date: '2025.12.25', rating: 5,
      watchedWith: ['지수', '민준'], color: '#FFAB91',
      review: '크리스마스에 본 묵직한 영화. 대화를 많이 나눴어요.',
    },
  },
];

const PARENTING_SEED: NewRecord[] = [
  {
    category: 'parenting', title: '첫 자전거 타기 성공!', recordedBy: '지수', createdAt: daysAgo(0),
    data: {
      date: '2026년 4월 1일', child: '지우',
      content: '드디어 보조바퀴 없이 자전거를 탔어요. 처음엔 무서워서 울다가, 아빠가 잡아주면서 연습했더니 혼자서도 잘 타요!',
      milestones: ['첫 자전거'], mood: 'smile-o',
    },
  },
  {
    category: 'parenting', title: '구구단 마스터', recordedBy: '민준', createdAt: daysAgo(4),
    data: {
      date: '2026년 3월 28일', child: '서준',
      content: '서준이가 드디어 구구단을 전부 외웠어요! 7단이 제일 어려웠는데 노래로 외우니까 금방 했어요.',
      milestones: ['학습 성취'], mood: 'star',
    },
  },
  {
    category: 'parenting', title: '유치원 입학식', recordedBy: '지수', createdAt: daysAgo(7),
    data: {
      date: '2026년 3월 25일', child: '지우',
      content: '지우가 유치원에 처음 간 날. 엄마 손을 꼭 잡고 들어가다가, 친구들 보자마자 활짝 웃으면서 뛰어갔어요. 사실 엄마가 더 울뻔...',
      milestones: ['유치원 입학', '첫 등원'], mood: 'heart',
    },
  },
  {
    category: 'parenting', title: '생일 파티', recordedBy: '지수', createdAt: daysAgo(12),
    data: {
      date: '2026년 3월 20일', child: '서준',
      content: '서준이 8번째 생일! 친구들 다섯 명 초대해서 케이크 자르고 보물찾기 놀이했어요. "최고의 생일이었어!" 라고 하네요.',
      milestones: ['생일'], mood: 'birthday-cake',
    },
  },
  {
    category: 'parenting', title: '키 90cm 돌파!', recordedBy: '지수', createdAt: daysAgo(17),
    data: {
      date: '2026년 3월 15일', child: '지우',
      content: '정기 소아과 검진에서 키 91.2cm, 몸무게 13.5kg. 또래 평균보다 조금 큰 편이래요. 건강하게 잘 자라줘서 고마워~',
      milestones: ['성장 기록'], mood: 'line-chart',
    },
  },
];

const READING_SEED: NewRecord[] = [
  {
    category: 'reading', title: '어린 왕자', recordedBy: '지수', createdAt: daysAgo(1),
    data: { author: '생텍쥐페리', reader: '서준', status: '완독', rating: 5, color: '#B8D8C0', notes: '혼자서 처음 완독! "어른들은 참 이상해" 가 인상적이었대요' },
  },
  {
    category: 'reading', title: '아몬드', recordedBy: '지수', createdAt: daysAgo(3),
    data: { author: '손원평', reader: '지수', status: '읽는 중', progress: 65, color: '#F0B8B8', notes: '감정을 느끼지 못하는 소년의 이야기. 챕터 12까지 읽음' },
  },
  {
    category: 'reading', title: '나미야 잡화점의 기적', recordedBy: '민준', createdAt: daysAgo(11),
    data: { author: '히가시노 게이고', reader: '민준', status: '완독', rating: 4, color: '#B0C8D8', notes: '시간여행과 편지의 조합이 따뜻했음' },
  },
  {
    category: 'reading', title: '코스모스', recordedBy: '민준', createdAt: daysAgo(16),
    data: { author: '칼 세이건', reader: '민준', status: '읽는 중', progress: 30, color: '#B0C8D8', notes: '우주의 광대함을 느끼는 중' },
  },
  {
    category: 'reading', title: '모모', recordedBy: '지수', createdAt: daysAgo(24),
    data: { author: '미하엘 엔데', reader: '서준', status: '읽고 싶은', color: '#D8CDB8', notes: '' },
  },
  {
    category: 'reading', title: '해리포터 시리즈', recordedBy: '지수', createdAt: daysAgo(30),
    data: { author: 'J.K. 롤링', reader: '지우', status: '읽고 싶은', color: '#F0B8B8', notes: '' },
  },
];

const RECIPES_SEED: NewRecord[] = [
  {
    category: 'recipes', title: '엄마 김치찌개', recordedBy: '지수', createdAt: daysAgo(3),
    data: {
    name: '엄마 김치찌개', origin: '할머니로부터 전수', author: '지수', difficulty: '쉬움', time: '30분', color: '#FF8A65', icon: 'fire',
    ingredients: ['묵은지 1/4포기', '돼지고기 앞다리살 200g', '두부 1/2모', '대파 1대', '다진 마늘 1큰술', '고춧가루 1큰술', '들기름 1큰술', '쌀뜨물 500ml'],
    steps: [
      '냄비에 들기름을 두르고 묵은지를 5분간 볶는다.',
      '돼지고기를 넣고 겉면이 익을 때까지 함께 볶는다.',
      '쌀뜨물 500ml를 붓고 다진 마늘, 고춧가루를 넣어 끓인다.',
      '중불로 줄여 20분간 푹 끓인다.',
      '두부와 대파를 넣고 5분 더 끓인 뒤 간을 맞춘다.',
    ],
    tip: '쌀뜨물 대신 멸치 육수를 쓰면 더 깊은 맛이 나요.',
  },
  },
  {
    category: 'recipes', title: '할머니 갈비찜', recordedBy: '지수', createdAt: daysAgo(9),
    data: {
    name: '할머니 갈비찜', origin: '명절 특별 레시피', author: '지수', difficulty: '보통', time: '2시간', color: '#A1887F', icon: 'cutlery',
    ingredients: ['소갈비 1kg', '무 1/4개', '당근 1개', '대추 8알', '밤 8개', '간장 6큰술', '설탕 3큰술', '배즙 1/2컵', '다진 마늘 2큰술', '대파 1대', '후추 약간', '참기름 1큰술'],
    steps: [
      '갈비는 찬물에 1시간 이상 담가 핏물을 뺀다.',
      '끓는 물에 갈비를 넣고 5분 데쳐 기름기를 제거한다.',
      '간장, 설탕, 배즙, 마늘, 후추로 양념장을 만든다.',
      '갈비에 양념장을 넣고 30분 재운다.',
      '냄비에 갈비와 양념을 모두 넣고 물 3컵을 부어 끓인다.',
      '한 시간 후 무, 당근, 밤, 대추를 넣고 30분 더 졸인다.',
      '마지막에 참기름을 두르고 마무리한다.',
    ],
    tip: '하루 전날 만들어 두면 양념이 잘 배어 더 맛있어요.',
  },
  },
  {
    category: 'recipes', title: '서준이 좋아하는 계란말이', recordedBy: '민준', createdAt: daysAgo(15),
    data: {
    name: '서준이 좋아하는 계란말이', origin: '가족 오리지널', author: '민준', difficulty: '쉬움', time: '15분', color: '#FFD54F', icon: 'sun-o',
    ingredients: ['계란 4개', '당근 1/4개', '대파 약간', '소금 1/4작은술', '식용유 1큰술'],
    steps: [
      '당근과 대파를 잘게 다진다.',
      '계란을 풀어 다진 채소와 소금을 섞는다.',
      '약불로 달군 팬에 기름을 두르고 계란물을 1/3 붓는다.',
      '겉면이 살짝 익으면 한쪽부터 돌돌 말아준다.',
      '남은 계란물을 부어 같은 방식으로 마저 만다.',
    ],
  },
  },
  {
    category: 'recipes', title: '지우 이유식 - 단호박죽', recordedBy: '지수', createdAt: daysAgo(21),
    data: {
    name: '지우 이유식 - 단호박죽', origin: '소아과 추천', author: '지수', difficulty: '쉬움', time: '40분', color: '#FFB74D', icon: 'leaf',
    ingredients: ['단호박 1/4통', '쌀가루 3큰술', '물 또는 모유 300ml'],
    steps: [
      '단호박은 껍질을 벗기고 잘게 썰어 찐다.',
      '익힌 단호박을 으깨거나 곱게 갈아준다.',
      '냄비에 쌀가루와 물을 풀고 약불로 저으며 끓인다.',
      '쌀이 풀어지면 으깬 단호박을 넣고 5분 더 끓인다.',
    ],
    tip: '월령에 따라 농도와 양을 조절해주세요.',
  },
  },
  {
    category: 'recipes', title: '크리스마스 케이크', recordedBy: '전체', createdAt: daysAgo(27),
    data: {
    name: '크리스마스 케이크', origin: '가족 연례 행사', author: '전체', difficulty: '어려움', time: '3시간', color: '#E57373', icon: 'birthday-cake',
    ingredients: ['박력분 200g', '버터 200g', '설탕 150g', '계란 4개', '베이킹파우더 1작은술', '바닐라 익스트랙 1작은술', '생크림 500ml', '딸기 1팩', '체리 약간', '슈가파우더 약간'],
    steps: [
      '오븐을 170도로 예열한다.',
      '버터와 설탕을 크림 상태가 될 때까지 휘핑한다.',
      '계란을 하나씩 넣으며 잘 섞는다.',
      '체에 친 박력분, 베이킹파우더를 넣고 가볍게 섞는다.',
      '170도 오븐에서 30분간 굽는다.',
      '식힌 시트를 두 장으로 자르고 생크림과 딸기를 넣어 샌드한다.',
      '윗면과 옆면에 생크림을 발라 마무리하고 딸기, 체리로 장식한다.',
    ],
    tip: '시트는 하루 전에 구워 냉장 보관하면 잘 잘려요.',
  },
  },
  {
    category: 'recipes', title: '아빠표 볶음밥', recordedBy: '민준', createdAt: daysAgo(33),
    data: {
    name: '아빠표 볶음밥', origin: '주말 아침 단골 메뉴', author: '민준', difficulty: '쉬움', time: '20분', color: '#81C784', icon: 'spoon',
    ingredients: ['밥 2공기', '계란 2개', '햄 100g', '양파 1/2개', '당근 1/4개', '대파 1대', '진간장 1큰술', '식용유 2큰술', '참기름 1작은술', '후추 약간'],
    steps: [
      '햄, 양파, 당근을 잘게 깍둑썬다.',
      '팬에 기름을 두르고 계란을 풀어 스크램블 한다.',
      '같은 팬에 대파를 넣어 향을 내고 채소와 햄을 볶는다.',
      '밥을 넣고 진간장을 둘러가며 빠르게 볶는다.',
      '계란을 다시 넣고 후추, 참기름으로 마무리한다.',
    ],
  },
  },
];

const GOALS_SEED: NewRecord[] = [
  {
    category: 'goals', title: '주말 가족 운동', recordedBy: '지수', createdAt: daysAgo(5),
    data: {
    title: '주말 가족 운동', desc: '매주 토요일 가족 산책 또는 자전거', progress: 75, target: '2026.12', icon: 'bicycle', color: '#81C784', status: '진행 중',
    milestones: [
      { label: '가족 자전거 구매', done: true },
      { label: '근처 자전거 코스 3곳 답사', done: true },
      { label: '월 4회 이상 운동 3개월 연속', done: true },
      { label: '가족 마라톤 5km 완주', done: false },
    ],
    notes: '비 오는 날엔 실내 클라이밍장으로 대체. 지우는 보조바퀴 떼고 한 달째 잘 타는 중.',
  },
  },
  {
    category: 'goals', title: '가족 독서 100권', recordedBy: '지수', createdAt: daysAgo(14),
    data: {
    title: '가족 독서 100권', desc: '가족 전체 연간 독서 100권 달성', progress: 42, target: '2026.12', icon: 'book', color: '#4FC3F7', status: '진행 중',
    milestones: [
      { label: '1분기 25권', done: true },
      { label: '2분기 50권', done: false },
      { label: '3분기 75권', done: false },
      { label: '4분기 100권', done: false },
    ],
    notes: '서준 18권, 지수 12권, 민준 8권, 지우 4권. 매주 일요일 저녁 30분 가족 독서 시간 확보가 효과적.',
  },
  },
  {
    category: 'goals', title: '5년 뒤 가족 동남아 여행', recordedBy: '지수', createdAt: daysAgo(23),
    data: {
    title: '5년 뒤 가족 동남아 여행', desc: '매달 30만원씩 여행 저금', progress: 20, target: '2031.7', icon: 'plane', color: '#FFB74D', status: '진행 중',
    milestones: [
      { label: '여행 적금 통장 개설', done: true },
      { label: '1년차 360만원 적립', done: true },
      { label: '3년차 1,080만원 적립', done: false },
      { label: '5년차 1,800만원 + 출발', done: false },
    ],
    notes: '목적지 후보: 발리, 푸켓, 다낭. 아이들이 초등 고학년이 되었을 때 떠나기로 합의.',
  },
  },
  {
    category: 'goals', title: '1억 모으기', recordedBy: '지수', createdAt: daysAgo(32),
    data: {
    title: '1억 모으기', desc: '주택 자금 마련을 위한 저축 목표', progress: 35, target: '2028.12', icon: 'home', color: '#E57373', status: '진행 중',
    milestones: [
      { label: '월 250만원 자동 저축 세팅', done: true },
      { label: '5천만원 도달', done: false },
      { label: '7천만원 도달', done: false },
      { label: '1억 도달', done: false },
    ],
    notes: '청약 통장은 별도 운영. 비상금 300만원은 항상 별도 보유.',
  },
  },
  {
    category: 'goals', title: '서준이 수영 자격증', recordedBy: '지수', createdAt: daysAgo(41),
    data: {
    title: '서준이 수영 자격증', desc: '수영 1급 자격증 취득', progress: 100, target: '2026.3', icon: 'trophy', color: '#CE93D8', status: '달성',
    milestones: [
      { label: '수영 4급', done: true },
      { label: '수영 3급', done: true },
      { label: '수영 2급', done: true },
      { label: '수영 1급', done: true },
    ],
    notes: '2026년 3월 시험 합격! 다음 목표로 인명구조 자격증 도전 예정.',
  },
  },
];

const HEALTH_SEED: NewRecord[] = [
  {
    category: 'health', title: '민준 건강검진', recordedBy: '민준', createdAt: daysAgo(6),
    data: { member: '민준', recordedBy: '민준', type: '건강검진', date: '2026.3.15', result: '정상', notes: '혈압 120/80, 콜레스테롤 정상 범위', nextDate: '2027.3', color: '#B0C8D8', icon: 'stethoscope' },
  },
  {
    category: 'health', title: '지수 치과 검진', recordedBy: '지수', createdAt: daysAgo(17),
    data: { member: '지수', recordedBy: '지수', type: '치과 검진', date: '2026.2.20', result: '충치 1개', notes: '왼쪽 아래 어금니 충치 발견, 다음 주 치료 예약', nextDate: '2026.8', color: '#E8D0C0', icon: 'medkit' },
  },
  {
    category: 'health', title: '지우 영유아 검진', recordedBy: '지수', createdAt: daysAgo(28),
    data: { member: '지우', recordedBy: '지수', type: '영유아 검진', date: '2026.1.10', result: '정상 발달', notes: '키 91.2cm, 체중 13.5kg. 또래 평균 이상', nextDate: '2026.7', color: '#F0B8B8', icon: 'heart' },
  },
  {
    category: 'health', title: '서준 시력 검사', recordedBy: '민준', createdAt: daysAgo(39),
    data: { member: '서준', recordedBy: '민준', type: '시력 검사', date: '2025.12.5', result: '양호', notes: '양쪽 시력 1.0, 안경 불필요', nextDate: '2026.12', color: '#B8D8C0', icon: 'eye' },
  },
  {
    category: 'health', title: '지우 예방접종', recordedBy: '지수', createdAt: daysAgo(50),
    data: { member: '지우', recordedBy: '지수', type: '예방접종', date: '2025.11.20', result: '완료', notes: 'DTaP 4차 접종 완료', nextDate: '2026.5', color: '#F0B8B8', icon: 'plus-square' },
  },
];

const CAPSULES_SEED: NewRecord[] = [
  {
    category: 'time-capsule', title: '서준이 성인식에 열어보세요', recordedBy: '지수', createdAt: daysAgo(8),
    data: { title: '서준이 성인식에 열어보세요', target: '2036.5.15', type: '성인식', author: '지수, 민준', sealed: '2026.3.1', locked: true, icon: 'gift', color: '#CE93D8' },
  },
  {
    category: 'time-capsule', title: '지우에게 보내는 첫 편지', recordedBy: '지수', createdAt: daysAgo(21),
    data: { title: '지우에게 보내는 첫 편지', target: '2032.1.1', type: '생일', author: '지수', sealed: '2023.6.15', locked: true, icon: 'envelope', color: '#4FC3F7' },
  },
  {
    category: 'time-capsule', title: '2025년 가족 영상 편지', recordedBy: '전체', createdAt: daysAgo(34),
    data: { title: '2025년 가족 영상 편지', target: '2030.12.31', type: '연말', author: '전체', sealed: '2025.12.31', locked: true, icon: 'video-camera', color: '#FFB74D' },
  },
  {
    category: 'time-capsule', title: '우리 첫 집 기억', recordedBy: '지수', createdAt: daysAgo(47),
    data: { title: '우리 첫 집 기억', target: '2026.4.1', type: '기념일', author: '지수, 민준', sealed: '2024.4.1', locked: false, icon: 'home', color: '#81C784' },
  },
];

/**
 * 가계부 시드.
 *
 * 다른 카테고리와 달리 원래 화면에는 `[{ date, items: [...] }]`처럼 날짜별로 묶여 있었다.
 * 창고에는 "거래 1건 = 기록 1건"으로 풀어서 넣는다. 날짜별 묶음은 화면에서 다시 만든다.
 * 날짜는 반드시 'YYYY-MM-DD' — 월별 집계와 정렬이 이 형식에 의존한다.
 */
const tx = (
  date: string,
  type: 'income' | 'expense',
  category: string,
  desc: string,
  amount: number,
  method: string,
  memo = '',
  recordedBy = '지수'
): NewRecord => ({
  category: 'finance',
  title: desc,
  recordedBy,
  createdAt: new Date(`${date}T12:00:00`).getTime(),
  data: { type, amount, category, desc, date, method, memo },
});

/** 이번 달 / 지난달을 오늘 기준으로 만든다 (전월 대비 비교가 보이도록). */
const ym = (monthsAgo: number, day: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const FINANCE_SEED: NewRecord[] = [
  // ── 이번 달 ──
  tx(ym(0, 1), 'income', '급여', '월급', 4200000, '입금', '', '민준'),
  tx(ym(0, 2), 'expense', '주거', '관리비', 185000, '계좌이체'),
  tx(ym(0, 3), 'expense', '식비', '이마트 장보기', 87400, '카드', '주말 장보기 + 지우 간식'),
  tx(ym(0, 5), 'expense', '교통', '주유소', 65000, '카드'),
  tx(ym(0, 8), 'expense', '교육', '서준이 학원비', 350000, '계좌이체', '수학·영어 2과목', '민준'),
  tx(ym(0, 11), 'expense', '식비', '배달의민족', 32500, '카드'),
  tx(ym(0, 14), 'expense', '여가', '가족 영화 관람', 48000, '카드', '인사이드 아웃 2'),
  tx(ym(0, 16), 'expense', '의료', '지우 소아과', 15000, '카드'),
  tx(ym(0, 18), 'expense', '생활', '생필품 정기배송', 43200, '카드'),
  tx(ym(0, 20), 'expense', '식비', '주말 외식', 68000, '카드', '가족 4명 삼겹살', '민준'),

  // ── 지난달 (전월 대비 비교용) ──
  tx(ym(1, 1), 'income', '급여', '월급', 4200000, '입금', '', '민준'),
  tx(ym(1, 2), 'expense', '주거', '관리비', 172000, '계좌이체'),
  tx(ym(1, 6), 'expense', '식비', '이마트 장보기', 92000, '카드'),
  tx(ym(1, 9), 'expense', '교육', '서준이 학원비', 350000, '계좌이체', '', '민준'),
  tx(ym(1, 13), 'expense', '교통', '주유소', 60000, '카드'),
  tx(ym(1, 19), 'expense', '여가', '놀이공원', 96000, '카드', '지우 생일 기념'),
  tx(ym(1, 24), 'expense', '식비', '배달 음식', 41000, '카드'),
];

/**
 * 앱이 처음 켜질 때 한 번 호출한다.
 * seedCategory는 해당 카테고리에 이미 기록이 있으면 건너뛰므로 두 번 불러도 안전하다.
 */
export function seedRecords() {
  const { seedCategory } = useRecordsStore.getState();
  seedCategory('travel', TRAVEL_SEED);
  seedCategory('movies', MOVIES_SEED);
  seedCategory('parenting', PARENTING_SEED);
  seedCategory('reading', READING_SEED);
  seedCategory('recipes', RECIPES_SEED);
  seedCategory('goals', GOALS_SEED);
  seedCategory('health', HEALTH_SEED);
  seedCategory('time-capsule', CAPSULES_SEED);
  seedCategory('finance', FINANCE_SEED);
}
