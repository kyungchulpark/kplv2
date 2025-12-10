/**
 * Conference Color Theme Utility
 * Western Conference = Red
 * Eastern Conference = Blue
 */

export type Conference = "West" | "East";

export interface ConferenceColors {
  border: string;
  bg: string;
  bgLight: string;
  text: string;
  textLight: string;
  accent: string;
}

/**
 * Get Tailwind CSS color classes for a conference
 */
export function getConferenceColors(conference: Conference): ConferenceColors {
  if (conference === "West") {
    return {
      border: "border-red-500/20",
      bg: "bg-red-500",
      bgLight: "bg-red-500/10",
      text: "text-red-500",
      textLight: "text-red-500/70",
      accent: "accent-red-500",
    };
  } else {
    return {
      border: "border-blue-500/20",
      bg: "bg-blue-500",
      bgLight: "bg-blue-500/10",
      text: "text-blue-500",
      textLight: "text-blue-500/70",
      accent: "accent-blue-500",
    };
  }
}

/**
 * Get conference display name
 */
export function getConferenceName(conference: Conference): string {
  return conference === "West" ? "Western Conference" : "Eastern Conference";
}

/**
 * Get conference abbreviation
 */
export function getConferenceAbbr(conference: Conference): string {
  return conference === "West" ? "서부" : "동부";
}
