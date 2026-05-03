import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

type HapticTriggerType = 'selection' | 'impactLight' | 'impactMedium' | 'impactHeavy' | 'rigid' | 'soft' | 'notificationSuccess' | 'notificationWarning' | 'notificationError';

/**
 * Standardized haptic feedback triggers for Laika Music.
 * Uses a consistent naming convention for different interaction types.
 * Safe for use even if native module is not linked.
 */
export const Haptics = {
  /**
   * Internal safe trigger
   */
  _trigger: (type: HapticTriggerType) => {
    try {
      // Check if trigger is available to avoid "could not be found" errors
      if (ReactNativeHapticFeedback && typeof ReactNativeHapticFeedback.trigger === 'function') {
        ReactNativeHapticFeedback.trigger(type as any, options);
      }
    } catch (e) {
      // Silently fail if native module is missing
    }
  },

  selection: () => {
    Haptics._trigger("selection");
  },

  impactLight: () => {
    Haptics._trigger("impactLight");
  },

  impactMedium: () => {
    Haptics._trigger("impactMedium");
  },

  impactHeavy: () => {
    Haptics._trigger("impactHeavy");
  },

  notificationSuccess: () => {
    Haptics._trigger("notificationSuccess");
  },

  notificationError: () => {
    Haptics._trigger("notificationError");
  },
};
