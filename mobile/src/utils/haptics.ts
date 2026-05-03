import ReactNativeHapticFeedback from "react-native-haptic-feedback";

const options = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

/**
 * Standardized haptic feedback triggers for Laika Music.
 * Uses a consistent naming convention for different interaction types.
 */
export const Haptics = {
  /**
   * For light interactions like tab switching or checkbox toggles.
   */
  selection: () => {
    ReactNativeHapticFeedback.trigger("selection", options);
  },

  /**
   * For subtle impacts like opening a menu or a light button press.
   */
  impactLight: () => {
    ReactNativeHapticFeedback.trigger("impactLight", options);
  },

  /**
   * For more significant interactions like Play/Pause, Shuffle/Repeat.
   */
  impactMedium: () => {
    ReactNativeHapticFeedback.trigger("impactMedium", options);
  },

  /**
   * For strong feedback like a long press or a primary action.
   */
  impactHeavy: () => {
    ReactNativeHapticFeedback.trigger("impactHeavy", options);
  },

  /**
   * For success notifications.
   */
  notificationSuccess: () => {
    ReactNativeHapticFeedback.trigger("notificationSuccess", options);
  },

  /**
   * For error or warning notifications.
   */
  notificationError: () => {
    ReactNativeHapticFeedback.trigger("notificationError", options);
  },
};
