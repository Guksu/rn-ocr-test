# rn-ocr-test — React Native 웹뷰 앱 기술 검증

**출시용 코드가 아니라 기술 검증(spike)용 레포다.** 실제 제품은 별도 저장소에서 개발한다.

## 무엇을 검증하는가

웹뷰 셸 구조의 React Native 앱에서 아래 4개 네이티브 기능이 실제로 동작하는지, 그리고
**상품 성분표를 온디바이스 OCR로 읽어낼 수 있는지**를 실측해서 판단한다.

| # | 검증 항목 | 상태 |
|---|---|---|
| 1 | **성분표 OCR (온디바이스)** — 가장 중요 | 🔬 검증 앱 구현 완료 · 측정 대기 |
| 2 | 소셜 로그인 (카카오 / 애플 / 구글) | ⬜ 대기 |
| 3 | 푸시 알림 | ⬜ 대기 |
| 4 | 로그인 영속화 (보안 저장소) | ⬜ 대기 |
| 5 | 웹 ↔ 네이티브 브릿지 | ✅ 뼈대 완료 |

## 1. 성분표 OCR 검증 (이 레포의 핵심)

### 왜 검증이 필요한가

상품 성분표에서 품목명·성분 텍스트를 추출해 서버 LLM으로 처리하는 기능이다.
텍스트 추출을 **앱(온디바이스)에서 할지 서버에서 할지**가 결정되지 않았고,
이 결정이 브릿지 규약·업로드 API·촬영 UI를 전부 좌우한다.

두 방식의 트레이드오프:

| | A안: 온디바이스 OCR | B안: 이미지를 서버로 |
|---|---|---|
| 건당 비용 | 0원 | 업로드 트래픽 + OCR/멀티모달 토큰 |
| 인식률 개선 배포 | 앱 재배포 + 스토어 심사 | 서버 배포 |
| 플랫폼 간 결과 | iOS/Android 엔진이 달라 차이 발생 가능 | 동일 |
| 오프라인 | 가능 | 불가 |

**비용이 주요 제약**이라 A안을 우선 검증한다. 근거 없이 배제하지 않는다.

### 성분표가 어려운 이유

일반 문서 OCR과 조건이 다르다. 실험 샘플은 이 축을 모두 포함해야 한다.

| 축 | 조건 |
|---|---|
| 표면 | 평면(박스) / 곡면(병·튜브) |
| 재질 | 무광 / 유광·비닐(반사) |
| 조명 | 실내 밝음 / 매장 조명 / 그림자 |
| 글씨 | 큰 편 / 아주 작음 |

### 측정 방법

1. 위 조건별 샘플 수집 (잘 나온 사진만 모으면 실험이 무의미해진다 — 어려운 것도 포함)
2. 사진마다 **정답 성분 리스트**를 사람이 작성
3. 지표는 문자 오류율(CER)이 아니라 **성분명 단위 정확도** — 사용자에게 중요한 건 글자가 아니라 성분이 빠졌는지다
4. **최종 판정은 LLM 통과 후 결과로 한다.** OCR이 틀려도 LLM이 복구하면("정재수" → "정제수") 실용상 문제가 없다

```
A안: 사진 → 온디바이스 OCR → 텍스트 → LLM → 성분 리스트
B안: 사진 →                   이미지 → LLM → 성분 리스트
```

같은 샘플로 A와 B의 성분명 정확도를 나란히 놓고 **"A가 B의 몇 %까지 따라오는가"** 를 본다.
여기에 건당 비용을 얹은 것이 의사결정 근거가 된다.

### 검증 결과

> 아직 측정 전. 완료 후 이 절에 수치를 기록한다.

### OCR 라이브러리 선정

**채택: `react-native-vision-camera-mlkit` v2.0.1**

정적 이미지에서 **한국어를 지정할 수 있으면서 New Architecture 네이티브인 유일한 후보**다.
Expo SDK 57(RN 0.86)은 New Architecture 를 비활성화할 수 없으므로(SDK 55+), 레거시 브리지 방식
라이브러리는 전부 리스크 등급으로 내려간다.

