// 8-Bit Web Audio API Sound Synthesizer & Chiptune Sequencer for Roadkill

class RetroAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;

  private isMuted: boolean = false;
  private bgmPlaying: boolean = false;
  private bgmTimer: number | null = null;
  private currentTrackTheme: string = 'TITLE';

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(sfx: number, bgm: number) {
    this.initContext();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, sfx)), this.ctx.currentTime);
    }
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(Math.max(0, Math.min(1, bgm)), this.ctx.currentTime);
    }
  }

  // --- MOTORCYCLE ENGINE SOUND ---
  public updateEngineSound(speedRatio: number, isBoosting: boolean) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    if (!this.engineOsc) {
      try {
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, this.ctx.currentTime);

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.sfxGain);

        this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
        this.engineOsc.start();
      } catch {
        // Audio context may not be allowed until user gesture
      }
    }

    if (this.engineOsc && this.engineGain && this.ctx) {
      const targetFreq = 50 + speedRatio * 180 + (isBoosting ? 90 : 0);
      this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
      const targetVol = speedRatio > 0.05 ? 0.08 + speedRatio * 0.07 : 0.04;
      this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.05);
    }
  }

  public stopEngineSound() {
    if (this.engineOsc) {
      try {
        this.engineOsc.stop();
        this.engineOsc.disconnect();
      } catch {}
      this.engineOsc = null;
      this.engineGain = null;
    }
  }

  // --- SOUND EFFECTS ---
  public playPunch() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.13);

    // Add noise thump
    this.playNoise(0.08, 0.25, 400);
  }

  public playKick() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.18);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.19);

    this.playNoise(0.12, 0.3, 280);
  }

  public playWeaponHit(weapon: string) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    
    // Metallic chime for chain or heavy pipe
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();

    osc1.type = weapon === 'CHAIN_WHIP' ? 'sawtooth' : 'triangle';
    const baseFreq = weapon === 'CHAIN_WHIP' ? 1200 : 700;
    osc1.frequency.setValueAtTime(baseFreq, t);
    osc1.frequency.exponentialRampToValueAtTime(180, t + 0.22);

    gain1.gain.setValueAtTime(0.4, t);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);

    osc1.start(t);
    osc1.stop(t + 0.23);

    this.playNoise(0.15, 0.35, 600);
  }

  public playTireScreech() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    this.playNoise(0.14, 0.18, 1800, 'bandpass');
  }

  public playCrash() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Low rumble
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.5);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.51);

    this.playNoise(0.45, 0.6, 800, 'lowpass');
  }

  public playNitro() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(250, t);
    osc.frequency.linearRampToValueAtTime(800, t + 0.4);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.41);
  }

  public playRepairSuccess() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.36);
  }

  public playScreech() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.3);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.31);
  }

  public playCountDown(isFinal: boolean = false) {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(isFinal ? 880 : 440, t);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + (isFinal ? 0.4 : 0.18));

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + (isFinal ? 0.41 : 0.19));
  }

  public playCheckpoint() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isMuted) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime + i * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  private playNoise(duration: number, volume: number, filterFreq: number = 1000, filterType: BiquadFilterType = 'lowpass') {
    if (!this.ctx || !this.sfxGain) return;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start();
  }

  // --- 8-BIT CHIPTUNE MUSIC GENERATOR ---
  public playBgm(theme: 'TITLE' | 'USA' | 'ITALY' | 'JAPAN' | 'FRANCE') {
    this.initContext();
    if (this.currentTrackTheme === theme && this.bgmPlaying) return;
    this.stopBgm();

    this.currentTrackTheme = theme;
    this.bgmPlaying = true;

    // Define chiptune melodies for each track
    // Notes in Hz: [Freq, duration in 16th notes]
    const tracks: Record<string, { tempo: number; bass: number[]; melody: number[] }> = {
      TITLE: {
        tempo: 135,
        bass: [110, 110, 130.8, 110, 146.8, 130.8, 110, 98],
        melody: [220, 261.6, 293.7, 329.6, 392, 329.6, 293.7, 261.6],
      },
      USA: {
        tempo: 145, // Heavy rock/blues desert run
        bass: [82.4, 82.4, 98, 82.4, 110, 123.5, 98, 82.4],
        melody: [329.6, 329.6, 392, 440, 493.9, 440, 392, 329.6, 293.7, 329.6],
      },
      ITALY: {
        tempo: 140, // Fast energetic coastal synth
        bass: [130.8, 130.8, 164.8, 130.8, 174.6, 164.8, 196, 164.8],
        melody: [523.3, 659.3, 784, 659.3, 880, 784, 659.3, 587.3],
      },
      JAPAN: {
        tempo: 152, // Neo-Tokyo fast cyberpunk chiptune
        bass: [110, 110, 146.8, 110, 164.8, 110, 196, 164.8],
        melody: [440, 523.3, 587.3, 659.3, 784, 880, 784, 659.3],
      },
      FRANCE: {
        tempo: 138, // Euro-speed arcade
        bass: [98, 98, 123.5, 98, 130.8, 146.8, 123.5, 98],
        melody: [392, 493.9, 587.3, 493.9, 659.3, 587.3, 493.9, 440],
      },
    };

    const track = tracks[theme] || tracks.USA;
    let step = 0;
    const stepDuration = 60 / track.tempo / 4; // 16th note

    const scheduleLoop = () => {
      if (!this.bgmPlaying || !this.ctx || !this.bgmGain) return;

      const t = this.ctx.currentTime;
      // Bass line
      const bassFreq = track.bass[step % track.bass.length];
      if (bassFreq > 0 && !this.isMuted) {
        const bassOsc = this.ctx.createOscillator();
        const bassEnv = this.ctx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(bassFreq, t);

        bassEnv.gain.setValueAtTime(0.28, t);
        bassEnv.gain.exponentialRampToValueAtTime(0.01, t + stepDuration * 1.5);

        bassOsc.connect(bassEnv);
        bassEnv.connect(this.bgmGain);

        bassOsc.start(t);
        bassOsc.stop(t + stepDuration * 1.6);
      }

      // Melody line
      const melodyFreq = track.melody[step % track.melody.length];
      if (melodyFreq > 0 && !this.isMuted && step % 2 === 0) {
        const melOsc = this.ctx.createOscillator();
        const melEnv = this.ctx.createGain();
        melOsc.type = 'square';
        melOsc.frequency.setValueAtTime(melodyFreq, t);

        melEnv.gain.setValueAtTime(0.18, t);
        melEnv.gain.exponentialRampToValueAtTime(0.01, t + stepDuration * 1.8);

        melOsc.connect(melEnv);
        melEnv.connect(this.bgmGain);

        melOsc.start(t);
        melOsc.stop(t + stepDuration * 1.9);
      }

      // Noise snare / hi-hat
      if (!this.isMuted) {
        if (step % 4 === 2) {
          // Snare
          this.playNoise(0.07, 0.12, 1200, 'bandpass');
        } else if (step % 2 === 0) {
          // Hi-hat
          this.playNoise(0.02, 0.05, 4000, 'highpass');
        }
      }

      step++;
      this.bgmTimer = window.setTimeout(scheduleLoop, stepDuration * 1000);
    };

    scheduleLoop();
  }

  public stopBgm() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      window.clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const audio = new RetroAudioEngine();
