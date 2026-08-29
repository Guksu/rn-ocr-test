import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const HomeScreen = () => (
  <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
    <View style={styles.header}>
      <Text style={styles.title}>rn-ocr-test</Text>
      <Text style={styles.subtitle}>기술 검증용 앱 · 제품 코드가 아닙니다</Text>
    </View>

    <View style={styles.menu}>
      <Link href="/ocr-lab" asChild>
        <Pressable style={primaryCardStyle}>
          <Text style={styles.cardTitle}>OCR 검증 실험실</Text>
          <Text style={styles.cardDescription}>
            성분표 온디바이스 OCR 정확도 측정{'\n'}배치 모드(숫자) · 관찰 모드(눈으로)
          </Text>
        </Pressable>
      </Link>

      <Link href="/webview" asChild>
        <Pressable style={styles.card}>
          <Text style={styles.cardTitle}>웹뷰</Text>
          <Text style={styles.cardDescription}>
            웹 서비스 셸 · .env 의 EXPO_PUBLIC_WEB_ORIGIN 을 띄웁니다
          </Text>
        </Pressable>
      </Link>
    </View>
  </SafeAreaView>
);

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  header: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#111111' },
  subtitle: { marginTop: 6, fontSize: 13, color: '#8a8a8e' },
  menu: { paddingHorizontal: 20, gap: 12 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  primaryCard: { borderColor: '#208AEF', borderWidth: 2 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#111111' },
  cardDescription: { fontSize: 13, lineHeight: 19, color: '#6e6e73' },
});

/**
 * <Link asChild> 는 Slot 으로 자식을 복제하는데, 이때 배열 스타일을 넘기면
 * "you are passing an array of styles to a child of <Slot>" 렌더 에러가 난다.
 * 미리 합쳐서 단일 객체로 넘긴다.
 */
const primaryCardStyle = StyleSheet.flatten([styles.card, styles.primaryCard]);
