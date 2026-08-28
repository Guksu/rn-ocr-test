import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { INJECTED_BRIDGE_CLIENT } from '../bridge/injectedClient';
import { createBridgeHandlers } from '../bridge/handlers';
import { useWebViewBridge } from '../bridge/useWebViewBridge';
import { WEB_ORIGIN } from '../config/env';

const handlers = createBridgeHandlers();

const WebViewScreen = () => {
  const { webViewRef, handleMessage } = useWebViewBridge({ handlers });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const canGoBackRef = useRef(false);

  useEffect(function bindAndroidHardwareBack() {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBackRef.current) return false; // 앱 종료
      webViewRef.current?.goBack();
      return true; // 웹 히스토리 뒤로
    });

    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <WebView
        ref={webViewRef}
        source={{ uri: WEB_ORIGIN }}
        style={styles.webView}
        // 브릿지를 두 번 주입한다. 클라이언트가 멱등이라 중복 실행은 무시된다.
        //  1) 문서 로드 "전" — 웹이 첫 줄부터 window.AppBridge 를 쓸 수 있게
        //     단, 공식 문서상 안드로이드에서 100% 보장되지 않는다(레이스 컨디션)
        //  2) 문서 로드 "후" — 위가 실패했을 때의 안전망
        //  → 웹은 window.AppBridge 가 없으면 'appbridgeready' 이벤트를 기다려야 한다
        injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE_CLIENT}
        injectedJavaScript={INJECTED_BRIDGE_CLIENT}
        // onMessage 가 없으면 postMessage 자체가 웹에 주입되지 않는다 (필수)
        onMessage={handleMessage}
        onNavigationStateChange={(state) => {
          canGoBackRef.current = state.canGoBack;
        }}
        onLoadStart={() => {
          setIsLoading(true);
          setLoadError(null);
        }}
        onLoadEnd={() => setIsLoading(false)}
        onError={({ nativeEvent }) => setLoadError(nativeEvent.description)}
        // 웹 서비스가 앱 안에서 돌아가는지 판별할 수 있게 하는 표식
        applicationNameForUserAgent="OcrTestApp/1.0"
        allowsBackForwardNavigationGestures
      />

      {isLoading ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" />
        </View>
      ) : null}

      {loadError !== null ? (
        <View style={styles.overlay}>
          <Text style={styles.errorTitle}>페이지를 불러오지 못했습니다</Text>
          <Text style={styles.errorDetail}>{loadError}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default WebViewScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  webView: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    gap: 8,
    padding: 24,
  },
  errorTitle: { fontSize: 16, fontWeight: '600' },
  errorDetail: { fontSize: 13, color: '#666666', textAlign: 'center' },
});
