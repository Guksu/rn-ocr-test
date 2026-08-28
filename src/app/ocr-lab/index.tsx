import { Link } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const OcrLabHomeScreen = () => (
  <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <View style={styles.notice}>
      <Text style={styles.noticeTitle}>1회용 검증 코드</Text>
      <Text style={styles.noticeBody}>
        이 화면과 src/ocr-lab 아래 코드는 검증이 끝나면 폐기합니다. 제품 코드와 섞지 마세요.
      </Text>
    </View>

    <Link href="/ocr-lab/batch" asChild>
      <Pressable style={styles.card}>
        <Text style={styles.cardTitle}>배치 모드 — 숫자로 검증</Text>
        <Text style={styles.cardDescription}>
          여러 장을 한 번에 OCR 하고 정답을 입력하면 완전일치율 · 근사일치율을 집계합니다.
          {'\n'}구글 · 유저 업로드 이미지 세트용.
        </Text>
      </Pressable>
    </Link>

    <Link href="/ocr-lab/observe" asChild>
      <Pressable style={styles.card}>
        <Text style={styles.cardTitle}>관찰 모드 — 눈으로 검증</Text>
        <Text style={styles.cardDescription}>
          한 장을 찍거나 골라서 이미지와 추출 결과를 나란히 봅니다.
          {'\n'}직접 촬영한 사진의 실패 원인을 찾는 용도.
        </Text>
      </Pressable>
    </Link>

    <View style={styles.info}>
      <Text style={styles.infoTitle}>측정 조건 축</Text>
      <Text style={styles.infoBody}>
        표면(평면/곡면) × 재질(무광/유광) × 조명(밝음/매장/그림자) × 글씨크기(대/소){'\n'}
        잘 나온 사진만 모으면 실험이 무의미해집니다. 어려운 것도 넣으세요.
      </Text>

      <Text style={styles.infoTitle}>실행 환경</Text>
      <Text style={styles.infoBody}>
        ML Kit 은 시뮬레이터에서 동작하지 않습니다. 두 모드 모두 실기기에서 실행하세요.
        {'\n'}현재 플랫폼: {Platform.OS}
      </Text>
    </View>
  </ScrollView>
);

export default OcrLabHomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  content: { padding: 20, gap: 12 },
  notice: {
    backgroundColor: '#fff4e5',
    borderRadius: 12,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: '#f0d9b5',
  },
  noticeTitle: { fontSize: 13, fontWeight: '700', color: '#8a5a00' },
  noticeBody: { fontSize: 12, lineHeight: 18, color: '#8a5a00' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#111111' },
  cardDescription: { fontSize: 13, lineHeight: 19, color: '#6e6e73' },
  info: { marginTop: 8, padding: 16, gap: 6 },
  infoTitle: { marginTop: 8, fontSize: 13, fontWeight: '600', color: '#3a3a3c' },
  infoBody: { fontSize: 12, lineHeight: 19, color: '#8a8a8e' },
});
