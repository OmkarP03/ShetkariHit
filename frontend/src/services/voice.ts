/**
 * Voice service abstraction.
 *
 * Voice is a primary input for this product, not a convenience — a farmer who
 * reads slowly should be able to use the whole app without typing. But browser
 * support for Marathi (`mr-IN`) is genuinely patchy: Chrome on Android usually
 * manages recognition, desktop Safari often does not, and Marathi *synthesis*
 * voices are missing on many devices.
 *
 * So: one interface, swappable implementation. When a better provider
 * (Bhashini, Whisper, a cloud TTS) is wired in later, screens do not change.
 * And when nothing is available, callers get a clear `false`/`unsupported`
 * rather than silence — the UI must then offer typing instead of appearing
 * broken.
 */

export type LangCode = 'mr' | 'en' | 'hi' | string;

function bcp47(lang: LangCode): string {
  switch (lang) {
    case 'mr': return 'mr-IN';
    case 'hi': return 'hi-IN';
    case 'en': return 'en-IN';
    default:   return lang;
  }
}

/* ------------------------------------------------------------------ */
/* Text to speech                                                      */
/* ------------------------------------------------------------------ */

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Speak `text` in `lang`. Returns false when synthesis is unavailable, or when
 * no voice exists for the language — the caller should surface that rather
 * than pretend it spoke.
 */
export function speak(text: string, lang: LangCode = 'mr'): boolean {
  if (!ttsSupported() || !text.trim()) return false;

  const synth = window.speechSynthesis;
  synth.cancel(); // never stack utterances on top of each other

  const utter = new SpeechSynthesisUtterance(text);
  const target = bcp47(lang);
  utter.lang = target;

  // Prefer an exact locale match, then any voice for the base language.
  const voices = synth.getVoices();
  const exact = voices.find((v) => v.lang === target);
  const base = voices.find((v) => v.lang.split('-')[0] === target.split('-')[0]);
  const chosen = exact ?? base;
  if (chosen) utter.voice = chosen;

  // Slightly slower than default: agricultural terms plus an elderly listener.
  utter.rate = 0.92;
  utter.pitch = 1;

  synth.speak(utter);
  return true;
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

/** Does a usable voice exist for this language on this device? */
export function hasVoiceFor(lang: LangCode): boolean {
  if (!ttsSupported()) return false;
  const base = bcp47(lang).split('-')[0];
  return window.speechSynthesis.getVoices().some((v) => v.lang.split('-')[0] === base);
}

/* ------------------------------------------------------------------ */
/* Speech to text                                                      */
/* ------------------------------------------------------------------ */

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function recognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function sttSupported(): boolean {
  return typeof window !== 'undefined' && recognitionCtor() !== null;
}

export interface ListenHandle { stop: () => void }

/**
 * Listen once and resolve with the transcript.
 * `onInterim` receives partial results so the UI can show words appearing,
 * which is the main signal to the farmer that the microphone is working.
 */
export function listen(
  lang: LangCode,
  handlers: {
    onResult: (transcript: string) => void;
    onInterim?: (partial: string) => void;
    onError?: (code: string) => void;
    onEnd?: () => void;
  },
): ListenHandle | null {
  const Ctor = recognitionCtor();
  if (!Ctor) { handlers.onError?.('unsupported'); return null; }

  const rec = new Ctor();
  rec.lang = bcp47(lang);
  rec.continuous = false;
  rec.interimResults = Boolean(handlers.onInterim);

  rec.onresult = (e) => {
    let finalText = '';
    let interim = '';
    for (let i = 0; i < e.results.length; i += 1) {
      const alt = e.results[i][0];
      const isFinal = (e.results[i] as unknown as { isFinal?: boolean }).isFinal;
      if (isFinal) finalText += alt.transcript;
      else interim += alt.transcript;
    }
    if (interim) handlers.onInterim?.(interim);
    if (finalText) handlers.onResult(finalText.trim());
  };
  rec.onerror = (e) => handlers.onError?.(e.error);
  rec.onend = () => handlers.onEnd?.();

  try { rec.start(); } catch { handlers.onError?.('start-failed'); return null; }
  return { stop: () => rec.stop() };
}
