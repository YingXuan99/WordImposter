// Offline, dev-time script. NOT run by `npm run build`/`dev` and NOT bundled
// into the app — @xenova/transformers stays a devDependency only.
//
// Usage: npm run gen:embeddings
// Re-run whenever src/data/wordCategories.js changes.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { pipeline } from "@xenova/transformers";
import { WORD_CATEGORIES } from "../src/data/wordCategories.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, "../src/data/wordEmbeddings.json");
const MODEL = "Xenova/all-MiniLM-L6-v2";

function round(vec, dp = 4) {
  const f = 10 ** dp;
  return Array.from(vec, (x) => Math.round(x * f) / f);
}

function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // vectors are unit-length (normalize: true), so dot === cosine similarity
}

async function main() {
  console.log(`Loading ${MODEL}...`);
  const extractor = await pipeline("feature-extraction", MODEL, { quantized: true });

  const categories = {};
  let dim = null;

  for (const [category, words] of Object.entries(WORD_CATEGORIES)) {
    console.log(`Embedding category "${category}" (${words.length} words)...`);
    const vectors = {};
    for (const word of words) {
      const output = await extractor(word, { pooling: "mean", normalize: true });
      const vec = round(Array.from(output.data));
      dim = dim ?? vec.length;
      vectors[word] = vec;
    }
    categories[category] = vectors;

    if (words.length < 10) {
      console.warn(`  Warning: "${category}" has only ${words.length} words — too few for meaningful close/mild/low bucketing.`);
    }

    // Sanity signal: show the closest pair within this category.
    let best = { a: null, b: null, sim: -Infinity };
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < words.length; j++) {
        const sim = cosineSimilarity(vectors[words[i]], vectors[words[j]]);
        if (sim > best.sim) best = { a: words[i], b: words[j], sim };
      }
    }
    if (best.a) {
      console.log(`  Closest pair: "${best.a}" / "${best.b}" (${best.sim.toFixed(3)})`);
    }
  }

  const data = {
    model: MODEL,
    dim,
    generatedAt: new Date().toISOString(),
    categories,
  };

  writeFileSync(OUT_PATH, JSON.stringify(data));
  console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
