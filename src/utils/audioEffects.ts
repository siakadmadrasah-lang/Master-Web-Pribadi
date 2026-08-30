/**
 * Audio Synthesis Engine for Tasbih Digital & Islamic Tools
 * Uses Web Audio API for zero-latency, cross-browser, asset-free sound effects
 */

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Global helper to unlock AudioContext on first user interaction
 */
let isAudioUnlocked = false;
export function autoUnlockAudioOnFirstInteraction(onUnlocked?: () => void) {
  if (typeof window === 'undefined') return;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          isAudioUnlocked = true;
          if (onUnlocked) onUnlocked();
        }).catch(() => {});
      } else {
        isAudioUnlocked = true;
        if (onUnlocked) onUnlocked();
      }
    }
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('scroll', unlock);
    window.removeEventListener('keydown', unlock);
  };

  window.addEventListener('click', unlock, { once: true, passive: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('scroll', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true, passive: true });
}

/**
 * Continuous Serene Ambient Audio Engine (Madrasah Sanctuary & Murottal Ambience)
 */
interface AmbientEngineState {
  isPlaying: boolean;
  gainNode: GainNode | null;
  oscillators: OscillatorNode[];
  lfo: OscillatorNode | null;
  filter: BiquadFilterNode | null;
  timerInterval: any;
}

const ambientState: AmbientEngineState = {
  isPlaying: false,
  gainNode: null,
  oscillators: [],
  lfo: null,
  filter: null,
  timerInterval: null,
};

export function isSereneAmbiencePlaying(): boolean {
  return ambientState.isPlaying;
}

export function startSereneAmbience(_volume: number = 0.22): boolean {
  try {
    // Keep ambient state active without buzzing/droning oscillator frequencies
    stopSereneAmbience();
    ambientState.isPlaying = true;
    return true;
  } catch (e) {
    ambientState.isPlaying = false;
    return false;
  }
}

export function stopSereneAmbience() {
  try {
    if (ambientState.timerInterval) {
      clearInterval(ambientState.timerInterval);
      ambientState.timerInterval = null;
    }

    ambientState.oscillators.forEach(osc => {
      try { osc.stop(); osc.disconnect(); } catch (e) {}
    });
    if (ambientState.lfo) {
      try { ambientState.lfo.stop(); ambientState.lfo.disconnect(); } catch (e) {}
    }
    ambientState.oscillators = [];
    ambientState.lfo = null;
    ambientState.filter = null;
    ambientState.gainNode = null;
    ambientState.isPlaying = false;
  } catch (e) {
    ambientState.isPlaying = false;
  }
}

export function toggleSereneAmbience(volume: number = 0.22): boolean {
  if (ambientState.isPlaying) {
    stopSereneAmbience();
    return false;
  } else {
    startSereneAmbience(volume);
    return true;
  }
}

/**
 * Subtle feedback switch when header speaker is clicked/toggled
 */
export function playHeaderSpeakerChime(turningOn: boolean = true) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.connect(ctx.destination);

    const freq = turningOn ? 480 : 360;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    g.gain.linearRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(g);
    osc1.start(now);
    osc1.stop(now + 0.09);
  } catch (e) {}
}

export type TasbihSoundType = 'wood' | 'click' | 'bell' | 'dew' | 'auto_dzikr';

export interface DhikrSoundProfile {
  name: string;
  badge: string;
  description: string;
  color: string;
}

export const DHIKR_SOUND_PROFILES: Record<string, DhikrSoundProfile> = {
  'Subhanallah': {
    name: 'Subhanallah',
    badge: 'Jernih Syahdu',
    description: 'Resonansi jernih & kemilau tasbih kristal (Maha Suci Allah)',
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200'
  },
  'Alhamdulillah': {
    name: 'Alhamdulillah',
    badge: 'Hangat Syukur',
    description: 'Ketukan kayu akustik hangat bernada mayor (Segala Puji Bagi Allah)',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200'
  },
  'Allahu Akbar': {
    name: 'Allahu Akbar',
    badge: 'Megah Khusyuk',
    description: 'Dentum mantap berwibawa khas bedug/kayu jati (Allah Maha Besar)',
    color: 'text-amber-800 bg-amber-50 border-amber-200'
  },
  'Astaghfirullah': {
    name: 'Astaghfirullah',
    badge: 'Lembut Tawadhu',
    description: 'Tetesan embun tenang & nada lembut memohon ampunan',
    color: 'text-blue-700 bg-blue-50 border-blue-200'
  },
  'La ilaha illallah': {
    name: 'La ilaha illallah',
    badge: 'Sakral Tauhid',
    description: 'Dentingan ganda frekuensi 528Hz meditatif & damai',
    color: 'text-purple-700 bg-purple-50 border-purple-200'
  },
  "Sollallohu 'Ala Muhammad": {
    name: "Sollallohu 'Ala Muhammad",
    badge: 'Sholawat Barokah',
    description: 'Harmoni sejuk & getaran penuh rahmat mahabbah Rasulullah SAW',
    color: 'text-emerald-800 bg-amber-50 border-amber-300'
  },
  "Shollallahu 'Ala Muhammad": {
    name: "Shollallahu 'Ala Muhammad",
    badge: 'Sholawat Barokah',
    description: 'Harmoni sejuk & getaran penuh rahmat mahabbah Rasulullah SAW',
    color: 'text-emerald-800 bg-amber-50 border-amber-300'
  },
};

