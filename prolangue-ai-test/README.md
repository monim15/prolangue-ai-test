# ProLangue AI Test (v2) — direct Gemini, no Firebase

One screen: type English → pick Arabic / French / Spanish / Turkish → Translate → real Gemini translation.
No backend, no Firebase, no billing. The phone calls Gemini directly and remembers answers on the phone (cache).

## Install on your phone (3 parts)

### A. Get the APK from GitHub (free, ~10 minutes, no Android Studio)
1. Create a free account at github.com. Click **New repository** → name `prolangue-ai-test` → choose **Private** → Create.
2. Click **uploading an existing file**. Unzip this ZIP on your computer, then drag **everything inside the
   `prolangue-ai-test` folder** into the page (include the hidden `.github` folder; if your browser skips it, see the note below). Click **Commit changes**.
3. Open the **Actions** tab (click "I understand… enable" if asked) → **Build debug APK** → **Run workflow** → Run.
4. Wait about 5–8 minutes until the run shows a green ✓. Open the run → scroll to **Artifacts** →
   download **ProLangue-AI-Test-debug-apk** (a .zip) → unzip → `app-debug.apk`.
   (Artifacts are kept 90 days; only you can download them from a private repo.)
   *Note: if `.github` didn't upload: Add file → Create new file → type `.github/workflows/build-apk.yml` as the name → paste the contents of that file from the ZIP → Commit.*

### B. Install the APK
1. Send `app-debug.apk` to your phone (USB, Google Drive, or email to yourself) and tap it.
2. If Android asks, allow **Install unknown apps** for the app you opened it from (Files / Drive / Chrome), then **Install**.
   (It's a debug build, so Google Play Protect may warn "unknown developer": choose Install anyway.)

### C. Add your Gemini key ON THE PHONE (never on GitHub)
1. Get a key at aistudio.google.com/apikey. **Make a new key just for this test** so you can delete it afterwards.
2. Open **ProLangue AI Test** → **Settings: Gemini API key** → paste → **Save key**.
3. Type `accomplish`, choose Arabic, **Translate**. First time: "Fresh from Gemini" (2–6 s).
   Translate it again: instant, "From saved cache (no Gemini call)".

## Security — read this
* The key is **not in the APK, not in this ZIP, not in GitHub**. You type it into the app; it is stored in the
  app's private storage on your phone. That is why the APK is safe to build in a repository.
* This is **a private-test design, NOT production-safe**: the key lives on the device and goes straight from the
  phone to Google. Anyone who has your unlocked phone (or a rooted phone / malware) could read it.
  Never ship an app like this to other people. A real release needs the key on a server (the earlier Cloud Function design).
* Never paste the key into GitHub, a README, a chat, or a screenshot. If you ever do, delete that key in AI Studio and make a new one.
* When finished testing: delete the key in AI Studio and remove it in the app (Settings → Remove key) or uninstall the app.
* Gemini's free tier has rate limits; if you hit them the app says "Gemini rate limit reached".

## Optional: check real Gemini from your computer first (about 1 minute)
Needs Node.js 22. In PowerShell in the project folder: `npm install`, then
`$env:GEMINI_API_KEY="paste-key"` and `npm run check:gemini`. It makes 2 real requests using the app's own code and prints the results.
(Do not save the key in any file.)

## What changed from v1
Removed: Firebase, Cloud Functions, Firestore, rules, deploy steps, Blaze requirement.
Added: `www/translate.js` (Gemini call + validation + on-device cache), key field in Settings.
Same: screen, 4 languages, loading indicator, error messages, Capacitor Android project, GitHub cloud build.
The model is `gemini-2.5-flash` (`DEFAULT_MODEL` in `www/translate.js`); if Google retires it the app says "Model unavailable" and you change that one line.

## Tests
`npm test` → 8 SIMULATED tests (fake Gemini). They check our code, not Gemini's real output.
The GitHub build runs them before building. The real-Gemini test is `npm run check:gemini` or just using the app.
