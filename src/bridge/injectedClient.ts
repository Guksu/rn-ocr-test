/**
 * 웹 페이지 안에 심어줄 클라이언트 코드.
 *
 * 문서가 로드되기 "전에" 실행돼서, 웹은 처음부터 window.AppBridge 를 쓸 수 있다.
 * 이 코드를 앱이 주입하는 이유:
 *   - 웹 레포가 Promise 짝짓기 로직을 따로 구현할 필요가 없다
 *   - 전송 방식(transport)이 앱과 함께 배포돼서 웹/앱 버전이 어긋날 일이 없다
 *
 * 웹에서의 사용법:
 *   const session = await window.AppBridge.request('auth.getSession');
 *   window.AppBridge.on('push.opened', (payload) => { ... });
 */
export const INJECTED_BRIDGE_CLIENT = `
(function () {
  if (window.AppBridge) return;

  var pending = {};
  var listeners = {};
  var seq = 0;

  function request(action, payload, options) {
    var timeoutMs = (options && options.timeoutMs) || 30000;
    var id = 'req_' + Date.now() + '_' + (seq++);

    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        delete pending[id];
        reject(Object.assign(new Error('bridge timeout: ' + action), {
          code: 'INTERNAL',
        }));
      }, timeoutMs);

      pending[id] = { resolve: resolve, reject: reject, timer: timer };

      window.ReactNativeWebView.postMessage(JSON.stringify({
        kind: 'request',
        id: id,
        action: action,
        payload: payload,
      }));
    });
  }

  function handleResponse(message) {
    var entry = pending[message.id];
    if (!entry) return;
    clearTimeout(entry.timer);
    delete pending[message.id];

    if (message.ok) {
      entry.resolve(message.data);
    } else {
      entry.reject(Object.assign(new Error(message.error.message), {
        code: message.error.code,
      }));
    }
  }

  function handleEvent(message) {
    var handlers = listeners[message.event] || [];
    handlers.slice().forEach(function (handler) {
      try {
        handler(message.payload);
      } catch (error) {
        console.error('[AppBridge] event handler error', error);
      }
    });
  }

  function on(event, handler) {
    listeners[event] = listeners[event] || [];
    listeners[event].push(handler);
    return function off() {
      listeners[event] = (listeners[event] || []).filter(function (item) {
        return item !== handler;
      });
    };
  }

  window.AppBridge = {
    isNativeApp: true,
    request: request,
    on: on,
    /** 네이티브 전용 진입점. 웹은 직접 호출하지 않는다. */
    __receive: function (message) {
      if (message.kind === 'response') handleResponse(message);
      else if (message.kind === 'event') handleEvent(message);
    },
  };

  window.dispatchEvent(new Event('appbridgeready'));
})();
true;
`;
