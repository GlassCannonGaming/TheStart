/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface QueuedSpeechItem {
  text: string;
  charName?: string;
  pitch: number;
  rate: number;
  isDark: boolean;
}

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private alwaysSpeakOutLoud: boolean = false;

  // Non-interrupting FIFO Speech Queue & Single Active Speaker Lock so ONLY ONE TOON speaks at a time
  private speechQueue: QueuedSpeechItem[] = [];
  private isSpeakingQueue: boolean = false;
  private activeSpeakerId: string | null = null;
  private speakerListeners: Set<(speakerId: string | null) => void> = new Set();
  private lastWahTime: number = 0;

  // Screensaver Background Music (Lyria + Procedural Family Motif Fallback)
  private screensaverActive: boolean = false;
  private lyriaAudioEl: HTMLAudioElement | null = null;
  private lyriaAudioUrl: string | null = null;
  private proceduralMusicTimer: number | null = null;
  private musicChordStep: number = 0;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      if (this.lyriaAudioEl) {
        this.lyriaAudioEl.pause();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      this.speechQueue = [];
      this.isSpeakingQueue = false;
      this.setActiveSpeaker(null);
    } else if (this.screensaverActive && this.lyriaAudioEl) {
      this.lyriaAudioEl.play().catch(() => {});
    }
  }

  private setActiveSpeaker(speakerId: string | null) {
    if (this.activeSpeakerId === speakerId) return;
    this.activeSpeakerId = speakerId;
    queueMicrotask(() => {
      this.speakerListeners.forEach((cb) => cb(this.activeSpeakerId));
    });
  }

  public getActiveSpeakerId(): string | null {
    return this.activeSpeakerId;
  }

  public onActiveSpeakerChange(cb: (speakerId: string | null) => void): () => void {
    this.speakerListeners.add(cb);
    return () => {
      this.speakerListeners.delete(cb);
    };
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setAlwaysSpeakOutLoud(speak: boolean) {
    this.alwaysSpeakOutLoud = speak;
  }

  public isAlwaysSpeakOutLoud(): boolean {
    return this.alwaysSpeakOutLoud;
  }

  public toggleAlwaysSpeakOutLoud(): boolean {
    this.alwaysSpeakOutLoud = !this.alwaysSpeakOutLoud;
    return this.alwaysSpeakOutLoud;
  }

  /**
   * Starts Screensaver Background Music tailored to the household's traits & mood:
   * 1. Immediately plays a warm, cozy zero-cost procedural family lounge chord progression
   * 2. Optionally calls /api/music/screensaver only when `enableLyriaStream` is true
   */
  public async startScreensaverMusic(
    familyTraits: string[] = ['Creative', 'Ambitious', 'Warm'],
    isDarkMode: boolean = false,
    scenarioTitle: string = 'The House',
    enableLyriaStream: boolean = false
  ) {
    this.screensaverActive = true;
    this.startProceduralFamilyMusic(familyTraits, isDarkMode);

    if (typeof window === 'undefined' || !enableLyriaStream) return;

    try {
      const response = await fetch('/api/music/screensaver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          traits: familyTraits,
          isDarkMode,
          scenarioTitle,
          enableLyriaStream: true,
        }),
      });

      if (!response.ok || !this.screensaverActive) return;
      const data = await response.json();
      if (!data.audioBase64 || !this.screensaverActive) return;

      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      if (this.lyriaAudioUrl) {
        URL.revokeObjectURL(this.lyriaAudioUrl);
      }
      this.lyriaAudioUrl = URL.createObjectURL(blob);

      this.stopProceduralFamilyMusic();

      const audio = new Audio(this.lyriaAudioUrl);
      audio.loop = true;
      audio.volume = this.isSpeakingQueue ? 0.14 : 0.32;
      this.lyriaAudioEl = audio;

      if (!this.muted && this.screensaverActive) {
        await audio.play().catch(() => {
          this.startProceduralFamilyMusic(familyTraits, isDarkMode);
        });
      }
    } catch {
      // Procedural family soundtrack continues smoothly
    }
  }

  public stopScreensaverMusic() {
    this.screensaverActive = false;
    this.stopProceduralFamilyMusic();
    if (this.lyriaAudioEl) {
      this.lyriaAudioEl.pause();
      this.lyriaAudioEl.currentTime = 0;
      this.lyriaAudioEl = null;
    }
  }

  private startProceduralFamilyMusic(traits: string[], isDarkMode: boolean) {
    this.stopProceduralFamilyMusic();
    if (typeof window === 'undefined') return;

    // Select chord voicings that match the family's personality
    const isArtistic = traits.some((t) => t === 'Creative' || t === 'Artistic' || t === 'Music Lover');
    const lightChords = isArtistic
      ? [
          [261.63, 329.63, 392.0, 493.88], // Cmaj7
          [220.0, 261.63, 329.63, 392.0],  // Am7
          [293.66, 349.23, 440.0, 523.25], // Dm7
          [196.0, 246.94, 293.66, 349.23], // G7
        ]
      : [
          [293.66, 369.99, 440.0, 554.37], // Dmaj7
          [246.94, 293.66, 369.99, 440.0], // Bm7
          [329.63, 392.0, 493.88, 587.33], // Em7
          [220.0, 277.18, 329.63, 392.0],  // A7
        ];

    const darkChords = [
      [220.0, 261.63, 329.63, 415.3],  // Am(maj7)
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [146.83, 174.61, 220.0, 261.63], // Dm7
      [164.81, 207.65, 246.94, 293.66], // E7
    ];

    const chords = isDarkMode ? darkChords : lightChords;

    const playStep = () => {
      if (!this.screensaverActive || this.muted || this.lyriaAudioEl) return;
      this.initCtx();
      if (!this.ctx) return;

      try {
        const now = this.ctx.currentTime;
        const chord = chords[this.musicChordStep % chords.length];
        this.musicChordStep++;

        // Duck background music volume when characters are speaking
        const baseVol = this.isSpeakingQueue ? 0.015 : 0.032;

        chord.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          const filter = this.ctx!.createBiquadFilter();

          osc.type = idx === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(idx === 0 ? freq * 0.5 : freq, now + idx * 0.18);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(isDarkMode ? 750 : 1200, now);

          gain.gain.setValueAtTime(0.0001, now + idx * 0.18);
          gain.gain.linearRampToValueAtTime(baseVol, now + idx * 0.18 + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 2.3);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx!.destination);

          osc.start(now + idx * 0.18);
          osc.stop(now + 2.35);
        });
      } catch {}
    };

    playStep();
    this.proceduralMusicTimer = window.setInterval(playStep, 2400);
  }

  private stopProceduralFamilyMusic() {
    if (this.proceduralMusicTimer !== null && typeof window !== 'undefined') {
      clearInterval(this.proceduralMusicTimer);
      this.proceduralMusicTimer = null;
    }
  }

  /**
   * Iconic Peanuts Cartoon Parent + Natural Voice Formant Synthesis:
   * Volume-equalized across all pitches (so high/feminine and low/masculine voices
   * have identical perceived loudness) and staggered so multiple toons never
   * blast over top of each other.
   */
  public playPeanutsWahWah(syllableCount?: number, pitchMultiplier = 1.0) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const nowMs = Date.now();
      const delayOffsetSec = nowMs - this.lastWahTime < 750 ? 0.65 : 0.01;
      this.lastWahTime = nowMs + delayOffsetSec * 1000;

      const count = syllableCount || Math.floor(Math.random() * 3) + 2;
      const clampedPitch = Math.max(0.75, Math.min(1.4, pitchMultiplier));
      const baseFreq = 148 * clampedPitch;
      let startTime = this.ctx.currentTime + delayOffsetSec;

      // Equalize loudness: higher pitches get a 1.35x gain boost & wider formant center
      const equalizedPeakGain = clampedPitch > 1.08 ? 0.155 : 0.115;

      for (let s = 0; s < count; s++) {
        const duration = 0.15 + Math.random() * 0.07;
        const gap = 0.045 + Math.random() * 0.035;
        const noteTime = startTime;
        startTime += duration + gap;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        // Warm vocal formant bandpass filter (lower Q = fuller, more natural human-like resonance)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.setValueAtTime(3.8, noteTime);

        const fStart = 420 * clampedPitch;
        const fPeak = 1450 * clampedPitch;
        const fEnd = 520 * clampedPitch;

        filter.frequency.setValueAtTime(fStart, noteTime);
        filter.frequency.exponentialRampToValueAtTime(fPeak, noteTime + duration * 0.42);
        filter.frequency.exponentialRampToValueAtTime(fEnd, noteTime + duration);

        const notePitch = baseFreq * (s % 2 === 1 ? 1.1 : 1.0);
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(notePitch * 0.97, noteTime);
        osc1.frequency.linearRampToValueAtTime(notePitch * 1.03, noteTime + 0.04);
        osc1.frequency.exponentialRampToValueAtTime(notePitch * 0.95, noteTime + duration);

        osc2.type = 'triangle';
        osc2.detune.setValueAtTime(10, noteTime);
        osc2.frequency.setValueAtTime(notePitch, noteTime);

        // Fundamental chest resonance so higher-pitched voices sound warm and full
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(notePitch * 0.5, noteTime);

        oscGain.gain.setValueAtTime(0.001, noteTime);
        oscGain.gain.linearRampToValueAtTime(equalizedPeakGain, noteTime + 0.025);
        oscGain.gain.exponentialRampToValueAtTime(0.001, noteTime + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        subOsc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.ctx.destination);

        osc1.start(noteTime);
        osc2.start(noteTime);
        subOsc.start(noteTime);
        osc1.stop(noteTime + duration + 0.01);
        osc2.stop(noteTime + duration + 0.01);
        subOsc.stop(noteTime + duration + 0.01);
      }
    } catch {
      // AudioContext policy safeguard
    }
  }

  /**
   * Vocalizes character self-talk or conversation:
   * Strictly serialized through the Single Active Speaker Queue so ONLY ONE TOON speaks at a time!
   */
  public vocalizeThought(
    text: string,
    pitchMultiplier = 1.0,
    isDark = false,
    charName?: string
  ) {
    if (this.muted) return;

    const speechPitch = Math.max(0.82, Math.min(1.22, pitchMultiplier));
    this.enqueueSpeech({
      text: text || 'Hmm...',
      charName,
      pitch: speechPitch,
      rate: isDark ? 0.95 : 1.02,
      isDark,
    });
  }

  /**
   * Speaks directly as The House Agent (the omniscient main character) using resonant TTS
   */
  public speakAsTheHouse(text: string, isGore = false) {
    if (this.muted || !text) return;
    this.enqueueSpeech(
      {
        text,
        charName: 'THE_HOUSE',
        pitch: isGore ? 0.84 : 0.92,
        rate: isGore ? 0.95 : 1.0,
        isDark: isGore,
      },
      true
    );
  }

  public playMurmur(pitchMultiplier: number = 1.0, _isDark: boolean = false) {
    this.playPeanutsWahWah(undefined, pitchMultiplier);
  }

  public playClick(freq = 480) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.04);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  public playChime(success = true) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = success ? [523.25, 659.25, 783.99] : [349.23, 311.13, 261.63];
      notes.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const t = now + idx * 0.07;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + 0.26);
      });
    } catch {}
  }

  /**
   * Direct immediate speech (e.g. clicking "Listen" in Character Inspector)
   */
  public speakEnglish(text: string, pitch = 1.0, rate = 1.02, charName?: string) {
    if (this.muted) return;
    this.enqueueSpeech(
      {
        text,
        charName,
        pitch: Math.max(0.82, Math.min(1.22, pitch)),
        rate,
        isDark: false,
      },
      true
    );
  }

  /**
   * Non-interrupting FIFO Speech Queue with Gemini 3.8 TTS + Equalized Web Speech API
   * Ensures Marcus never interrupts Elena or Sophia and all characters speak at 100% normalized volume.
   */
  private enqueueSpeech(item: QueuedSpeechItem, prioritize = false) {
    const cleanText = item.text
      .replace(/\[.*?\]/g, '')
      .replace(/^\(.*?\):\s*/g, '')
      .replace(/["]/g, '')
      .trim();
    if (!cleanText) return;

    // Avoid queuing duplicate text already waiting in queue
    if (this.speechQueue.some((q) => q.text === cleanText)) return;

    // Keep queue bounded so dialogue stays current
    if (this.speechQueue.length >= 4) {
      this.speechQueue.shift();
    }

    const normalizedItem: QueuedSpeechItem = { ...item, text: cleanText };
    if (prioritize) {
      this.speechQueue.unshift(normalizedItem);
    } else {
      this.speechQueue.push(normalizedItem);
    }

    if (!this.isSpeakingQueue) {
      this.processNextInSpeechQueue();
    }
  }

  private mapCharToGeminiVoice(charName?: string, pitch = 1.0): string {
    const lower = (charName || '').toLowerCase();
    if (lower.includes('the_house') || lower.includes('house')) return 'Charon';
    if (lower.includes('elena') || lower.includes('clara') || lower.includes('beatrice')) return 'Kore';
    if (lower.includes('sophia') || lower.includes('chloe') || lower.includes('nina') || lower.includes('maya')) return 'Zephyr';
    if (lower.includes('marcus') || lower.includes('miles') || lower.includes('leo')) return 'Puck';
    if (lower.includes('arthur') || lower.includes('lawrence') || lower.includes('felix')) return 'Charon';
    return pitch >= 1.1 ? 'Kore' : 'Fenrir';
  }

  private async processNextInSpeechQueue() {
    if (this.muted || this.speechQueue.length === 0) {
      this.isSpeakingQueue = false;
      this.setActiveSpeaker(null);
      if (this.lyriaAudioEl) this.lyriaAudioEl.volume = 0.32;
      return;
    }

    this.isSpeakingQueue = true;
    if (this.lyriaAudioEl) this.lyriaAudioEl.volume = 0.14; // Duck music while speaking

    const nextItem = this.speechQueue.shift()!;
    this.setActiveSpeaker(nextItem.charName || 'SPEAKER');

    const isHouseNarrator = nextItem.charName === 'THE_HOUSE';

    // Play equalized Peanuts vocalization for toon turns
    if (!isHouseNarrator) {
      this.playPeanutsWahWah(undefined, nextItem.pitch);
    }

    // If 'alwaysSpeakOutLoud' is enabled OR The House Narrator is speaking, synthesize full spoken audio
    if (this.alwaysSpeakOutLoud || isHouseNarrator) {
      let playedViaGemini = false;
      try {
        const voiceName = this.mapCharToGeminiVoice(nextItem.charName, nextItem.pitch);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3200);
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: nextItem.text,
            voiceName,
            style: isHouseNarrator
              ? nextItem.isDark
                ? 'Deep, ominous, sentient haunted house narrator voice'
                : 'Warm, resonant, omniscient architectural narrator voice'
              : nextItem.isDark
              ? 'Suspenseful, hushed, dramatic voice'
              : 'Warm, natural, expressive conversational voice at full clear volume',
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok && !this.muted) {
          const data = await res.json();
          if (data.audioBase64) {
            playedViaGemini = await new Promise<boolean>((resolve) => {
              const audio = new Audio(`data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`);
              audio.volume = 1.0; // 100% normalized volume for all speakers
              audio.onended = () => resolve(true);
              audio.onerror = () => resolve(false);
              audio.play().catch(() => resolve(false));
            });
          }
        }
      } catch {
        playedViaGemini = false;
      }

      // Fallback to Browser SpeechSynthesis WITHOUT cancelling other speakers, at 100% volume
      if (!playedViaGemini && !this.muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        await new Promise<void>((resolve) => {
          try {
            const utterance = new SpeechSynthesisUtterance(nextItem.text);
            utterance.pitch = Math.max(0.85, Math.min(1.14, nextItem.pitch));
            utterance.rate = nextItem.rate;
            utterance.volume = 1.0;

            const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
            if (voices.length > 0) {
              const isFem = nextItem.pitch >= 1.08;
              const preferred = voices.find((v) =>
                isFem
                  ? /Samantha|Google US English|Victoria|Karen|Moira|Zira|Female/i.test(v.name)
                  : /Alex|Daniel|Google UK English Male|David|Fred|Male/i.test(v.name)
              );
              utterance.voice = preferred || voices[(nextItem.charName?.length || 0) % voices.length];
            }

            const safetyTimeout = setTimeout(() => resolve(), 5500);
            utterance.onend = () => {
              clearTimeout(safetyTimeout);
              resolve();
            };
            utterance.onerror = () => {
              clearTimeout(safetyTimeout);
              resolve();
            };

            window.speechSynthesis.speak(utterance);
          } catch {
            resolve();
          }
        });
      }
    } else {
      // Wait for the single-speaker Peanuts vocal turn (~2.6s) before allowing the next toon to speak!
      await new Promise((r) => setTimeout(r, 2600));
    }

    // Brief 280ms conversational pause before next speaker in queue
    await new Promise((r) => setTimeout(r, 280));
    this.processNextInSpeechQueue();
  }
}

export const sound = new SoundSynthesizer();
