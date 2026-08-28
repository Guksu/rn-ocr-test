import { Stack } from 'expo-router';

const OcrLabLayout = () => (
  <Stack
    screenOptions={{
      headerBackTitle: '뒤로',
      headerTintColor: '#208AEF',
      headerTitleStyle: { color: '#111111' },
    }}
  >
    <Stack.Screen name="index" options={{ title: 'OCR 검증' }} />
    <Stack.Screen name="batch" options={{ title: '배치 모드' }} />
    <Stack.Screen name="observe" options={{ title: '관찰 모드' }} />
  </Stack>
);

export default OcrLabLayout;
