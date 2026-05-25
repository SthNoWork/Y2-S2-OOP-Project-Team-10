// core/sfxManager.js
// Simple sound-effect helper that plays files from asset/soundeffect.
// Uses HTML5 Audio so no Phaser preload is required.

window.SfxManager = (() => {
  const basePath = 'asset/soundeffect/';
  const volumeKey = 'bts_sfx_volume';
  let volume = 0.2;
  try { const stored = parseFloat(localStorage.getItem(volumeKey)); if (Number.isFinite(stored)) volume = Math.min(1, Math.max(0, stored)); } catch (e) { }
  // Trim SFX to this maximum duration (ms). 0 = no trim.
  let trimMs = 800;
  let muted = false;
  const _active = window.__BTS_SFX_ACTIVE || new Set();
  window.__BTS_SFX_ACTIVE = _active;

  function _makeAudio(filename) {
    try {
      const a = new Audio(basePath + filename);
      a.preload = 'auto';
      a.loop = false;
      a.volume = volume;
      return a;
    } catch (e) { return null; }
  }

  return {
    // Get/Set global SFX volume (0..1). Persists to localStorage.
    getVolume() { return volume; },
    setVolume(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return volume;
      volume = Math.min(1, Math.max(0, n));
      try { localStorage.setItem(volumeKey, String(volume)); } catch (e) { }
      return volume;
    },

    // Get/Set global trim length for one-shot SFX (milliseconds).
    getTrim() { return trimMs; },
    setTrim(ms) { const n = Number(ms); if (!Number.isFinite(n)) return trimMs; trimMs = Math.max(0, Math.floor(n)); return trimMs; },

    stopAll() {
      for (const a of Array.from(_active)) {
        try { a.pause(); a.currentTime = 0; } catch (e) { }
        try { a.src = ''; } catch (e) { }
        _active.delete(a);
      }
    },

    muteAll() {
      this.stopAll();
      muted = true;
    },

    unmuteAll() {
      muted = false;
    },

    // Play a one-shot SFX by filename. Creates a fresh Audio instance so
    // multiple overlapping plays are possible and playback stops when the
    // source ends.
    play(filename, opts) {
      if (!filename) return;
      if (muted && !(opts && opts.force)) return;
      const key = filename.replace(/^.*[\\/]/, '');
      const a = _makeAudio(key);
      if (!a) return;

      const localTrim = opts && Number.isFinite(opts.trimMs) ? Math.max(0, Number(opts.trimMs)) : trimMs;
      const localVolume = opts && Number.isFinite(opts.volume) ? Math.min(1, Math.max(0, Number(opts.volume))) : volume;
      a.volume = localVolume;

      let timer = null;
      const cleanup = () => {
        if (timer) { clearTimeout(timer); timer = null; }
        try { a.src = ''; } catch (e) { }
        _active.delete(a);
      };

      a.addEventListener('ended', cleanup, { once: true });
      _active.add(a);

      if (localTrim > 0) {
        timer = setTimeout(() => {
          try { a.pause(); a.currentTime = 0; } catch (e) { }
          cleanup();
        }, localTrim);
      }

      a.currentTime = 0;
      a.play().catch(() => { if (timer) { clearTimeout(timer); timer = null; } });
    },

    playExplosion() { this.play('mixkit-arcade-game-explosion-2759.wav', { trimMs: 200 }); },
    playDrop() { this.play('soundreality-game-explosion-321700.mp3', { trimMs: 500 }); },
    playComplete() { this.play('mixkit-game-level-completed-2059.wav', { volume: 1, force: true, trimMs: 0 }); },
    playFail() { this.play('mixkit-player-losing-or-failing-2042.wav', { volume: 1, force: true, trimMs: 0 }); },
  };
})();
