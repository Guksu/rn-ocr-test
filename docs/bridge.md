# 웹 ↔ 앱 브릿지 사용법 (웹 개발자용)

앱이 웹 페이지에 `window.AppBridge` 를 주입한다. 웹은 별도 설치 없이 바로 쓰면 된다.

## 1. 준비 확인 (중요)

앱은 브릿지를 **문서 로드 전**에 주입하지만, **안드로이드에서는 이게 100% 보장되지 않는다**
(react-native-webview 공식 문서 명시). 그래서 앱은 로드 후에도 한 번 더 주입하고,
주입이 끝나면 `appbridgeready` 이벤트를 쏜다.

웹은 반드시 아래 패턴으로 접근해야 한다.

```ts
const waitForBridge = (): Promise<AppBridge | null> => {
  // 브라우저(앱이 아님)면 영원히 안 옴 → null
  if (!('ReactNativeWebView' in window)) return Promise.resolve(null);
  if (window.AppBridge) return Promise.resolve(window.AppBridge);

  return new Promise((resolve) => {
    window.addEventListener('appbridgeready', () => resolve(window.AppBridge), { once: true });
  });
};
```

앱 안인지 아닌지는 `window.AppBridge?.isNativeApp` 또는 User-Agent 의 `OcrTestApp/1.0` 으로 판별한다.

## 2. 웹 → 앱 (요청하고 응답 받기)

```ts
const info = await window.AppBridge.request('app.getInfo');
// → { platform: 'ios', osVersion: '18.2', appVersion: '1.0.0', isDevice: true, ... }
```

- 반환은 Promise. 기본 타임아웃 30초(`request(action, payload, { timeoutMs })` 로 조절).
- 실패 시 `Error` 가 throw 되고 `error.code` 에 아래 값 중 하나가 담긴다.

| code | 의미 |
|---|---|
| `UNKNOWN_ACTION` | 이 앱 버전이 모르는 기능 (구버전 앱 사용자) |
| `PERMISSION_DENIED` | 사용자가 권한 거부 |
| `CANCELLED` | 사용자가 취소 |
| `INTERNAL` | 그 외 오류 / 타임아웃 |

**구버전 앱 대응이 필수다.** 앱은 스토어 심사를 거쳐야 해서 웹보다 항상 늦게 배포된다.
새 action 을 쓸 때는 `UNKNOWN_ACTION` 을 잡아 웹 대체 동작으로 빠지게 만들 것.

```ts
try {
  await window.AppBridge.request('media.pickImage');
} catch (error) {
  if (error.code === 'UNKNOWN_ACTION') {
    openWebFileInput(); // 앱이 아직 지원 안 함 → 웹 방식으로
    return;
  }
  throw error;
}
```

## 3. 앱 → 웹 (앱이 먼저 알려주기)

```ts
const off = window.AppBridge.on('push.opened', (payload) => {
  router.push(payload.url);
});
// 정리할 때: off();
```

## 4. action 목록

| action | 상태 | 설명 |
|---|---|---|
| `app.getInfo` | ✅ | 플랫폼/OS/앱 버전 |
| `auth.login` | Phase 2 | 소셜 로그인 (카카오/애플/구글) |
| `auth.logout` | Phase 2 | 로그아웃 + 저장된 토큰 삭제 |
| `auth.getSession` | Phase 2 | 기기에 저장된 세션 조회 |
| `push.requestPermission` | Phase 3 | 알림 권한 요청 |
| `push.getToken` | Phase 3 | 푸시 토큰 조회 |
| `media.pickImage` | Phase 4 | 촬영/갤러리 선택 |

## 5. event 목록

| event | 상태 | 설명 |
|---|---|---|
| `push.opened` | Phase 3 | 알림을 눌러서 앱에 진입 |
| `auth.expired` | Phase 2 | 저장된 세션 만료 |
| `app.foreground` | - | 앱이 백그라운드에서 돌아옴 |

## 6. 규약 변경 시

`src/bridge/protocol.ts` 가 정본이다. 웹 레포와 항상 동일하게 유지할 것.
한쪽만 바꾸면 타입체크는 통과하는데 런타임에서 조용히 깨진다.
