import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * ML Kit(Android)이 거부하는 상한.
 * 초과하면 다운샘플이 아니라 예외를 던진다 — iOS는 알아서 줄이기 때문에
 * iOS에서만 테스트하면 이 문제를 못 잡는다.
 */
const MAX_PIXELS = 4_000_000;
const MAX_DIMENSION = 4_096;

export type CropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type PreparedImage = {
  uri: string;
  width: number;
  height: number;
  /** 원본 픽셀을 그대로 썼는지. false 면 글자가 작아져서 인식률이 떨어질 수 있다. */
  keptFullResolution: boolean;
  sourceWidth: number;
  sourceHeight: number;
};

/**
 * OCR에 넣기 전 이미지를 준비한다.
 *
 * 순서가 중요하다 — **크롭을 먼저, 축소를 나중에** 한다.
 * 4MP 상한은 입력 이미지 "전체" 크기에 걸리므로, 성분표 영역만 먼저 잘라내면
 * 그 조각이 4MP 이하가 되어 원본 픽셀 밀도를 그대로 쓸 수 있다.
 *
 *   ❌ 12MP 전체 → 4MP 축소 → 성분표는 원본의 58% 해상도
 *   ✅ 12MP 원본 → 성분표만 크롭(2.5MP) → 축소 불필요 → 100%
 *
 * ML Kit은 문자당 최소 16x16px를 요구해서, 이 차이가 작은 글씨에서 인식 여부를 가른다.
 */
export const prepareImageForOcr = async ({
  uri,
  width,
  height,
  crop,
}: {
  uri: string;
  width: number;
  height: number;
  crop?: CropRect;
}): Promise<PreparedImage> => {
  const workingWidth = crop ? crop.width : width;
  const workingHeight = crop ? crop.height : height;

  const withinPixels = workingWidth * workingHeight <= MAX_PIXELS;
  const withinDimension = workingWidth <= MAX_DIMENSION && workingHeight <= MAX_DIMENSION;
  const needsResize = !withinPixels || !withinDimension;

  if (crop === undefined && !needsResize) {
    return {
      uri,
      width,
      height,
      keptFullResolution: true,
      sourceWidth: width,
      sourceHeight: height,
    };
  }

  const context = ImageManipulator.manipulate(uri);

  if (crop !== undefined) {
    context.crop(crop);
  }

  if (needsResize) {
    const ratio = Math.min(
      Math.sqrt(MAX_PIXELS / (workingWidth * workingHeight)),
      MAX_DIMENSION / workingWidth,
      MAX_DIMENSION / workingHeight,
    );
    context.resize({ width: Math.floor(workingWidth * ratio) });
  }

  const rendered = await context.renderAsync();
  // 압축률을 최대 품질로 둔다 — 성분표는 작은 글씨라 JPEG 아티팩트가 인식률을 깎는다.
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 1 });

  return {
    uri: saved.uri,
    width: saved.width,
    height: saved.height,
    keptFullResolution: !needsResize,
    sourceWidth: width,
    sourceHeight: height,
  };
};