/**
 * Vocal pronunciation map for dzikir sentences
 */
const DHIKR_VOCAL_CONFIG: Record<string, { speechText: string; rate: number; pitch: number }> = {
  'Subhanallah': {
    speechText: 'Subhanallah',
    rate: 1.05,
    pitch: 1.0
  },
  'Alhamdulillah': {
    speechText: 'Alhamdulillah',
    rate: 1.0,
    pitch: 1.0
  },
  'Allahu Akbar': {
    speechText: 'Allahu Akbar',
    rate: 1.0,
    pitch: 0.95
  },
  'Astaghfirullah': {
    speechText: 'Astaghfirullah',
    rate: 1.05,
    pitch: 1.0
  },
  'La ilaha illallah': {
    speechText: 'Laa ilaaha illallah',
    rate: 0.95,
    pitch: 1.0
  },
  "Sollallohu 'Ala Muhammad": {
    speechText: "Shollallohu 'ala Muhammad",
    rate: 0.95,
    pitch: 1.0
  },
  "Shollallahu 'Ala Muhammad": {
    speechText: "Shollallahu 'ala Muhammad",
    rate: 0.95,
    pitch: 1.0
  }
};

/**
 * 🗣️ Speak the active dzikir sentence clearly with voice synthesis
 */
export function speakDhikrVoice(dhikrName: string, volume: number = 1.0) {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel(); // Cancel any ongoing speech so rapid clicks sound responsive

    const info = DHIKR_VOCAL_CONFIG[dhikrName] || {
      speechText: dhikrName,
      rate: 1.0,
      pitch: 1.0
    };

    const utterance = new SpeechSynthesisUtterance(info.speechText);
    utterance.lang = 'id-ID'; // Explicit language for Android/Chrome compatibility
    utterance.rate = info.rate;
    utterance.pitch = info.pitch;
    utterance.volume = Math.max(0.1, Math.min(1.0, volume));

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith('id') ||
          v.lang.startsWith('ar') ||
          v.name.toLowerCase().includes('indonesia') ||
          v.name.toLowerCase().includes('arabic')
      ) || voices.find((v) => v.default) || voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Dhikr vocal recitation error:', e);
  }
}

/**
 * Play authentic sound effect on each tasbih count bead tap
 * Tailored dynamically according to the selected Dzikir sentence!
 * Also plays clear vocal pronunciation of the dzikir if includeVoice is enabled.
 */
