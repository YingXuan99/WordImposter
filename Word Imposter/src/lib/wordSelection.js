import { WORD_CATEGORIES } from "../data/wordCategories.js";
import embeddingData from "../data/wordEmbeddings.json" with { type: "json" };

// Vectors are generated with normalize: true (see scripts/generate-embeddings.mjs),
// so a plain dot product is equivalent to cosine similarity.
export function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// Word-level "recently used" history (replaces the earlier category-level
// version) — categories are picked uniformly at random each round; it's
// individual words that get suppressed after use, so repeatedly landing on
// the same category no longer means repeatedly landing on the same word.
export function createWordHistory(words) {
  return { weights: new Map(words.map((w) => [w, 1])) };
}

const WORD_DECAY = 0.15;
const WORD_RECOVERY = 0.25;

// Suppresses the weight of every word that was just used (civilian + imposter
// word for the round); every other word's weight is nudged back toward 1, so
// suppression fades over the next several rounds instead of snapping back
// instantly or staying suppressed forever.
export function recordWordUse(history, usedWords) {
  const used = new Set(usedWords);
  for (const [word, weight] of history.weights) {
    history.weights.set(
      word,
      used.has(word) ? weight * WORD_DECAY : weight + (1 - weight) * WORD_RECOVERY
    );
  }
}

export function pickWeighted(items, history) {
  const total = items.reduce((sum, w) => sum + (history.weights.get(w) ?? 1), 0);
  let r = Math.random() * total;
  for (const w of items) {
    r -= history.weights.get(w) ?? 1;
    if (r <= 0) return w;
  }
  return items[items.length - 1]; // floating point fallback
}

function pickUniform(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickTwoDistinctCategories(categoryIds) {
  const a = pickUniform(categoryIds);
  let b;
  do { b = pickUniform(categoryIds); } while (b === a);
  return [a, b];
}

// Ranks every word in `categoryVectors` by similarity to the anchor, then
// picks `counts.close` closest / `counts.mild` mid-ranked / `counts.low`
// least-similar ranked words. Gracefully shrinks the pool for small pools
// (fewer words than the total requested) instead of crashing. Works whether
// `categoryVectors` is the anchor's own category (within-category mode,
// anchor excluded automatically) or a different category (cross-category
// mode, anchor won't be a key in it anyway).
export function bucketSimilarWords(anchorWord, anchorVec, categoryVectors, counts = { close: 2, mild: 2, low: 2 }) {
  const others = Object.keys(categoryVectors).filter((w) => w !== anchorWord);
  const ranked = others
    .map((word) => ({ word, sim: cosineSimilarity(anchorVec, categoryVectors[word]) }))
    .sort((a, b) => b.sim - a.sim);

  const n = ranked.length;
  if (n === 0) return [];

  const { close, mild, low } = counts;
  const midStart = Math.floor(n / 2) - Math.floor(mild / 2);
  const wantedRanks = [
    ...Array.from({ length: close }, (_, i) => i), // close
    ...Array.from({ length: mild }, (_, i) => midStart + i), // mild
    ...Array.from({ length: low }, (_, i) => n - 1 - i), // low
  ];

  const taken = new Set();
  const candidates = [];
  for (const wanted of wantedRanks) {
    let rank = Math.max(0, Math.min(n - 1, wanted));
    while (taken.has(rank) && taken.size < n) rank = (rank + 1) % n;
    if (taken.has(rank)) continue; // pool exhausted (n < 6)
    taken.add(rank);
    candidates.push(ranked[rank].word);
  }
  return candidates;
}

// Orchestrates sneaky-mode word selection. Each round randomly picks one of
// two sub-modes:
//  - "within": 1 category, anchor word vs. the rest of that same category.
//  - "cross": 2 distinct categories, anchor word from category A vs. every
//     word in category B.
// Anchor and paired-word picks are weighted to avoid recently used words
// (wordHistory), then the existing 50/50 coin-flip decides civilian vs.
// imposter side. Mutates wordHistory as a side effect.
export function pickSneakyWordPair(wordHistory) {
  const categoryIds = Object.keys(WORD_CATEGORIES);
  const subMode = Math.random() < 0.5 ? "within" : "cross";

  let anchorCategory, vectorCategory;
  if (subMode === "within") {
    anchorCategory = pickUniform(categoryIds);
    vectorCategory = anchorCategory;
  } else {
    [anchorCategory, vectorCategory] = pickTwoDistinctCategories(categoryIds);
  }

  const anchor = pickWeighted(WORD_CATEGORIES[anchorCategory], wordHistory);
  const anchorVec = embeddingData.categories[anchorCategory][anchor];
  const categoryVectors = embeddingData.categories[vectorCategory];

  // Within-category words are already inherently related, so a "close" bucket
  // there tends to be too similar (too easy to guess, or too confusing) —
  // skip it and lean on mild/low instead. Cross-category keeps close/mild/low
  // since anchor and target start out less related overall.
  const bucketCounts = subMode === "within" ? { close: 0, mild: 3, low: 3 } : { close: 2, mild: 2, low: 2 };
  const candidates = bucketSimilarWords(anchor, anchorVec, categoryVectors, bucketCounts);
  if (candidates.length === 0) {
    throw new Error(`Category "${vectorCategory}" has too few words to pick a pair (needs at least 2).`);
  }
  const paired = pickWeighted(candidates, wordHistory);

  const [civilianWord, imposterWord] = Math.random() > 0.5 ? [anchor, paired] : [paired, anchor];
  recordWordUse(wordHistory, [civilianWord, imposterWord]);

  return { civilianWord, imposterWord, mode: subMode, categories: [anchorCategory, vectorCategory] };
}
