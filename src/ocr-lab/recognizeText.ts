import { processImageTextRecognition } from 'react-native-vision-camera-mlkit';

/**
 * OCR 엔진 어댑터.
 *
 * 화면 코드는 이 파일의 타입만 알고, 라이브러리 타입은 모른다.
 * 나중에 다른 엔진(PaddleOCR 등)으로 갈아탈 때 이 파일만 바꾸면 되고,
 * 여러 엔진의 정확도를 같은 기준으로 비교할 때도 이 인터페이스가 기준이 된다.
 */

export type OcrLine = {
  text: string;
  top: number;
  left: number;
  width: number;
  height: number;
  /** Android 전용. iOS 는 항상 null */
  confidence: number | null;
};

export type OcrOutcome = {
  /** 좌표 순으로 재정렬된 라인들 */
  lines: OcrLine[];
  /** 라인을 줄바꿈으로 이은 전체 텍스트 */
  text: string;
  elapsedMs: number;
};

export const recognizeText = async ({ uri }: { uri: string }): Promise<OcrOutcome> => {
  const startedAt = Date.now();

  const result = await processImageTextRecognition(uri, {
    // 한국어 인식기는 한글 + Latin + 숫자를 함께 읽는다.
    // "정제수, EDTA-2Na, 1,2-헥산다이올" 같은 혼합 표기에 이거 하나면 된다.
    language: 'KOREAN',
    // 기본값 1.0 (축소 없음). 성분표는 글씨가 작아서 절대 낮추지 않는다.
    scaleFactor: 1.0,
  });

  const elapsedMs = Date.now() - startedAt;

  // ML Kit 은 성분표처럼 조밀한 문서에서 블록을 엉뚱하게 묶는다.
  // 블록 구조를 믿지 말고 라인을 좌표로 재정렬해서 읽는 순서를 복원한다.
  const lines: OcrLine[] = result.blocks
    .flatMap((block) => block.lines)
    .sort((a, b) => a.bounds.top - b.bounds.top || a.bounds.left - b.bounds.left)
    .map((line) => ({
      text: line.text,
      top: line.bounds.top,
      left: line.bounds.left,
      width: line.bounds.width,
      height: line.bounds.height,
      confidence: line.confidence,
    }));

  return {
    lines,
    text: lines.map((line) => line.text).join('\n'),
    elapsedMs,
  };
};