| 라이브러리 | 한국어 | 좌표(bbox) | Expo plugin | 아키텍처 | 관리 상태 | 판정 |
|---|---|---|---|---|---|---|
| **`react-native-vision-camera-mlkit`** | ✅ 정적 이미지에서 지정 가능 | ✅ block/line/element/symbol + 4점 corner | ✅ 내장 (언어별 선택 설치) | **Nitro (New Arch)** | 2026-08 활발 | **채택** |
| `react-native-vision-camera-ocr-plus` | ⚠️ `PhotoRecognizer` 가 Latin 고정 | ✅ | 불필요 | Nitro | 매우 활발 | 2순위 |
| `@react-native-ml-kit/text-recognition` | ✅ | ✅ | 불필요 | ❌ 레거시 브리지 | ★583 이지만 2025-09 정체 | 3순위 |
| `rn-mlkit-ocr` | ✅ | ✅ (corner 없음) | ✅ | ❌ 레거시 브리지 | 1인 | 탈락 |
| `react-native-nitro-vision-kit` | ✅ | ✅ | ❌ | Nitro | 활발 | 탈락 |
| `@infinitered/react-native-mlkit-text-recognition` | ❌ **Latin 전용** | ✅ | Expo Module | Expo Module | 활발 | 탈락 |
| `expo-text-extractor` | ❌ Latin 전용 | ❌ `string[]` 만 반환 | Expo Module | ✅ | 활발 | 탈락 |
| `expo-mlkit-ocr` / `expo-ocr-kit` | ❌ Latin 전용 | 일부 | ✅ | Expo Module | — | 탈락 |
| `@bear-block/vision-camera-ocr` | 미확인 | 미확인 | ❌ | VisionCamera v5 미지원 | — | 탈락 |
| `react-native-tesseract-ocr` | — | — | — | 레거시 | **2021-06 이후 publish 없음** | 탈락 |
| `react-native-mlkit-ocr` (agoldis) | — | — | — | — | **GitHub archived** | 탈락 |

**탈락 사유 요약**

- **한국어 모델이 아예 없음** — Expo 모듈 계열 다수가 `com.google.mlkit:text-recognition`(Latin)만
  링크한다. gradle · podspec 을 직접 확인했다.
- **레거시 브리지** — New Architecture 강제 환경에서 리스크. 가장 널리 쓰이는
  `@react-native-ml-kit/text-recognition`(★583) 이 여기 해당하고, 추가로 iOS 에서 HEIC 세로 사진의
  bbox 가 90° 회전되는 버그가 2024년부터 미해결이다. 레이아웃 복원이 핵심인 용도에 치명적이다.
- **방치/아카이브** — 마지막 publish 가 1년 이상 지난 것들.

**채택 근거**

1. iOS · Android 둘 다 ML Kit 을 쓴다 (`GoogleMLKit/TextRecognitionKorean`,
   `com.google.mlkit:text-recognition-korean`). Apple Vision 을 쓰는 라이브러리와 달리 플랫폼 간
   결과 차이가 최소라 파싱 로직을 한 벌만 유지하면 된다.
2. 성분표 레이아웃 복원에 필요한 좌표가 가장 풍부하다 — 전 계층 `bounds` + 4점 `corners` +
   `confidence`. **4점 corner 로 곡면·기울어진 라벨의 왜곡을 수치로 판정**할 수 있다.
3. Expo config plugin 이 실제로 퍼블리시되어 있어 CNG 워크플로에 그대로 맞는다.
4. 언어 모델별 선택 설치로 번들 크기를 통제한다 (한국어 + Latin 만 남기고 나머지는 끔).

**절충점 (알고 채택함)**

- ★52, 사실상 1인 메인테이너. 코드 품질·문서는 후보 중 최상이지만 bus factor 리스크가 있다.
  → OCR 호출을 `src/ocr-lab/recognizeText.ts` 어댑터 뒤에 격리해 교체 가능하게 유지한다.
- 정적 이미지만 써도 `react-native-vision-camera` + `nitro-modules` + `nitro-image` 가 네이티브
  의존성으로 딸려온다.
- v2.0.0 이 2026-08-02 릴리스로 아주 최신이라 안정화 기간이 짧다.

