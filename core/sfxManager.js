// core/sfxManager.js
// Simple sound-effect helper that plays files from asset/soundeffect.
// Uses HTML5 Audio so no Phaser preload is required. Implements the Singleton pattern.

class SfxManager {
  #volume = 0.2;
  #trimMs = 800;
  #muted = false;

  #active = new Set();
  #audioCache = {};

  #BASE_PATH = 'asset/soundeffect/';
  #VOLUME_KEY = 'bts_sfx_volume';

  static #instance = null;
  static getInstance() {
    if (!SfxManager.#instance) {
      SfxManager.#instance = new SfxManager();
    }
    return SfxManager.#instance;
  }

  constructor() {
    try {
      const stored = parseFloat(localStorage.getItem(this.#VOLUME_KEY));
      if (Number.isFinite(stored)) {
        this.#volume = Math.min(1, Math.max(0, stored));
      }
    } catch (e) { }

    // Share active set across hot-reloads if applicable
    if (window.__BTS_SFX_ACTIVE) {
      this.#active = window.__BTS_SFX_ACTIVE;
    } else {
      window.__BTS_SFX_ACTIVE = this.#active;
    }
  }

  #makeAudio(filename) {
    try {
      const path = this.#BASE_PATH + filename;
      let template = this.#audioCache[path];
      if (!template) {
        template = new Audio(path);
        template.preload = 'auto';
        this.#audioCache[path] = template;
      }
      const a = template.cloneNode(true);
      a.loop = false;
      a.volume = this.#volume;
      return a;
    } catch (e) {
      return null;
    }
  }

  #clampVolume(v) {
    return Math.min(1, Math.max(0, Number(v)));
  }

  getVolume() {
    return this.#volume;
  }

  setVolume(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return this.#volume;
    this.#volume = this.#clampVolume(n);
    try {
      localStorage.setItem(this.#VOLUME_KEY, String(this.#volume));
    } catch (e) { }
    return this.#volume;
  }

  getTrim() {
    return this.#trimMs;
  }

  setTrim(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n)) return this.#trimMs;
    this.#trimMs = Math.max(0, Math.floor(n));
    return this.#trimMs;
  }

  muteAll() {
    this.stopAll();
    this.#muted = true;
  }

  unmuteAll() {
    this.#muted = false;
  }

  stopAll() {
    for (const a of Array.from(this.#active)) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch (e) { }
      try {
        a.src = '';
      } catch (e) { }
      this.#active.delete(a);
    }
  }

  play(filename, opts) {
    if (!filename) return;
    if (this.#muted && !(opts && opts.force)) return;

    const key = filename.replace(/^.*[\\/]/, '');
    const a = this.#makeAudio(key);
    if (!a) return;

    const localTrim = (opts && Number.isFinite(opts.trimMs)) ? Math.max(0, Number(opts.trimMs)) : this.#trimMs;
    const localVolume = (opts && Number.isFinite(opts.volume)) ? this.#clampVolume(opts.volume) : this.#volume;
    a.volume = localVolume;

    let timer = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      try {
        a.src = '';
      } catch (e) { }
      this.#active.delete(a);
    };

    a.addEventListener('ended', cleanup, { once: true });
    this.#active.add(a);

    if (localTrim > 0) {
      timer = setTimeout(() => {
        try {
          a.pause();
          a.currentTime = 0;
        } catch (e) { }
        cleanup();
      }, localTrim);
    }

    a.currentTime = 0;
    a.play().catch(() => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    });
  }

  playExplosion() {
    this.play('mixkit-arcade-game-explosion-2759.wav', { trimMs: 200 });
  }

  playDrop() {
    this.play('soundreality-game-explosion-321700.mp3', { trimMs: 500 });
  }

  playComplete() {
    this.play('mixkit-game-level-completed-2059.wav', { volume: 1, force: true, trimMs: 0 });
  }

  playFail() {
    this.play('mixkit-player-losing-or-failing-2042.wav', { volume: 1, force: true, trimMs: 0 });
  }

  playCoin() {
    this.play('mixkit-casino-bling-achievement-2067.wav', { trimMs: 400 });
  }

  playDmgShield() {
    this.play('mixkit-dense-bomb-impact-2801.wav', { trimMs: 400 });
  }

  playSpawn() {
    this.play('mixkit-casino-bling-achievement-2067.wav', { trimMs: 300 });
  }

  playBounce() {
    this.play('mixkit-dense-bomb-impact-2801.wav', { trimMs: 150 });
  }
}

window.SfxManager = SfxManager.getInstance();