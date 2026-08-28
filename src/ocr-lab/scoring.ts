/**
 * 채점 — 완전일치율과 근사일치율.
 *
 * 두 값의 격차가 "후처리로 복구 가능한 여지"를 뜻한다.
 *   완전 71% / 근사 89% → 18%p 는 오타 수준이라 살릴 수 있음
 *   완전 71% / 근사 73% → 못 읽은 건 아예 못 읽은 것
 */

/** 이 거리 이내면 "오타 수준"으로 본다 */
const NEAR_THRESHOLD = 2;

export type Grade = {
  total: number;
  exact: number;
  near: number;
  /** 근사로도 못 찾은 성분 — 어떤 종류가 실패하는지 눈으로 보려고 남긴다 */
  missed: string[];
};

/**
 * 성분표는 줄바꿈·공백으로 성분명이 쪼개진다.
 * 공백/줄바꿈/구분기호를 지운 뒤 비교해야 "정제\n수" 같은 케이스를 놓치지 않는다.
 */
const normalize = ({ value }: { value: string }) =>
  value.replace(/[\s,·、.]/g, '').toLowerCase();

const editDistance = ({ a, b }: { a: string; b: string }) => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, substitution);
    }
    previous = current;
  }

  return previous[b.length];
};

/** haystack 안에 needle 과 편집거리 threshold 이내인 구간이 있는지 */
const hasNearMatch = ({
  haystack,
  needle,
  threshold,
}: {
  haystack: string;
  needle: string;
  threshold: number;
}) => {
  const windowSizes = [needle.length - threshold, needle.length, needle.length + threshold].filter(
    (size) => size > 0,
  );

  for (const size of windowSizes) {
    for (let start = 0; start + size <= haystack.length; start += 1) {
      const candidate = haystack.slice(start, start + size);
      if (editDistance({ a: candidate, b: needle }) <= threshold) return true;
    }
  }

  return false;
};

export const gradeIngredients = ({
  expected,
  ocrText,
}: {
  expected: string[];
  ocrText: string;
}): Grade => {
  const haystack = normalize({ value: ocrText });

  let exact = 0;
  let near = 0;
  const missed: string[] = [];

  for (const rawName of expected) {
    const needle = normalize({ value: rawName });
    if (needle.length === 0) continue;

    if (haystack.includes(needle)) {
      exact += 1;
      near += 1;
      continue;
    }

    // 짧은 이름에 편집거리 2를 허용하면 아무거나 맞아버린다 — 길이에 비례해 조인다.
    const threshold = Math.min(NEAR_THRESHOLD, Math.floor(needle.length / 3));
    if (threshold > 0 && hasNearMatch({ haystack, needle, threshold })) {
      near += 1;
      continue;
    }

    missed.push(rawName);
  }

  return { total: expected.length, exact, near, missed };
};

/** "정제수, 글리세린\n부틸렌글라이콜" → ['정제수', '글리세린', '부틸렌글라이콜'] */
export const parseExpectedIngredients = ({ raw }: { raw: string }) =>
  raw
    .split(/[,\n·]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const toPercent = ({ value, total }: { value: number; total: number }) =>
  total === 0 ? 0 : Math.round((value / total) * 100);