export function playTasbihSound(
  type: TasbihSoundType = 'auto_dzikr',
  volume: number = 0.75,
  dhikrName: string = 'Subhanallah',
  includeVoice: boolean = true
) {
  // 1. Play clear vocal recitation of the chosen dzikir
  if (includeVoice) {
    speakDhikrVoice(dhikrName, 1.0);
  }

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), now);
    masterGain.connect(ctx.destination);

    // If type is auto_dzikr or specific dzikr matching:
    const normalizedDhikr = dhikrName.trim();

    if (type === 'auto_dzikr' || type === 'wood') {
      if (normalizedDhikr === 'Subhanallah') {
        // --- 1. SUBHANALLAH: Pure, serene, celestial overtone shimmer (Tashbih) ---
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const g1 = ctx.createGain();
        const g2 = ctx.createGain();

        // Main woody strike with higher celestial pitch
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(880, now); // A5
        osc1.frequency.exponentialRampToValueAtTime(440, now + 0.05);

        g1.gain.setValueAtTime(0.7, now);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        // High crystal snap shimmer
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1760, now); // A6
        osc2.frequency.exponentialRampToValueAtTime(880, now + 0.03);

        g2.gain.setValueAtTime(0.35, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        osc1.connect(g1);
        osc2.connect(g2);
        g1.connect(masterGain);
        g2.connect(masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.055);
        osc2.stop(now + 0.04);
      } else if (normalizedDhikr === 'Alhamdulillah') {
        // --- 2. ALHAMDULILLAH: Warm, joyful marimba-like acoustic wood harmony (Tahmid) ---
        const oscRoot = ctx.createOscillator();
        const oscThird = ctx.createOscillator();
        const gRoot = ctx.createGain();
        const gThird = ctx.createGain();

        // Root note C5 (523.25Hz)
        oscRoot.type = 'triangle';
        oscRoot.frequency.setValueAtTime(523.25, now);
        oscRoot.frequency.exponentialRampToValueAtTime(261.63, now + 0.06);

        gRoot.gain.setValueAtTime(0.75, now);
        gRoot.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        // Major third harmonic E5 (659.25Hz) giving warm gratitude feel
        oscThird.type = 'sine';
        oscThird.frequency.setValueAtTime(659.25, now);
        oscThird.frequency.exponentialRampToValueAtTime(329.63, now + 0.045);

        gThird.gain.setValueAtTime(0.4, now);
        gThird.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

        oscRoot.connect(gRoot);
        oscThird.connect(gThird);
        gRoot.connect(masterGain);
        gThird.connect(masterGain);

        oscRoot.start(now);
        oscThird.start(now);
        oscRoot.stop(now + 0.065);
        oscThird.stop(now + 0.05);
      } else if (normalizedDhikr === 'Allahu Akbar') {
        // --- 3. ALLAHU AKBAR: Grand, deep resonant teak/bedug strike with solid low body (Takbir) ---
        const bassOsc = ctx.createOscillator();
        const punchOsc = ctx.createOscillator();
        const bassGain = ctx.createGain();
        const punchGain = ctx.createGain();

        // Deep resonant body (220Hz -> 110Hz)
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(280, now);
        bassOsc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

        bassGain.gain.setValueAtTime(0.9, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        // Solid wood attack punch
        punchOsc.type = 'sine';
        punchOsc.frequency.setValueAtTime(880, now);
        punchOsc.frequency.exponentialRampToValueAtTime(220, now + 0.025);

        punchGain.gain.setValueAtTime(0.6, now);
        punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

        bassOsc.connect(bassGain);
        punchOsc.connect(punchGain);
        bassGain.connect(masterGain);
        punchGain.connect(masterGain);

        bassOsc.start(now);
        punchOsc.start(now);
        bassOsc.stop(now + 0.085);
        punchOsc.stop(now + 0.03);
      } else if (normalizedDhikr === 'Astaghfirullah') {
        // --- 4. ASTAGHFIRULLAH: Soft, humble dewdrop mellow tone (Istighfar) ---
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.exponentialRampToValueAtTime(415, now + 0.04);
        osc.frequency.exponentialRampToValueAtTime(310, now + 0.09);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (normalizedDhikr === 'La ilaha illallah') {
        // --- 5. LA ILAHA ILLALLAH: Meditative dual-harmonic 528Hz bell chime (Tahlil) ---
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const g = ctx.createGain();

        // 528Hz Solfeggio frequency + 792Hz fifth overtone
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(528, now);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(792, now);

        g.gain.setValueAtTime(0.65, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc1.connect(g);
        osc2.connect(g);
        g.connect(masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.19);
        osc2.stop(now + 0.19);
      } else if (
        normalizedDhikr.includes('Muhammad') ||
        normalizedDhikr.includes('Sholawat') ||
        normalizedDhikr.includes('Sollallohu') ||
        normalizedDhikr.includes('Shollallahu')
      ) {
        // --- 6. SOLLALLOHU 'ALA MUHAMMAD: Sweet, blessing-filled warm wooden resonance ---
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const g1 = ctx.createGain();
        const g2 = ctx.createGain();

        // Harmonious chord F4 + C5
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(349.23, now);
        osc1.frequency.exponentialRampToValueAtTime(174.61, now + 0.07);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(523.25, now);
        osc2.frequency.exponentialRampToValueAtTime(261.63, now + 0.05);

        g1.gain.setValueAtTime(0.7, now);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

        g2.gain.setValueAtTime(0.4, now);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc1.connect(g1);
        osc2.connect(g2);
        g1.connect(masterGain);
        g2.connect(masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.075);
        osc2.stop(now + 0.055);
      } else {
        // Fallback default woody strike
        playStandardBead(ctx, masterGain, now, 640);
      }
    } else if (type === 'click') {
      // Tactile crisp digital bead click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (type === 'bell') {
      // Soft Tibetan/Islamic prayer chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, now);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.26);
      osc2.stop(now + 0.26);
    } else if (type === 'dew') {
      // Water droplet ping
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(1600, now + 0.04);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.11);
    }

    // Trigger subtle haptic feedback if available on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch (e) {}
    }
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
}

