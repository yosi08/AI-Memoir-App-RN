import { Platform } from "react-native";

/**
 * Returns platform-appropriate shadow styles.
 * Web: uses boxShadow (CSS). Native: uses shadow* props.
 */
export function shadow(
  color: string,
  opacity: number,
  radius: number,
  offset: { width: number; height: number }
): object {
  if (Platform.OS === "web") {
    const hex = color.startsWith("#") ? color : "#000000";
    return {
      boxShadow: `${offset.width}px ${offset.height}px ${radius}px ${hexToRgba(hex, opacity)}`,
    };
  }
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: offset,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
