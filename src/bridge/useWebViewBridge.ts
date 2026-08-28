import { useRef } from 'react';
import type WebView from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

import { TRUSTED_ORIGINS, toOrigin } from '../config/env';
import type { BridgeHandlerMap } from './handlers';
import type { BridgeError, BridgeEvent, BridgeEventName, BridgeResponse } from './protocol';
import { parseBridgeRequest } from './protocol';

/**
 * 웹뷰로 보낼 메시지를 안전한 JS 문자열로 만든다.
 *
 * JSON 안에 따옴표나 U+2028 같은 문자가 들어와도 깨지지 않도록
 * 문자열 리터럴로 한 번 더 감싼 뒤 웹에서 JSON.parse 하게 한다.
 */
const toInjectableScript = ({ message }: { message: BridgeResponse | BridgeEvent }) => {
  const serialized = JSON.stringify(JSON.stringify(message));
  return `window.AppBridge && window.AppBridge.__receive(JSON.parse(${serialized})); true;`;
};

export const useWebViewBridge = ({ handlers }: { handlers: BridgeHandlerMap }) => {
  const webViewRef = useRef<WebView>(null);

  const send = ({ message }: { message: BridgeResponse | BridgeEvent }) => {
    webViewRef.current?.injectJavaScript(toInjectableScript({ message }));
  };

  const respondOk = ({ id, data }: { id: string; data: unknown }) => {
    send({ message: { kind: 'response', id, ok: true, data } });
  };

  const respondError = ({ id, error }: { id: string; error: BridgeError }) => {
    send({ message: { kind: 'response', id, ok: false, error } });
  };

  /** 요청 없이 네이티브가 웹에게 먼저 알려주는 통로 (푸시 수신 등) */
  const emit = ({ event, payload }: { event: BridgeEventName; payload?: unknown }) => {
    send({ message: { kind: 'event', event, payload } });
  };

  const handleMessage = async (nativeEvent: WebViewMessageEvent) => {
    const { data, url } = nativeEvent.nativeEvent;

    const origin = toOrigin({ url });
    if (origin === null || !TRUSTED_ORIGINS.includes(origin)) {
      console.warn('[bridge] 신뢰하지 않는 출처의 메시지를 무시함:', origin);
      return;
    }

    const request = parseBridgeRequest({ raw: data });
    if (request === null) {
      console.warn('[bridge] 규약에 맞지 않는 메시지를 무시함:', data.slice(0, 200));
      return;
    }

    const handler = handlers[request.action];
    if (handler === undefined) {
      respondError({
        id: request.id,
        error: {
          code: 'UNKNOWN_ACTION',
          message: `앱이 모르는 action 입니다: ${request.action}`,
        },
      });
      return;
    }

    try {
      const result = await handler({ payload: request.payload });
      respondOk({ id: request.id, data: result ?? null });
    } catch (error) {
      respondError({
        id: request.id,
        error: {
          code: 'INTERNAL',
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  };

  return { webViewRef, handleMessage, emit };
};