function playStandardBead(ctx: AudioContext, masterGain: GainNode, now: number, baseFreq: number) {
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq / 2, now + 0.045);

  oscGain.gain.setValueAtTime(0.8, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

  osc.connect(oscGain);
  oscGain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.05);
}

/**
 * Celebratory melodic chime when dzikir target (e.g. 33 / 99 / 100) is completed
 */
export function playRoundCompleteSound(volume: number = 0.8) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), now);
    masterGain.connect(ctx.destination);

    // Meditative 4-note harmonic arpeggio (C5 - E5 - G5 - C6)
    const notes = [
      { freq: 523.25, time: 0, duration: 0.5 },     // C5
      { freq: 659.25, time: 0.12, duration: 0.5 },  // E5
      { freq: 783.99, time: 0.24, duration: 0.6 },  // G5
      { freq: 1046.50, time: 0.36, duration: 0.9 }  // C6
    ];

    notes.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const harmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      harmonic.type = 'triangle';
      harmonic.frequency.setValueAtTime(freq * 2, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.35, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      osc.connect(gain);
      harmonic.connect(gain);
      gain.connect(masterGain);

      osc.start(now + time);
      harmonic.start(now + time);
      osc.stop(now + time + duration);
      harmonic.stop(now + time + duration);
    });

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 60, 80]);
      } catch (e) {}
    }
  } catch (e) {
    console.warn('Target chime error:', e);
  }
}

/**
 * Subtle sound when tasbih is reset to zero
 */
export function playResetSound(volume: number = 0.5) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) {
    console.warn('Reset sound error:', e);
  }
}

// Keep a global reference to prevent Chrome/Android garbage-collection of speech utterance mid-playback
declare global {
  interface Window {
    _ahlanUtterance?: SpeechSynthesisUtterance | null;
    _speechUtterance?: SpeechSynthesisUtterance | null;
  }
}

/**
 * 🕌 AHLAN WA SAHLAN GREETING SOUND EFFECT FOR BERANDA WEBSITE
 * Pure vocal greeting with V8 GC fix, Web Speech API, and Web Audio vocal formant synthesis fallback.
 * Works seamlessly on Android Chrome, iOS Safari, desktop browsers, and static offline builds.
 */
export function playAhlanWaSahlanSound(volume: number = 1.0) {
  try {
    // 1. Resume AudioContext with user interaction
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          playVocalAhlanWaSahlanFormant(volume);
        }).catch(() => {});
      } else {
        playVocalAhlanWaSahlanFormant(volume);
      }
    } else {
      playVocalAhlanWaSahlanFormant(volume);
    }

    // 2. Play vocal "Ahlan wa Sahlan" through Web Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        // Cancel previous speech to prevent queue deadlock in Chrome
        window.speechSynthesis.cancel();

        setTimeout(() => {
          try {
            const utterance = new SpeechSynthesisUtterance('Ahlan wa Sahlan');
            // Prevent V8 Garbage Collection bug in Chromium
            window._ahlanUtterance = utterance;

            utterance.lang = 'id-ID'; // Cross-platform phonetic match
            utterance.rate = 0.90; // Natural, clear cadence
            utterance.pitch = 1.05; // Friendly, welcoming tone
            utterance.volume = Math.max(0.4, Math.min(1.0, volume));

            utterance.onend = () => {
              window._ahlanUtterance = null;
            };

            utterance.onerror = (err) => {
              console.warn('SpeechSynthesis greeting error:', err);
              window._ahlanUtterance = null;
            };

            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
              const matchedVoice =
                voices.find(
                  (v) =>
                    v.lang.startsWith('ar') ||
                    v.name.toLowerCase().includes('arabic')
                ) ||
                voices.find(
                  (v) =>
                    v.lang.startsWith('id') ||
                    v.name.toLowerCase().includes('indonesia')
                ) ||
                voices.find((v) => v.default) ||
                voices[0];

              if (matchedVoice) {
                utterance.voice = matchedVoice;
              }
            }

            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.warn('SpeechSynthesis speak failed:', e);
          }
        }, 50);
      } catch (speechErr) {
        console.warn('Speech synthesis initialization error:', speechErr);
      }
    }

    // 3. Gentle tactile pulse feedback on mobile devices
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([60, 40, 90]);
      } catch (e) {}
    }
  } catch (e) {
    console.warn('Ahlan Wa Sahlan sound master error:', e);
  }
}

