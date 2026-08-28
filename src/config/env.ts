/**
 * 웹뷰가 띄울 웹 서비스 주소.
 *
 * .env 파일에 EXPO_PUBLIC_WEB_ORIGIN 을 넣으면 그 값이 쓰인다.
 * (EXPO_PUBLIC_ 접두사가 붙은 값만 앱 번들에 포함된다 = 비밀값을 넣으면 안 된다)
 */
export const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_ORIGIN ?? 'https://example.com';

/**
 * "https://a.com/b?c=1" → "https://a.com"
 *
 * RN 의 Hermes 엔진은 전역 URL 구현이 불완전해서 new URL().origin 을 믿을 수 없다.
 * 그래서 직접 잘라낸다.
 */
export const toOrigin = ({ url }: { url: string }): string | null => {
  const matched = /^(https?:\/\/[^/?#]+)/i.exec(url);
  return matched ? matched[1].toLowerCase() : null;
};

/**
 * 브릿지 호출을 허용할 출처 목록.
 * 웹뷰 안에서 외부 사이트(결제사, 소셜 로그인 페이지 등)로 이동했을 때
 * 그 페이지가 네이티브 기능을 호출하지 못하게 막는다.
 */
export const TRUSTED_ORIGINS = [toOrigin({ url: WEB_ORIGIN })].filter(
  (origin): origin is string => origin !== null,
);
