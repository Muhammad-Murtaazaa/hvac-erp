/**
 * Triggers mobile device vibration (haptic feedback) for key actions.
 * Falls back silently on desktop/unsupported browsers.
 */
export function triggerHaptic(type: "success" | "warning" | "error" | "light" = "light") {
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;

  try {
    switch (type) {
      case "success":
        navigator.vibrate([40, 60, 40]); // Double pulse
        break;
      case "warning":
        navigator.vibrate([60, 40, 60]);
        break;
      case "error":
        navigator.vibrate([100, 50, 100, 50, 100]); // Strong triple pulse
        break;
      case "light":
      default:
        navigator.vibrate(25); // Subtle single tap
        break;
    }
  } catch (e) {
    // Silent catch
  }
}
