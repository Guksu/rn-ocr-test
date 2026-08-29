/**
 * 자동 생성 파일 — 직접 수정하지 말 것.
 * 생성: python3 tools/generate-ocr-samples.py
 *
 * 합성 성분표 샘플. 글자 픽셀 높이와 촬영 조건을 통제해서
 * 실사로는 분리할 수 없는 변수를 측정한다.
 */

export type OcrSample = {
  id: string;
  group: string;
  condition: string;
  /** 렌더된 한글 한 글자의 픽셀 높이 — 이 실험의 핵심 변수 */
  charHeightPx: number;
  module: number;
};

/** 모든 샘플이 공유하는 정답 성분 목록 */
export const SAMPLE_EXPECTED: string[] = [
  "정제수",
  "부틸렌글라이콜",
  "글리세린",
  "1,2-헥산다이올",
  "나이아신아마이드",
  "판테놀",
  "소듐하이알루로네이트",
  "알란토인",
  "다이포타슘글리시리제이트",
  "카보머",
  "트로메타민",
  "에틸헥실글리세린",
  "다이소듐이디티에이",
  "토코페릴아세테이트",
  "센텔라아시아티카추출물",
  "마데카소사이드",
  "아시아티코사이드",
  "베타인",
  "알지닌",
  "하이드록시에틸셀룰로오스",
  "폴리글리세릴-10라우레이트",
  "카프릴릴글라이콜",
  "소듐시트레이트",
  "시트릭애씨드",
  "녹차추출물",
  "병풀추출물",
  "히알루론산",
  "세라마이드엔피",
  "판테닐에틸에터",
  "향료"
];

export const OCR_SAMPLES: OcrSample[] = [
  {
    id: "size-09",
    group: "크기 스윕",
    condition: "글자 9pt (기본 열화)",
    charHeightPx: 9,
    module: require('../../assets/ocr-samples/size-09.jpg'),
  },
  {
    id: "size-11",
    group: "크기 스윕",
    condition: "글자 11pt (기본 열화)",
    charHeightPx: 10,
    module: require('../../assets/ocr-samples/size-11.jpg'),
  },
  {
    id: "size-13",
    group: "크기 스윕",
    condition: "글자 13pt (기본 열화)",
    charHeightPx: 12,
    module: require('../../assets/ocr-samples/size-13.jpg'),
  },
  {
    id: "size-16",
    group: "크기 스윕",
    condition: "글자 16pt (기본 열화)",
    charHeightPx: 15,
    module: require('../../assets/ocr-samples/size-16.jpg'),
  },
  {
    id: "size-20",
    group: "크기 스윕",
    condition: "글자 20pt (기본 열화)",
    charHeightPx: 19,
    module: require('../../assets/ocr-samples/size-20.jpg'),
  },
  {
    id: "size-26",
    group: "크기 스윕",
    condition: "글자 26pt (기본 열화)",
    charHeightPx: 23,
    module: require('../../assets/ocr-samples/size-26.jpg'),
  },
  {
    id: "cond-blur3",
    group: "조건 스윕",
    condition: "블러 3.0px",
    charHeightPx: 19,
    module: require('../../assets/ocr-samples/cond-blur3.jpg'),
  },
  {
    id: "cond-blur5",
    group: "조건 스윕",
    condition: "블러 5.0px",
    charHeightPx: 19,
    module: require('../../assets/ocr-samples/cond-blur5.jpg'),
  },
  {
    id: "cond-contrast15",
    group: "조건 스윕",
    condition: "저대비 0.15",
    charHeightPx: 19,
    module: require('../../assets/ocr-samples/cond-contrast15.jpg'),
  },
  {
    id: "cond-noise-hard",
    group: "조건 스윕",
    condition: "강한 노이즈",
    charHeightPx: 19,
    module: require('../../assets/ocr-samples/cond-noise-hard.jpg'),
  },
  {
    id: "cond-jpeg35",
    group: "조건 스윕",
    condition: "JPEG 품질 35",
    charHeightPx: 19,
    module: require('../../assets/ocr-samples/cond-jpeg35.jpg'),
  },
  {
    id: "cond-curve",
    group: "조건 스윕",
    condition: "곡면(병) + 가장자리 음영",
    charHeightPx: 19,
    module: require('../../assets/ocr-samples/cond-curve.jpg'),
  },
  {
    id: "cond-glare",
    group: "조건 스윕",
    condition: "유광 포장 반사",
    charHeightPx: 19,
    module: require('../../assets/ocr-samples/cond-glare.jpg'),
  },
  {
    id: "cond-shadow",
    group: "조건 스윕",
    condition: "한쪽 그림자",
    charHeightPx: 19,
    module: require('../../assets/ocr-samples/cond-shadow.jpg'),
  },
  {
    id: "real-bottle",
    group: "실전 복합",
    condition: "병 곡면 + 작은글씨(13pt) + 손떨림",
    charHeightPx: 12,
    module: require('../../assets/ocr-samples/real-bottle.jpg'),
  },
  {
    id: "real-dimstore",
    group: "실전 복합",
    condition: "매장 저조도 + 작은글씨(11pt)",
    charHeightPx: 10,
    module: require('../../assets/ocr-samples/real-dimstore.jpg'),
  },
  {
    id: "real-glossy",
    group: "실전 복합",
    condition: "유광 곡면 + 반사(16pt)",
    charHeightPx: 15,
    module: require('../../assets/ocr-samples/real-glossy.jpg'),
  },
  {
    id: "real-worst",
    group: "실전 복합",
    condition: "최악 복합 (11pt·곡면·반사·저조도·흔들림)",
    charHeightPx: 10,
    module: require('../../assets/ocr-samples/real-worst.jpg'),
  },
  {
    id: "oversize-12mp",
    group: "상한 검증",
    condition: "4032x3024 (12MP, 4MP 상한 초과)",
    charHeightPx: 52,
    module: require('../../assets/ocr-samples/oversize-12mp.jpg'),
  },
];
