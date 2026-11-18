// REAL Gemini check. Run on your own computer with your own key (never commit the key):
//   PowerShell:  $env:GEMINI_API_KEY="paste-key-here"; npm run check:gemini
//   Mac/Linux:   GEMINI_API_KEY=paste-key-here npm run check:gemini
// Makes 2 real requests (1 word, 1 sentence) to Gemini using the SAME code the app uses.
import { createRequire } from 'node:module';
const { createTranslator } = createRequire(import.meta.url)('../www/translate.js');
const key = process.env.GEMINI_API_KEY;
if (!key) { console.error('Set GEMINI_API_KEY first (see the comment at the top of this file).'); process.exit(2); }
const m = new Map();
const t = createTranslator({ storage: { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) } });
let bad = 0;
for (const [text, lang] of [['accomplish', 'ar'], ['Where is the nearest train station?', 'fr']]) {
  try {
    const r = await t.translate(text, lang, key);
    console.log(`OK  [${r.source}] "${text}" -> ${lang}: ${r.data.translation}`);
  } catch (e) { bad++; console.log(`FAIL "${text}" -> ${lang}: [${e.code}] ${e.message}`); }
}
const again = await t.translate('accomplish', 'ar', key).catch(() => null);
console.log(again && again.source === 'cache' ? 'OK  second request served from cache (no Gemini call)' : 'FAIL cache check');
process.exit(bad ? 1 : 0);
