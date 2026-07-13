import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const THREE_BUTTON_THRESHOLD = 40;

export function useBottomPadding(basePadding: number = 0): number {
  const insets = useSafeAreaInsets();

  if (Platform.OS !== 'android') return basePadding;

  if (insets.bottom >= THREE_BUTTON_THRESHOLD) {
    return insets.bottom + basePadding + 12;
  }

  return basePadding;
}
