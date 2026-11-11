/**
 * Self-contained Web Audio synthesizer for tactile UI feedback
 */

class SoundEngineClass {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private masterGain: number = 0.25;

  private getContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      return this.ctx;
    } catch {
      return null;
    }
  }

  public unlock() {
    const c = this.getContext();
    if (!c) return;
    if (c.state === 'suspended') {
      c.resume().catch(() => {});
    }
  }

  private playTone({
    freq = 440,
    dur = 0.12,
    type = 'sine' as OscillatorType,
    vol = 0.4,
    delay = 0,
    glide = null as number | null,
  }) {
    if (!this.enabled) return;
    const c = this.getContext();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t0 + dur);
    }

    const peak = vol * this.masterGain;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  public play(
    name:
      | 'tick'
      | 'pop'
      | 'success'
      | 'alert'
      | 'whoosh'
      | 'thud'
      | 'welcome'
      | 'print'
      | 'export'
      | 'error'
      | 'ai'
  ) {
    if (!this.enabled) return;
    this.unlock();

    switch (name) {
      case 'tick':
        this.playTone({ freq: 880, dur: 0.04, type: 'triangle', vol: 0.2 });
        break;
      case 'pop':
        this.playTone({ freq: 1100, dur: 0.06, type: 'sine', vol: 0.3, glide: 1500 });
        break;
      case 'success':
        this.playTone({ freq: 587, dur: 0.1, type: 'sine', vol: 0.3 });
        this.playTone({ freq: 880, dur: 0.18, type: 'sine', vol: 0.35, delay: 0.08 });
        break;
      case 'welcome':
        this.playTone({ freq: 523, dur: 0.09, type: 'sine', vol: 0.3 });
        this.playTone({ freq: 659, dur: 0.09, type: 'sine', vol: 0.3, delay: 0.08 });
        this.playTone({ freq: 784, dur: 0.16, type: 'sine', vol: 0.35, delay: 0.16 });
        break;
      case 'print':
        this.playTone({ freq: 700, dur: 0.06, type: 'triangle', vol: 0.25 });
        break;
      case 'export':
        this.playTone({ freq: 659, dur: 0.08, type: 'sine', vol: 0.3 });
        this.playTone({ freq: 880, dur: 0.12, type: 'sine', vol: 0.35, delay: 0.06 });
        this.playTone({ freq: 1046, dur: 0.15, type: 'sine', vol: 0.3, delay: 0.12 });
        break;
      case 'ai':
        this.playTone({ freq: 440, dur: 0.08, type: 'sine', vol: 0.25, glide: 880 });
        this.playTone({ freq: 880, dur: 0.12, type: 'sine', vol: 0.25, delay: 0.08, glide: 1320 });
        break;
      case 'error':
        this.playTone({ freq: 220, dur: 0.12, type: 'sawtooth', vol: 0.2 });
        this.playTone({ freq: 165, dur: 0.18, type: 'sawtooth', vol: 0.25, delay: 0.1 });
        break;
      case 'alert':
        this.playTone({ freq: 330, dur: 0.15, type: 'square', vol: 0.15 });
        this.playTone({ freq: 247, dur: 0.22, type: 'square', vol: 0.15, delay: 0.12 });
        break;
      case 'whoosh':
        this.playTone({ freq: 250, dur: 0.12, type: 'sine', vol: 0.2, glide: 750 });
        break;
      case 'thud':
        this.playTone({ freq: 180, dur: 0.15, type: 'sine', vol: 0.3, glide: 80 });
        break;
    }
  }


  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (this.enabled) this.play('tick');
    return this.enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
  }
}

export const SoundEngine = new SoundEngineClass();
