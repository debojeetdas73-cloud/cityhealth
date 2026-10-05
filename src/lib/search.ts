import type { Specialty } from "./types";

const CITY_LIST = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
];

export interface ParsedQuery {
  specialtySlug?: string | undefined;
  city?: string | undefined;
  keywords: string;
}

/**
 * Very small natural-language parser: pulls a city and a specialty out of a
 * free-text healthcare query such as "skin specialist in Mumbai".
 */
export function parseQuery(query: string, specialties: Specialty[]): ParsedQuery {
  const lower = query.toLowerCase();
  const city = CITY_LIST.find((c) => lower.includes(c.toLowerCase()));

  let best: { slug: string; score: number } | undefined;
  for (const s of specialties) {
    const terms = [s.name, s.medical_name, ...(s.keywords ?? [])].filter(Boolean).map((t) => t.toLowerCase());
    for (const term of terms) {
      if (term.length > 2 && lower.includes(term)) {
        const score = term.length;
        if (!best || score > best.score) best = { slug: s.slug, score };
      }
    }
  }

  return { specialtySlug: best?.slug, city, keywords: query.trim() };
}

export const CITIES = CITY_LIST;
