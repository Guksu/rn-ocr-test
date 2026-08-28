import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { prepareImageForOcr, type PreparedImage } from '../../ocr-lab/prepareImage';
import { recognizeText, type OcrOutcome } from '../../ocr-lab/recognizeText';

type Observation = {
  prepared: PreparedImage;
  ocr: OcrOutcome;
};

const ObserveScreen = () => {
  const [observation, setObservation] = useState<Observation | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runOnAsset = async ({
    asset,
  }: {
    asset: ImagePicker.ImagePickerAsset;
  }) => {
    setIsRunning(true);
    setError(null);
    setObservation(null);

    try {
      const prepared = await prepareImageForOcr({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      });
      const ocr = await recognizeText({ uri: prepared.uri });
      setObservation({ prepared, ocr });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setIsRunning(false);
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('사진 접근 권한이 필요합니다.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (picked.canceled) return;

    await runOnAsset({ asset: picked.assets[0] });
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('카메라 권한이 필요합니다.');
      return;
    }

    const picked = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (picked.canceled) return;

    await runOnAsset({ asset: picked.assets[0] });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.actions}>
        <Pressable style={[styles.button, styles.primaryButton]} onPress={takePhoto} disabled={isRunning}>
          <Text style={styles.primaryButtonText}>촬영하기</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={pickFromLibrary} disabled={isRunning}>
          <Text style={styles.buttonText}>갤러리에서 선택</Text>
        </Pressable>
      </View>

      {isRunning ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.hint}>인식 중…</Text>
        </View>
      ) : null}

      {error !== null ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>실패</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      ) : null}

      {observation !== null ? (
        <>
          <Image
            source={{ uri: observation.prepared.uri }}
            style={styles.preview}
            resizeMode="contain"
          />

          <View style={styles.metrics}>
            <Metric label="처리 시간" value={`${observation.ocr.elapsedMs} ms`} />
            <Metric label="검출 라인" value={`${observation.ocr.lines.length} 줄`} />
            <Metric
              label="해상도"
              value={`${observation.prepared.width}×${observation.prepared.height}`}
            />
            <Metric
              label="원본 픽셀"
              value={observation.prepared.keptFullResolution ? '유지됨' : '축소됨 ⚠️'}
            />
          </View>

          {!observation.prepared.keptFullResolution ? (
            <Text style={styles.warning}>
              4MP 상한 때문에 축소했습니다 (원본 {observation.prepared.sourceWidth}×
              {observation.prepared.sourceHeight}). 글자가 작으면 인식률이 떨어질 수 있습니다 —
              성분표를 프레임에 꽉 채워 다시 찍어보세요.
            </Text>
          ) : null}

          <Text style={styles.sectionTitle}>추출 결과</Text>
          {observation.ocr.lines.length === 0 ? (
            <Text style={styles.empty}>텍스트를 하나도 찾지 못했습니다.</Text>
          ) : (
            observation.ocr.lines.map((line, index) => (
              <View key={`${index}-${line.top}`} style={styles.lineRow}>
                <Text style={styles.lineIndex}>{index + 1}</Text>
                <Text style={styles.lineText}>{line.text}</Text>
                {line.confidence !== null ? (
                  <Text style={styles.lineConfidence}>
                    {Math.round(line.confidence * 100)}%
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </>
      ) : null}
    </ScrollView>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metric}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

export default ObserveScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  actions: { flexDirection: 'row', gap: 10 },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d1d6',
  },
  primaryButton: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#111111' },
  primaryButtonText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  center: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  hint: { fontSize: 13, color: '#8a8a8e' },
  preview: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    backgroundColor: '#e5e5ea',
  },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: {
    flexGrow: 1,
    minWidth: '46%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    gap: 2,
  },
  metricLabel: { fontSize: 11, color: '#8a8a8e' },
  metricValue: { fontSize: 15, fontWeight: '600', color: '#111111' },
  warning: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8a5a00',
    backgroundColor: '#fff4e5',
    borderRadius: 10,
    padding: 12,
  },
  sectionTitle: { marginTop: 8, fontSize: 15, fontWeight: '700', color: '#111111' },
  empty: { fontSize: 13, color: '#8a8a8e', paddingVertical: 16 },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  lineIndex: { fontSize: 11, color: '#c7c7cc', minWidth: 20, paddingTop: 2 },
  lineText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#111111' },
  lineConfidence: { fontSize: 11, color: '#8a8a8e', paddingTop: 3 },
  errorBox: { backgroundColor: '#ffeaea', borderRadius: 10, padding: 14, gap: 4 },
  errorTitle: { fontSize: 13, fontWeight: '700', color: '#c00000' },
  errorBody: { fontSize: 12, lineHeight: 18, color: '#c00000' },
});