/**
 * Synthetic Vocal Formant fallback for "Ahlan wa Sahlan" (Ah - lan - wa - Sah - lan)
 * Uses acoustic vocal tract filters (Formants F1 & F2) to create a pure warm vocal cadence
 * without any high ringing bells or harsh chimes.
 */
export function playVocalAhlanWaSahlanFormant(volume: number = 0.9) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const executeSynth = () => {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.min(1.0, volume * 0.75), now);
      masterGain.connect(ctx.destination);

      // Syllables timing & pitch contour for "Ah - lan - wa - Sah - lan"
      // Pitch contour: D3 (146.8Hz) -> F3 (174.6Hz) -> E3 (164.8Hz) -> G3 (196.0Hz) -> D3 (146.8Hz)
      const syllables = [
        { t: 0.00, dur: 0.22, pitch: 155, f1: 750, f2: 1250, label: 'Ah' },
        { t: 0.25, dur: 0.26, pitch: 175, f1: 500, f2: 1400, label: 'lan' },
        { t: 0.55, dur: 0.18, pitch: 165, f1: 450, f2: 950,  label: 'wa' },
        { t: 0.77, dur: 0.28, pitch: 196, f1: 800, f2: 1300, label: 'Sah' },
        { t: 1.08, dur: 0.40, pitch: 146, f1: 520, f2: 1350, label: 'lan' },
      ];

      syllables.forEach(({ t, dur, pitch, f1, f2 }) => {
        const startTime = now + t;

        // Vocal cords fundamental vibration (Warm glottal wave)
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pitch, startTime);
        osc.frequency.exponentialRampToValueAtTime(pitch * 0.96, startTime + dur);

        // Formant Filter 1 (Throat cavity)
        const filter1 = ctx.createBiquadFilter();
        filter1.type = 'bandpass';
        filter1.frequency.setValueAtTime(f1, startTime);
        filter1.Q.setValueAtTime(4.5, startTime);

        // Formant Filter 2 (Oral cavity)
        const filter2 = ctx.createBiquadFilter();
        filter2.type = 'bandpass';
        filter2.frequency.setValueAtTime(f2, startTime);
        filter2.Q.setValueAtTime(5.0, startTime);

        // Syllable volume envelope
        const sylGain = ctx.createGain();
        sylGain.gain.setValueAtTime(0.001, startTime);
        sylGain.gain.linearRampToValueAtTime(0.85, startTime + 0.04);
        sylGain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

        osc.connect(filter1);
        osc.connect(filter2);
        filter1.connect(sylGain);
        filter2.connect(sylGain);
        sylGain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + dur + 0.05);
      });
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(executeSynth).catch(executeSynth);
    } else {
      executeSynth();
    }
  } catch (e) {
    console.warn('Vocal formant fallback error:', e);
  }
}

/**
 * Robust Global Entrance Trigger for Beranda
 * Handles Autoplay policy: If browser blocks unprompted audio, automatically unlocks and plays on first tap/scroll/touch.
 */
let berandaGreetingPlayed = false;
export function triggerBerandaEntranceGreeting() {
  if (typeof window === 'undefined' || berandaGreetingPlayed) return;

  // Check if speaker is active
  try {
    const saved = localStorage.getItem('madrasah_speaker_active');
    if (saved === 'false') return;
  } catch (e) {}

  const attemptPlay = () => {
    if (berandaGreetingPlayed) return;
    berandaGreetingPlayed = true;
    playAhlanWaSahlanSound(1.0);
  };

  // 1. Try immediate playback
  attemptPlay();

  // 2. If audio context or browser restricted it, listen for the very first interaction on the beranda
  const unlockAndTrigger = () => {
    if (!berandaGreetingPlayed) {
      attemptPlay();
    } else {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    }
    window.removeEventListener('pointerdown', unlockAndTrigger);
    window.removeEventListener('touchstart', unlockAndTrigger);
    window.removeEventListener('click', unlockAndTrigger);
    window.removeEventListener('scroll', unlockAndTrigger);
  };

  window.addEventListener('pointerdown', unlockAndTrigger, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAndTrigger, { once: true, passive: true });
  window.addEventListener('click', unlockAndTrigger, { once: true, passive: true });
  window.addEventListener('scroll', unlockAndTrigger, { once: true, passive: true });
}
