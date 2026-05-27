// scenes/settingsScene.js
class SettingsScene extends Phaser.Scene {
  constructor() { super('SettingsScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    window.UIFactory.addBackground(this, 'asset/background/3.jpg');
    window.UIFactory.addBackButton(this, () => window.showHomeScreen());

    this.add.text(960, 240, 'Settings', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '86px',
      color:      '#000000',
    }).setOrigin(0.5);

    this.add.text(960, 360, 'Music Volume', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '44px',
      color:      '#000000',
    }).setOrigin(0.5);

    const trackW   = 720;
    const trackH   = 18;
    const trackX   = 960;
    const trackY   = 460;
    const leftX    = trackX - trackW / 2;
    const rightX   = trackX + trackW / 2;
    const radius   = trackH / 2;
    const trackG   = this.add.graphics();
    const fillG    = this.add.graphics();
    const glossG   = this.add.graphics();
    const knobGlow = this.add.circle(leftX, trackY + 2, 20, 0x000000, 0.25);
    const knob     = this.add.circle(leftX, trackY, 18, 0xf7f7f7).setStrokeStyle(3, 0x1b1f26);

    const valueText = this.add.text(trackX, trackY + 52, '100%', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '34px',
      color:      '#000000',
    }).setOrigin(0.5);

    const drawTrack = () => {
      trackG.clear();
      trackG.fillStyle(0x1f2a33, 1);
      trackG.fillRoundedRect(leftX, trackY - trackH / 2, trackW, trackH, radius);
      trackG.lineStyle(2, 0x000000, 0.25);
      trackG.strokeRoundedRect(leftX, trackY - trackH / 2, trackW, trackH, radius);
    };

    const drawFill = (width) => {
      fillG.clear();
      glossG.clear();
      if (width <= 0) return;
      fillG.fillStyle(0x4fc3f7, 1);
      fillG.fillRoundedRect(leftX, trackY - trackH / 2, width, trackH, radius);
      const glossH = Math.max(2, Math.floor(trackH * 0.45));
      const glossW = Math.max(0, width - 4);
      if (glossW > 0) {
        glossG.fillStyle(0xffffff, 0.18);
        glossG.fillRoundedRect(leftX + 2, trackY - trackH / 2 + 2, glossW, glossH, radius);
      }
    };

    const clamp = (v) => Math.min(1, Math.max(0, v));
    const updateVolume = (v) => {
      const vol = clamp(v);
      const knobX = leftX + trackW * vol;
      knob.x = knobX;
      knobGlow.x = knobX;
      drawFill(trackW * vol);
      valueText.setText(`${Math.round(vol * 100)}%`);
      window.MusicManager?.setVolume?.(vol);
    };

    drawTrack();

    const initialVolume = clamp(
      window.MusicManager?.getVolume?.() ?? window.MusicManager?.sharedAudio?.volume ?? 0.5
    );
    updateVolume(initialVolume);

    const setFromPointer = (pointer) => {
      const vol = (pointer.x - leftX) / trackW;
      updateVolume(vol);
    };

    const trackHit = this.add.rectangle(trackX, trackY, trackW, 44, 0x000000, 0);
    trackHit.setInteractive({ useHandCursor: true }).on('pointerdown', setFromPointer);
    knob.setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(knob);
    this.input.on('drag', (_pointer, gameObject, dragX) => {
      if (gameObject !== knob) return;
      const clampedX = Phaser.Math.Clamp(dragX, leftX, rightX);
      updateVolume((clampedX - leftX) / trackW);
    });

    const fullscreenRowY = 640;
    const fullscreenCenterX = 1000;
    const fullscreenGap = 300;
    const fullscreenLabelX = 800;
    const fullscreenToggleX = 1250;

    this.add.text(fullscreenLabelX, fullscreenRowY, 'Fullscreen', {
      fontFamily: 'Arial, sans-serif',
      fontSize:   '44px',
      color:      '#000000',
    }).setOrigin(1, 0.5);

    const toggleW   = 160;
    const toggleH   = 44;
    const toggleX   = fullscreenToggleX;
    const toggleY   = fullscreenRowY;
    const toggleL   = toggleX - toggleW / 2;
    const toggleR   = toggleX + toggleW / 2;
    const toggleRad = toggleH / 2;
    const toggleG   = this.add.graphics();
    const toggleKnob = this.add.circle(toggleL + toggleRad, toggleY, toggleRad - 4, 0xffffff)
      .setStrokeStyle(2, 0x1b1f26);

    const isFullscreen = () => {
      const d = document;
      return !!(d.fullscreenElement || d.mozFullScreenElement || d.webkitFullscreenElement || d.msFullscreenElement);
    };

    const renderToggle = (on) => {
      toggleG.clear();
      toggleG.fillStyle(on ? 0x2ecc71 : 0x8f98a1, 1);
      toggleG.fillRoundedRect(toggleL, toggleY - toggleH / 2, toggleW, toggleH, toggleRad);
      toggleG.lineStyle(2, 0x000000, 0.2);
      toggleG.strokeRoundedRect(toggleL, toggleY - toggleH / 2, toggleW, toggleH, toggleRad);
      toggleKnob.x = on ? (toggleR - toggleRad) : (toggleL + toggleRad);
    };

    let toggleOn = isFullscreen();
    renderToggle(toggleOn);

    const toggleHit = this.add.rectangle(toggleX, toggleY, toggleW + 24, toggleH + 18, 0x000000, 0);
    toggleHit.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      toggleOn = !toggleOn;
      renderToggle(toggleOn);
      if (toggleOn) {
        window.requestFullscreenAndLandscape?.();
      } else {
        window.exitFullscreen?.();
      }
    });

    const fsEvents = ['fullscreenchange','mozfullscreenchange','webkitfullscreenchange','msfullscreenchange'];
    const onFsChange = () => {
      toggleOn = isFullscreen();
      renderToggle(toggleOn);
    };
    fsEvents.forEach((evt) => document.addEventListener(evt, onFsChange));
    this.events.once('shutdown', () => {
      fsEvents.forEach((evt) => document.removeEventListener(evt, onFsChange));
    });
    this.events.once('destroy', () => {
      fsEvents.forEach((evt) => document.removeEventListener(evt, onFsChange));
    });
  }
}