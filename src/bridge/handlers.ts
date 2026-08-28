import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

import type { BridgeAction } from './protocol';

export type BridgeHandler = (args: { payload: unknown }) => Promise<unknown>;

/**
 * action → 실제 네이티브 동작.
 * 여기에 등록되지 않은 action 은 웹에게 UNKNOWN_ACTION 으로 거절된다.
 */
export type BridgeHandlerMap = Partial<Record<BridgeAction, BridgeHandler>>;

export const createBridgeHandlers = (): BridgeHandlerMap => ({
  'app.getInfo': async () => ({
    platform: Platform.OS,
    osVersion: Device.osVersion,
    deviceName: Device.deviceName,
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    isDevice: Device.isDevice,
  }),

  // Phase 2 에서 auth.*, Phase 3 에서 push.*, Phase 4 에서 media.* 를 여기에 채운다.
});