**탈출구**: ML Kit 한국어 정확도가 부족하면 `ppu-paddle-ocr`(PaddleOCR PP-OCRv5 한국어 모델,
ONNX 추론)로 갈아탈 수 있다. 느리지만 New Architecture 와 무관하고 bbox 도 제공한다.

> **참고**: 한국어 식품·화장품 라벨로 ML Kit vs Apple Vision vs PaddleOCR 을 비교한 공개 벤치마크는
> 존재하지 않는다. 직접 측정하는 것 외에 답을 알 방법이 없고, 그것이 이 레포의 존재 이유다.

## 2. 앱 구조

화면은 전부 웹이 담당하고, RN은 웹이 할 수 없는 것만 브릿지로 제공한다.

```
┌──────────────────────────────────────┐
│  RN 앱 (껍데기)                       │
│  ┌────────────────────────────────┐  │
│  │  WebView = 웹 서비스 전체       │  │
│  └──────────────▲─────────────────┘  │
│              브릿지                    │
│  ┌──────────────▼─────────────────┐  │
│  │  푸시 · 카메라 · 소셜로그인      │  │
│  │  · 보안 저장소                  │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

브릿지 규약과 웹 개발자용 사용법은 [docs/bridge.md](docs/bridge.md) 참고.

```
src/
├─ app/            화면 (expo-router)
├─ bridge/         웹 ↔ 네이티브 통신
│  ├─ protocol.ts       규약 정본 (웹 레포와 동일하게 유지)
│  ├─ injectedClient.ts 웹에 주입할 window.AppBridge
│  ├─ useWebViewBridge.ts
│  └─ handlers.ts       action → 네이티브 동작
└─ config/         환경 설정
```

## 3. 기술 스택

| | |
|---|---|
| Expo SDK | 57 |
| React Native | 0.86.3 |
| React | 19.2.3 |
| 네이티브 폴더 | CNG (`ios/` `android/` 를 커밋하지 않고 config plugin 으로 생성) |
| 실행 방식 | **개발 빌드 필수** — Expo Go 로는 카카오 로그인·푸시가 동작하지 않는다 |

## 4. 실행

```bash
nvm use                     # Node 22 (RN 0.86 은 22.13+ 요구)
npm install
cp .env.example .env        # EXPO_PUBLIC_WEB_ORIGIN 설정

npx expo run:ios --device   # 아이폰을 USB 로 연결한 뒤. 첫 빌드는 10분 내외
```

### ⚠️ 시뮬레이터에서는 동작하지 않는다

ML Kit 프레임워크에 **arm64 시뮬레이터 슬라이스가 없다.** 설치된 바이너리를 확인하면 `x86_64 arm64`
fat binary 이고 xcframework 가 아니라서, Apple Silicon 시뮬레이터(arm64)에서 링크가 실패한다.
**iOS·Android 모두 실기기에서 실행해야 한다.**

Android 는 EAS 클라우드 빌드를 쓰면 Java · Android Studio 설치 없이 APK 를 받을 수 있다.

```bash
eas build --profile development --platform android
```

### 배포

| | 방식 | 팀원 초대 |
|---|---|---|
| Android | EAS 빌드 → 다운로드 링크 · QR 공유 | 불필요 |
| iOS | TestFlight **외부 테스터 공개 링크** | 불필요 (링크만 전달) |

iOS 는 첫 빌드만 베타 심사(약 24시간)를 거치고, 이후 같은 버전의 빌드는 몇 분 내 통과한다.

## 5. 주의사항

- **테스트용 성분표 이미지를 git 에 커밋하지 않는다.** 타사 제품 패키지 사진이라 상표·저작권 문제가 있다.
- `.env` 는 커밋하지 않는다. `EXPO_PUBLIC_` 접두사가 붙은 값은 앱 번들에 그대로 들어가므로 비밀값을 넣지 않는다.
- `src/bridge/protocol.ts` 는 웹 레포와 항상 같은 내용을 유지해야 한다. 한쪽만 바뀌면 타입체크는 통과하고 런타임에서 조용히 깨진다.
