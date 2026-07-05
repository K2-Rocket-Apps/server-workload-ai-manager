/**
 * Simple fuzzy matching for command palette / search (fzf-inspired).
 * Scores contiguous and word-boundary matches higher than scattered chars.
 */

export type FuzzyResult<T> = {
  item: T;
  score: number;
  /** Indices in the original text that matched (for highlighting) */
  indices: number[];
};

const SEPARATORS = /[\s_\-./:\\]+/;

/**
 * Score how well `query` matches `text`.
 * Returns null if no match; higher scores are better matches.
 */
export function scoreMatch(query: string, text: string): { score: number; indices: number[] } | null {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();

  if (q.length === 0) {
    return { score: 0, indices: [] };
  }

  if (t.includes(q)) {
    const start = t.indexOf(q);
    const indices = Array.from({ length: q.length }, (_, i) => start + i);
    const boundaryBonus = start === 0 || SEPARATORS.test(text[start - 1] ?? "") ? 50 : 0;
    return { score: 100 + boundaryBonus + q.length, indices };
  }

  let queryIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;
  const indices: number[] = [];
  let consecutive = 0;

  for (let i = 0; i < t.length && queryIdx < q.length; i++) {
    if (t[i] === q[queryIdx]) {
      indices.push(i);
      let charScore = 1;

      /** Word boundary bonus */
      if (i === 0 || SEPARATORS.test(text[i - 1] ?? "")) {
        charScore += 8;
      }

      /** CamelCase boundary */
      const prev = text[i - 1];
      const curr = text[i];
      if (prev && prev === prev.toLowerCase() && curr === curr.toUpperCase()) {
        charScore += 6;
      }

      /** Consecutive match bonus */
      if (lastMatchIdx === i - 1) {
        consecutive++;
        charScore += 4 + consecutive;
      } else {
        consecutive = 0;
        /** Penalty for gap since last match */
        if (lastMatchIdx >= 0) {
          charScore -= Math.min(10, i - lastMatchIdx - 1);
        }
      }

      /** Early position bonus */
      charScore += Math.max(0, 8 - Math.floor(i / 3));

      score += charScore;
      lastMatchIdx = i;
      queryIdx++;
    }
  }

  if (queryIdx < q.length) {
    return null;
  }

  /** Shorter targets rank slightly higher when scores tie */
  score += Math.max(0, 20 - Math.floor(t.length / 5));

  return { score, indices };
}

/**
 * Filter and sort items by fuzzy score against query.
 */
export function fuzzyFilter<T>(
  items: readonly T[],
  query: string,
  accessor: (item: T) => string,
  limit = 50,
): FuzzyResult<T>[] {
  const q = query.trim();
  if (q.length === 0) {
    return items.slice(0, limit).map((item) => ({ item, score: 0, indices: [] }));
  }

  const results: FuzzyResult<T>[] = [];

  for (const item of items) {
    const text = accessor(item);
    const match = scoreMatch(q, text);
    if (match) {
      results.push({ item, score: match.score, indices: match.indices });
    }
  }

  results.sort((a, b) => b.score - a.score || accessor(a.item).localeCompare(accessor(b.item)));

  return results.slice(0, limit);
}

/**
 * Apply highlight markers for matched indices (returns segments for rendering).
 */
export type HighlightSegment = {
  text: string;
  highlighted: boolean;
};

export function buildHighlightSegments(
  text: string,
  indices: readonly number[],
): HighlightSegment[] {
  if (indices.length === 0) {
    return [{ text, highlighted: false }];
  }

  const indexSet = new Set(indices);
  const segments: HighlightSegment[] = [];
  let current = "";
  let currentHighlight = indexSet.has(0);

  for (let i = 0; i < text.length; i++) {
    const hl = indexSet.has(i);
    if (hl !== currentHighlight && current.length > 0) {
      segments.push({ text: current, highlighted: currentHighlight });
      current = "";
    }
    currentHighlight = hl;
    current += text[i];
  }

  if (current.length > 0) {
    segments.push({ text: current, highlighted: currentHighlight });
  }

  return segments;
}

/**
 * Multi-field fuzzy search: scores best field per item.
 */
export function fuzzyFilterMulti<T>(
  items: readonly T[],
  query: string,
  accessors: readonly ((item: T) => string)[],
  limit = 50,
): FuzzyResult<T>[] {
  const q = query.trim();
  if (q.length === 0) {
    return items.slice(0, limit).map((item) => ({ item, score: 0, indices: [] }));
  }

  const results: FuzzyResult<T>[] = [];

  for (const item of items) {
    let best: { score: number; indices: number[] } | null = null;
    for (const accessor of accessors) {
      const text = accessor(item);
      const match = scoreMatch(q, text);
      if (match && (!best || match.score > best.score)) {
        best = match;
      }
    }
    if (best) {
      results.push({ item, score: best.score, indices: best.indices });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
