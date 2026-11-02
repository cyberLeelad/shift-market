export type ShiftCategory = "mine" | "available" | "unavailable";

export interface ShiftRow {
  shift: string;
  start: string;
  end: string;
  date: string;
  linked: string[];
  holder: string | null;
  offer: string | null;
}