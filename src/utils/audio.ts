/**
 * Web Audio API Sound Generator for Ink Martial Stickman
 * Authentic synthesized martial arts, ink brush, and pentatonic chimes
 * v2: Master gain bus + volume control + telegraph/heartbeat/boss/victory SFX
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private bgmBus: GainNode | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8; // 0..1 user volume
  private bgmInterval: number | null = null;
  private heartbeatTimer: number | null = null;
  private pentatonicScale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]; // C, D, E, G, A pentatonic

  // 共享白噪声缓冲池：滑砍/挥剑每次调用都新建 AudioBuffer + 逐样本随机填充
  // （高频调用下 CPU + GC 双重压力，移动端滑动时明显卡顿）→ 预生成循环复用
  private noisePool: AudioBuffer[] = [];
  private static readonly NOISE_POOL_SIZE = 4;
  private static readonly NOISE_BUF_SEC = 0.5;

  /** 从池中取一段白噪声（AudioBuffer 不可变，可被多个 Source 同时安全播放） */
  private getNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (this.noisePool.length === 0) {
      const len = Math.floor(this.ctx.sampleRate * SoundEngine.NOISE_BUF_SEC);
      for (let i = 0; i < SoundEngine.NOISE_POOL_SIZE; i++) {
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let j = 0; j < len; j++) {
          data[j] = Math.random() * 2 - 1;
        }
        this.noisePool.push(buf);
      }
    }
    return this.noisePool[(Math.random() * this.noisePool.length) | 0];
  }

  private initCtx(): boolean {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();

      // Master bus → destination
      this.master = this.ctx.createGain();
      this.master.gain.value = this.isMuted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);

      // Sub-buses for mixing
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 1.0;
      this.sfxBus.connect(this.master);

      this.bgmBus = this.ctx.createGain();
      this.bgmBus.gain.value = 0.6;
      this.bgmBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => undefined);
    }
    return true;
  }

  /** Ensure audio is ready after a user gesture (browser autoplay policy) */
  public unlock() {
    this.initCtx();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.03);
    }
    if (muted) this.stopHeartbeat();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /** volume 0..100 (from UI slider) */
  public setVolume(percent: number) {
    this.volume = Math.max(0, Math.min(1, percent / 100));
    if (this.master && this.ctx && !this.isMuted) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
    }
  }

  public getVolume(): number {
    return this.volume * 100;
  }

  /** Route a node into the SFX bus */
  private out(bus: 'sfx' | 'bgm'): AudioNode | null {
    if (!this.initCtx()) return null;
    return bus === 'bgm' ? this.bgmBus : this.sfxBus;
  }

  /**
   * Sound of brush touching parchment or sweeping
   */
  public playBrushDraw() {
    const dest = this.out('sfx');
    if (!dest || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const buffer = this.getNoiseBuffer();
      if (!buffer) return;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800 + Math.random() * 400, now);
      filter.Q.setValueAtTime(3, now);

      const gain = this.ctx.createGain();
      // 原 0.15 振幅 × 0.08 增益 ≈ 0.012（改用满振幅共享噪声，振幅并入增益保持响度一致）
      gain.gain.setValueAtTime(0.012, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      noise.start(now);
      noise.stop(now + 0.09);
    } catch {
      // Audio fallback silent
    }
  }

  /**
   * Sharp ink blade slash (挥剑/破风)
   */
  public playSlash(type: 'light' | 'heavy' | 'whirlwind' = 'light') {
    const dest = this.out('sfx');
    if (!dest || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      const duration = type === 'heavy' ? 0.28 : type === 'whirlwind' ? 0.45 : 0.16;
      const startFreq = type === 'heavy' ? 420 : 680;
      const endFreq = type === 'heavy' ? 80 : 160;

      osc.type = type === 'heavy' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(400, now + duration);

      gain.gain.setValueAtTime(type === 'heavy' ? 0.3 : 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + duration);

      // Add swoosh noise（共享噪声池，免高频分配）
      const buffer = this.getNoiseBuffer();
      if (buffer) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        // 原 0.15 振幅 × 0.12 增益 ≈ 0.018
        noiseGain.gain.setValueAtTime(0.018, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(noiseGain);
        noiseGain.connect(dest);
        noise.start(now);
        noise.stop(now + duration + 0.02);
      }
    } catch {
      // Audio fallback
    }
  }

  /**
   * Visceral hit impact / Heavy blow
   */
  public playHit(isCrit: boolean = false) {
    const dest = this.out('sfx');
    if (!dest || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Punchy sub-bass transient
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isCrit ? 180 : 130, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.15);

      gain.gain.setValueAtTime(isCrit ? 0.5 : 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.18);

      // High click for crisp impact definition
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(isCrit ? 1200 : 850, now);
      clickOsc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
      clickGain.gain.setValueAtTime(0.25, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      clickOsc.connect(clickGain);
      clickGain.connect(dest);
      clickOsc.start(now);
      clickOsc.stop(now + 0.04);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Traditional Chinese bell / gong resonance when Calligraphy Gesture triggers!
   */
  public playCalligraphyGong(gestureName: string = '') {
    const dest = this.out('sfx');
    if (!dest || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Select harmonic pitch from pentatonic
      const baseFreq = gestureName.includes('太极') ? 261.63 : gestureName.includes('劈') ? 196.00 : 392.00;

      // Primary tone
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, now);

      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gain1);
      gain1.connect(dest);
      osc1.start(now);
      osc1.stop(now + 1.2);

      // Overtones (Guzheng / Bronze chime harmonics)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 2.76, now);
      gain2.gain.setValueAtTime(0.12, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc2.connect(gain2);
      gain2.connect(dest);
      osc2.start(now);
      osc2.stop(now + 0.8);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Jump sound (light wind)
   */
  public playJump() {
    const dest = this.out('sfx');
    if (!dest || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Dash / Phantom step
   */
  public playDash() {
    const dest = this.out('sfx');
    if (!dest || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Enemy attack windup warning (短促蓄力低鸣 — 提示玩家闪避)
   */
  public playWindup() {
    const dest = this.out('sfx');
    if (!dest || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(240, now + 0.22);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch {
      // fallback
    }
  }

  /**
   * Boss spawn warning — low horn + drum thump
   */
  public playBossWarn() {
    const dest = this.out('sfx');
    if (!dest || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Menacing low horn
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, now);
      osc.frequency.linearRampToValueAtTime(52, now + 0.9);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.34, now + 0.08);
      gain.gain.setValueAtTime(0.34, now + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 1.2);

      // War drum double thump
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.32;
        const drum = this.ctx.createOscillator();
        const dg = this.ctx.createGain();
        drum.type = 'sine';
        drum.frequency.setValueAtTime(90, t);
        drum.frequency.exponentialRampToValueAtTime(38, t + 0.18);
        dg.gain.setValueAtTime(0.5, t);
        dg.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        drum.connect(dg);
        dg.connect(dest);
        drum.start(t);
        drum.stop(t + 0.2);
      }
    } catch {
      // fallback
    }
  }

  /**
   * Wave cleared — bright chime arpeggio (磬声三叠)
   */
  public playWaveClear() {
    const dest = this.out('sfx');
    if (!dest || !this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
      notes.forEach((freq, i) => {
        const t = this.ctx!.currentTime + i * 0.14;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
        osc.connect(gain);
        gain.connect(dest!);
        osc.start(t);
        osc.stop(t + 0.9);
      });
    } catch {
      // fallback
    }
  }

  /**
   * Affix picked — page flip + soft bell
   */
  public playAffixPick() {
    const dest = this.out('sfx');
    if (!dest || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // paper swish
      const bufferSize = this.ctx.sampleRate * 0.18;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.1 * (1 - i / bufferSize);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1200;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.16, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      noise.connect(hp);
      hp.connect(ng);
      ng.connect(dest);
      noise.start(now);

      // soft bell
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now + 0.1);
      g.gain.setValueAtTime(0.14, now + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(g);
      g.connect(dest);
      osc.start(now + 0.1);
      osc.stop(now + 0.7);
    } catch {
      // fallback
    }
  }

  /**
   * Victory fanfare — pentatonic guzheng glissando
   */
  public playVictory() {
    const dest = this.out('sfx');
    if (!dest || !this.ctx) return;

    try {
      const run = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
      run.forEach((freq, i) => {
        const t = this.ctx!.currentTime + i * 0.12;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
        osc.connect(gain);
        gain.connect(dest!);
        osc.start(t);
        osc.stop(t + 1.4);
      });
      // Final sustained chord
      const t = this.ctx.currentTime + run.length * 0.12 + 0.1;
      [523.25, 659.25, 783.99].forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
        osc.connect(gain);
        gain.connect(dest!);
        osc.start(t);
        osc.stop(t + 2.2);
      });
    } catch {
      // fallback
    }
  }

  /**
   * Player hurt — dull thud + short grunt-like filtered noise
   */
  public playPlayerHurt() {
    const dest = this.out('sfx');
    if (!dest || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.2);
      gain.gain.setValueAtTime(0.42, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // fallback
    }
  }

  /**
   * Low HP heartbeat loop — start when hp critical, stop on safe/death
   */
  public startHeartbeat() {
    if (this.heartbeatTimer !== null) return;
    if (!this.initCtx()) return;

    const beat = () => {
      if (!this.ctx || this.isMuted) return;
      const dest = this.bgmBus;
      if (!dest) return;
      const now = this.ctx.currentTime;
      // lub-dub
      [0, 0.18].forEach((off, i) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(i === 0 ? 62 : 55, now + off);
        osc.frequency.exponentialRampToValueAtTime(30, now + off + 0.12);
        g.gain.setValueAtTime(i === 0 ? 0.5 : 0.36, now + off);
        g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.14);
        osc.connect(g);
        g.connect(dest);
        osc.start(now + off);
        osc.stop(now + off + 0.14);
      });
    };

    beat();
    this.heartbeatTimer = window.setInterval(beat, 950);
  }

  public stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Shield break — glassy crack
   */
  public playShieldBreak() {
    const dest = this.out('sfx');
    if (!dest || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [1400, 1900, 2600].forEach((f, i) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.03);
        g.gain.setValueAtTime(0.16, now + i * 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.2);
        osc.connect(g);
        g.connect(dest);
        osc.start(now + i * 0.03);
        osc.stop(now + i * 0.03 + 0.2);
      });
    } catch {
      // fallback
    }
  }

  /**
   * Ambient Guqin / Guzheng background loop
   */
  public startAmbientBgm() {
    if (this.bgmInterval) return; // 已在运行
    if (!this.initCtx()) return;

    const playRandomPluck = () => {
      if (this.isMuted || !this.ctx) return;
      const dest = this.bgmBus;
      if (!dest) return;
      try {
        const note = this.pentatonicScale[Math.floor(Math.random() * this.pentatonicScale.length)];
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note, now);

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 2.5);
      } catch {
        // Safe
      }
    };

    // Strum every 2.5 - 4.5 seconds（静音时仅空转不发声，解除静音后自动恢复）
    this.bgmInterval = window.setInterval(() => {
      if (Math.random() > 0.3) {
        playRandomPluck();
      }
    }, 2800);
  }

  /** 停止 BGM 循环（暂停/返回标题时调用，防后台空转耗电） */
  public stopAmbientBgm() {
    if (this.bgmInterval !== null) {
      window.clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const sound = new SoundEngine();
