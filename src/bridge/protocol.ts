/**
 * 웹 ↔ 네이티브 통신 규약.
 *
 * 이 파일은 웹 레포와 항상 같은 내용을 유지해야 한다.
 * 한쪽만 바뀌면 컴파일은 통과하는데 런타임에서 조용히 깨진다.
 * (나중에 사내 npm 패키지로 빼는 걸 추천)
 */

/** 웹이 네이티브에게 시킬 수 있는 일의 전체 목록 */
export type BridgeAction =
  | 'app.getInfo'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.getSession'
  | 'push.requestPermission'
  | 'push.getToken'
  | 'media.pickImage';

/** 네이티브가 웹에게 먼저 알려주는 사건의 전체 목록 */
export type BridgeEventName = 'push.opened' | 'auth.expired' | 'app.foreground';

export type BridgeErrorCode =
  | 'UNKNOWN_ACTION'
  | 'PERMISSION_DENIED'
  | 'CANCELLED'
  | 'INTERNAL';

export type BridgeError = {
  code: BridgeErrorCode;
  message: string;
};

/** 웹 → 네이티브 */
export type BridgeRequest = {
  kind: 'request';
  /** 응답을 요청과 짝지어주는 키. 웹이 만든다. */
  id: string;
  action: BridgeAction;
  payload?: unknown;
};

/** 네이티브 → 웹 (요청에 대한 답) */
export type BridgeResponse =
  | { kind: 'response'; id: string; ok: true; data: unknown }
  | { kind: 'response'; id: string; ok: false; error: BridgeError };

/** 네이티브 → 웹 (요청 없이 먼저 밀어주는 것) */
export type BridgeEvent = {
  kind: 'event';
  event: BridgeEventName;
  payload?: unknown;
};

export type BridgeMessage = BridgeRequest | BridgeResponse | BridgeEvent;

/** 웹에서 온 문자열이 우리가 아는 요청 모양인지 검사 */
export const parseBridgeRequest = ({ raw }: { raw: string }): BridgeRequest | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const candidate = parsed as Partial<BridgeRequest>;
    if (candidate.kind !== 'request') return null;
    if (typeof candidate.id !== 'string' || candidate.id.length === 0) return null;
    if (typeof candidate.action !== 'string') return null;

    return candidate as BridgeRequest;
  } catch {
    return null;
  }
};
