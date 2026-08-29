import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Asset } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';

import { prepareImageForOcr, type PreparedImage } from '../../ocr-lab/prepareImage';
import { recognizeText, type OcrOutcome } from '../../ocr-lab/recognizeText';
import { OCR_SAMPLES, SAMPLE_EXPECTED } from '../../ocr-lab/samples';
import {
  gradeIngredients,
  parseExpectedIngredients,
  toPercent,
  type Grade,
} from '../../ocr-lab/scoring';

type BatchItem = {
  key: string;
  label: string;
  /** 합성 샘플이면 조건 설명, 사진첩이면 null */
  condition: string | null;
  charHeightPx: number | null;
  sourceUri: string;
  prepared: PreparedImage | null;
  ocr: OcrOutcome | null;
  error: string | null;
  expectedRaw: string;
  grade: Grade | null;
  /** 정답을 이미 알고 있어 손으로 입력할 필요가 없는 항목 */
  isAutoGraded: boolean;
};

const runOne = async ({
  uri,
  width,
  height,
}: {
  uri: string;
  width: number;
  height: number;
}) => {
  const prepared = await prepareImageForOcr({ uri, width, height });
  const ocr = await recognizeText({ uri: prepared.uri });
  return { prepared, ocr };
};

const BatchScreen = () => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const runSamples = async () => {
    setItems([]);
    setProgress({ done: 0, total: OCR_SAMPLES.length });
    const collected: BatchItem[] = [];

    for (let index = 0; index < OCR_SAMPLES.length; index += 1) {
      const sample = OCR_SAMPLES[index];
      const base: BatchItem = {
        key: sample.id,
        label: sample.group,
        condition: sample.condition,
        charHeightPx: sample.charHeightPx,
        sourceUri: '',
        prepared: null,
        ocr: null,
        error: null,
        expectedRaw: SAMPLE_EXPECTED.join(', '),
        grade: null,
        isAutoGraded: true,
      };

      try {
        const asset = Asset.fromModule(sample.module);
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;

        if (!asset.width || !asset.height) {
          throw new Error('샘플 이미지의 크기를 읽지 못했습니다.');
        }

        const { prepared, ocr } = await runOne({
          uri,
          width: asset.width,
          height: asset.height,
        });

        collected.push({
          ...base,
          sourceUri: uri,
          prepared,
          ocr,
          grade: gradeIngredients({ expected: SAMPLE_EXPECTED, ocrText: ocr.text }),
        });
      } catch (caught) {
        collected.push({
          ...base,
          error: caught instanceof Error ? caught.message : String(caught),
        });
      }

      setProgress({ done: index + 1, total: OCR_SAMPLES.length });
      setItems([...collected]);
    }

    setProgress(null);
  };

  const pickAndRun = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (picked.canceled) return;

    const assets = picked.assets;
    setItems([]);
    setProgress({ done: 0, total: assets.length });
    const collected: BatchItem[] = [];

    // 순차 처리한다. 동시에 돌리면 기기 메모리를 넘겨서 중간부터 조용히 실패한다.
    for (let index = 0; index < assets.length; index += 1) {
      const asset = assets[index];
      const base: BatchItem = {
        key: `photo-${index}-${asset.assetId ?? asset.uri}`,
        label: `사진 #${index + 1}`,
        condition: null,
        charHeightPx: null,
        sourceUri: asset.uri,
        prepared: null,
        ocr: null,
        error: null,
        expectedRaw: '',
        grade: null,
        isAutoGraded: false,
      };

      try {
        const { prepared, ocr } = await runOne({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        });
        collected.push({ ...base, prepared, ocr });
      } catch (caught) {
        collected.push({
          ...base,
          error: caught instanceof Error ? caught.message : String(caught),
        });
      }

      setProgress({ done: index + 1, total: assets.length });
      setItems([...collected]);
    }

    setProgress(null);
  };

  const updateExpected = ({ key, raw }: { key: string; raw: string }) => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.key !== key) return item;

        const expected = parseExpectedIngredients({ raw });
        const grade =
          expected.length === 0 || item.ocr === null
            ? null
            : gradeIngredients({ expected, ocrText: item.ocr.text });

        return { ...item, expectedRaw: raw, grade };
      }),
    );
  };

  const totals = items.reduce(
    (accumulated, item) => ({
      total: accumulated.total + (item.grade?.total ?? 0),
      exact: accumulated.exact + (item.grade?.exact ?? 0),
      near: accumulated.near + (item.grade?.near ?? 0),
    }),
    { total: 0, exact: 0, near: 0 },
  );

  const failedCount = items.filter(
    (item) => item.error !== null || item.ocr?.lines.length === 0,
  ).length;
  const averageMs =
    items.length === 0
      ? 0
      : Math.round(
          items.reduce((sum, item) => sum + (item.ocr?.elapsedMs ?? 0), 0) / items.length,
        );

  const exportResults = async () => {
    const payload = items.map((item) => ({
      id: item.key,
      condition: item.condition,
      charHeightPx: item.charHeightPx,
      elapsedMs: item.ocr?.elapsedMs ?? null,
      lineCount: item.ocr?.lines.length ?? 0,
      keptFullResolution: item.prepared?.keptFullResolution ?? null,
      grade: item.grade,
      text: item.ocr?.text ?? null,
      error: item.error,
    }));
    await Share.share({ message: JSON.stringify(payload, null, 2) });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        style={[styles.button, styles.primaryButton]}
        onPress={runSamples}
        disabled={progress !== null}
      >
        <Text style={styles.primaryButtonText}>
          합성 샘플 {OCR_SAMPLES.length}장 자동 실행
        </Text>
      </Pressable>
      <Text style={styles.buttonHint}>
        정답을 이미 알고 있어 입력 없이 채점됩니다. 글자 크기와 촬영 조건이 통제되어 있어
        &quot;한글이 몇 px부터 깨지는가&quot;를 잴 수 있습니다.
      </Text>

      <Pressable style={styles.button} onPress={pickAndRun} disabled={progress !== null}>
        <Text style={styles.buttonText}>사진첩에서 선택 (실사)</Text>
      </Pressable>

      {progress !== null ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.hint}>
            {progress.done} / {progress.total} 처리 중…
          </Text>
        </View>
      ) : null}

      {items.length > 0 ? (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>집계</Text>
          <View style={styles.summaryRow}>
            <SummaryCell
              label="완전일치"
              value={`${toPercent({ value: totals.exact, total: totals.total })}%`}
              detail={`${totals.exact} / ${totals.total}`}
            />
            <SummaryCell
              label="근사일치"
              value={`${toPercent({ value: totals.near, total: totals.total })}%`}
              detail={`${totals.near} / ${totals.total}`}
            />
          </View>
          <View style={styles.summaryRow}>
            <SummaryCell label="평균 처리시간" value={`${averageMs} ms`} detail="" />
            <SummaryCell
              label="완전 실패"
              value={`${failedCount} 장`}
              detail={`전체 ${items.length} 장`}
            />
          </View>
          <Text style={styles.summaryHint}>
            두 값의 격차가 후처리로 복구 가능한 여지입니다 (격차가 크면 오타 수준, 작으면 아예
            못 읽은 것).
          </Text>

          <Pressable style={styles.button} onPress={exportResults}>
            <Text style={styles.buttonText}>결과 내보내기 (JSON)</Text>
          </Pressable>
        </View>
      ) : null}

      {items.map((item) => (
        <View key={item.key} style={styles.card}>
          <View style={styles.cardHeader}>
            {item.sourceUri.length > 0 ? (
              <Image source={{ uri: item.sourceUri }} style={styles.thumbnail} />
            ) : (
              <View style={styles.thumbnail} />
            )}
            <View style={styles.cardMeta}>
              <Text style={styles.cardTitle}>{item.label}</Text>
              {item.condition !== null ? (
                <Text style={styles.cardCondition}>{item.condition}</Text>
              ) : null}
              {item.charHeightPx !== null ? (
                <Text style={styles.cardMetaText}>한글 높이 {item.charHeightPx}px</Text>
              ) : null}

              {item.error !== null ? (
                <Text style={styles.cardError}>{item.error}</Text>
              ) : (
                <>
                  <Text style={styles.cardMetaText}>
                    {item.ocr?.lines.length ?? 0}줄 · {item.ocr?.elapsedMs ?? 0}ms
                  </Text>
                  <Text style={styles.cardMetaText}>
                    {item.prepared?.keptFullResolution ? '원본 해상도' : '축소됨 ⚠️'}
                  </Text>
                </>
              )}

              {item.grade !== null ? (
                <Text style={styles.cardGrade}>
                  완전 {item.grade.exact}/{item.grade.total} · 근사 {item.grade.near}/
                  {item.grade.total}
                </Text>
              ) : null}
            </View>
          </View>

          {!item.isAutoGraded ? (
            <TextInput
              style={styles.input}
              value={item.expectedRaw}
              onChangeText={(raw) => updateExpected({ key: item.key, raw })}
              placeholder="정답 성분을 쉼표나 줄바꿈으로 구분해 붙여넣기"
              placeholderTextColor="#b0b0b5"
              multiline
            />
          ) : null}

          {item.grade !== null && item.grade.missed.length > 0 ? (
            <Text style={styles.missed}>못 찾음: {item.grade.missed.join(', ')}</Text>
          ) : null}

          {item.ocr !== null ? (
            <Text style={styles.rawText} numberOfLines={6}>
              {item.ocr.text.length === 0 ? '(텍스트 없음)' : item.ocr.text}
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
};

const SummaryCell = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) => (
  <View style={styles.summaryCell}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
    {detail.length > 0 ? <Text style={styles.summaryDetail}>{detail}</Text> : null}
  </View>
);

export default BatchScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f7' },
  content: { padding: 16, gap: 10, paddingBottom: 64 },
  button: {
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
  buttonHint: { fontSize: 11, lineHeight: 17, color: '#8a8a8e', paddingHorizontal: 4 },
  center: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  hint: { fontSize: 13, color: '#8a8a8e' },
  summary: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, gap: 10 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#111111' },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCell: { flex: 1, gap: 2 },
  summaryLabel: { fontSize: 11, color: '#8a8a8e' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#111111' },
  summaryDetail: { fontSize: 11, color: '#8a8a8e' },
  summaryHint: { fontSize: 11, lineHeight: 17, color: '#8a8a8e' },
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', gap: 12 },
  thumbnail: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#e5e5ea' },
  cardMeta: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111111' },
  cardCondition: { fontSize: 13, color: '#3a3a3c' },
  cardMetaText: { fontSize: 12, color: '#8a8a8e' },
  cardGrade: { marginTop: 2, fontSize: 13, fontWeight: '600', color: '#208AEF' },
  cardError: { fontSize: 12, color: '#c00000' },
  input: {
    minHeight: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    padding: 10,
    fontSize: 13,
    lineHeight: 19,
    color: '#111111',
    textAlignVertical: 'top',
  },
  missed: { fontSize: 12, lineHeight: 18, color: '#c00000' },
  rawText: { fontSize: 12, lineHeight: 18, color: '#6e6e73' },
});
