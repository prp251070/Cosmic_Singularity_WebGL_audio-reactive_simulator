import { AudioEngine } from './audio/audioEngine.js';
import { SceneManager } from './visuals/sceneManager.js';
import { VideoRecorder } from './recorder/videoRecorder.js';

// DOM Elements
const canvas = document.getElementById('webgl-canvas');
const hud = document.getElementById('hud');
const statusBadge = document.getElementById('status-badge');
const btnPlay = document.getElementById('btn-play');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const audioTitle = document.getElementById('audio-title');
const audioMode = document.getElementById('audio-mode');
const srcSynth = document.getElementById('src-synth');
const srcTab = document.getElementById('src-tab');
const srcUpload = document.getElementById('src-upload');
const srcMic = document.getElementById('src-mic');
const audioFileInput = document.getElementById('audio-file-input');

// VU Meters
const vuSub = document.getElementById('vu-sub-fill');
const vuBass = document.getElementById('vu-bass-fill');
const vuMid = document.getElementById('vu-mid-fill');
const vuTreble = document.getElementById('vu-treble-fill');
const waveformCanvas = document.getElementById('waveform-canvas');
const waveCtx = waveformCanvas.getContext('2d');

// Actions & Drawers
const btnScreenshot = document.getElementById('btn-screenshot');
const btnRecord = document.getElementById('btn-record');
const recordText = document.getElementById('record-text');
const btnDrawerToggle = document.getElementById('btn-drawer-toggle');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const sideDrawer = document.getElementById('side-drawer');

// Sliders
const paramMass = document.getElementById('param-mass');
const paramLensing = document.getElementById('param-lensing');
const paramDensity = document.getElementById('param-density');
const paramJet = document.getElementById('param-jet');
const paramBloom = document.getElementById('param-bloom');
const paramCa = document.getElementById('param-ca');

const valMass = document.getElementById('val-mass');
const valLensing = document.getElementById('val-lensing');
const valDensity = document.getElementById('val-density');
const valJet = document.getElementById('val-jet');
const valBloom = document.getElementById('val-bloom');
const valCa = document.getElementById('val-ca');

// Instances
const audioEngine = new AudioEngine();
const sceneManager = new SceneManager(canvas);
const recorder = new VideoRecorder(canvas, audioEngine);

// FPS Tracking
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 60;

// Initialize
function initApp() {
  setupEventListeners();
  setupSliders();
  setupPills();
  setupDragAndDrop();

  statusBadge.textContent = 'ONLINE // 60 FPS';

  // Start Animation Loop
  requestAnimationFrame(loop);
}

// Main Render Loop
function loop(timestamp) {
  requestAnimationFrame(loop);

  // 1. Audio Analysis
  const audioBands = audioEngine.update();

  // 2. Render Scene with General Relativity Shaders
  sceneManager.render(audioBands);

  // 3. Update HUD VU Meters
  vuSub.style.height = `${Math.min(100, Math.round(audioBands.subBass * 110))}%`;
  vuBass.style.height = `${Math.min(100, Math.round(audioBands.bass * 110))}%`;
  vuMid.style.height = `${Math.min(100, Math.round(audioBands.mids * 105))}%`;
  vuTreble.style.height = `${Math.min(100, Math.round(audioBands.treble * 120))}%`;

  // 4. Draw Mini Waveform Oscilloscope
  drawWaveform();

  // 5. Calculate FPS
  frameCount++;
  if (timestamp - lastFpsUpdate >= 1000) {
    currentFps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = timestamp;
    statusBadge.textContent = `ONLINE // ${currentFps} FPS`;
  }
}

// Waveform visualizer drawing
function drawWaveform() {
  const w = waveformCanvas.width;
  const h = waveformCanvas.height;
  waveCtx.clearRect(0, 0, w, h);

  if (!audioEngine.isPlaying) {
    waveCtx.beginPath();
    waveCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    waveCtx.lineWidth = 1;
    waveCtx.moveTo(0, h / 2);
    waveCtx.lineTo(w, h / 2);
    waveCtx.stroke();
    return;
  }

  const timeData = audioEngine.timeDomainData;
  const sliceWidth = w / (timeData.length * 0.5);

  waveCtx.beginPath();
  waveCtx.strokeStyle = '#00f0ff';
  waveCtx.lineWidth = 1.5;

  let x = 0;
  for (let i = 0; i < timeData.length * 0.5; i++) {
    const v = timeData[i] / 128.0;
    const y = (v * h) / 2;

    if (i === 0) {
      waveCtx.moveTo(x, y);
    } else {
      waveCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  waveCtx.stroke();
}

// Setup Event Listeners
function setupEventListeners() {
  // Audio state change updates
  audioEngine.onStateChange(({ isPlaying, mode, trackName }) => {
    if (isPlaying) {
      iconPlay.style.display = 'none';
      iconPause.style.display = 'block';
    } else {
      iconPlay.style.display = 'block';
      iconPause.style.display = 'none';
    }

    if (trackName) audioTitle.textContent = trackName;

    if (mode === 'synth') audioMode.textContent = 'Procedural Synthesis';
    else if (mode === 'file') audioMode.textContent = 'Custom Audio File';
    else if (mode === 'mic') audioMode.textContent = 'Live Microphone';
    else if (mode === 'tab') audioMode.textContent = 'Spotify / YT / Tab';

    // Source buttons active states
    srcSynth.classList.toggle('active', mode === 'synth');
    srcTab.classList.toggle('active', mode === 'tab');
    srcUpload.classList.toggle('active', mode === 'file');
    srcMic.classList.toggle('active', mode === 'mic');
  });

  // Play/Pause button
  btnPlay.addEventListener('click', () => {
    audioEngine.togglePlayPause();
  });

  // Synth Source
  srcSynth.addEventListener('click', () => {
    audioEngine.startProceduralSynth();
  });

  // Spotify / YouTube / Tab Audio Source
  srcTab.addEventListener('click', () => {
    audioEngine.startTabAudio();
  });

  // Upload Source
  srcUpload.addEventListener('click', () => {
    audioFileInput.click();
  });

  audioFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      audioEngine.loadAudioFile(e.target.files[0]);
    }
  });

  // Microphone Source
  srcMic.addEventListener('click', () => {
    audioEngine.startMicrophone();
  });

  // Screenshot Action
  btnScreenshot.addEventListener('click', () => {
    recorder.captureScreenshot();
  });

  // Video Recording Action
  btnRecord.addEventListener('click', () => {
    if (!recorder.isRecording) {
      recorder.startRecording((timeStr) => {
        recordText.textContent = `REC ${timeStr}`;
      });
      btnRecord.classList.add('recording');
    } else {
      recorder.stopRecording();
      btnRecord.classList.remove('recording');
      recordText.textContent = 'Rec Clip';
    }
  });

  // Drawer Toggle
  const toggleDrawer = () => {
    sideDrawer.classList.toggle('drawer-closed');
  };
  btnDrawerToggle.addEventListener('click', toggleDrawer);
  btnCloseDrawer.addEventListener('click', toggleDrawer);

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Prevent interfering with input elements if any
    if (e.target.tagName === 'INPUT') return;

    if (e.code === 'Space') {
      e.preventDefault();
      audioEngine.togglePlayPause();
    } else if (e.code === 'KeyR') {
      btnRecord.click();
    } else if (e.code === 'KeyS') {
      recorder.captureScreenshot();
    } else if (e.code === 'KeyH') {
      hud.classList.toggle('hud-hidden');
    } else if (e.code === 'KeyF') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    } else if (e.code === 'Digit1') {
      selectTheme(0);
    } else if (e.code === 'Digit2') {
      selectTheme(1);
    } else if (e.code === 'Digit3') {
      selectTheme(2);
    } else if (e.code === 'Digit4') {
      selectTheme(3);
    }
  });
}

// Setup Sliders with Real-Time Updates
function setupSliders() {
  const bindSlider = (slider, readout, paramName, formatDecimals = 2) => {
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      readout.textContent = val.toFixed(formatDecimals);
      sceneManager.setParam(paramName, val);
    });
  };

  bindSlider(paramMass, valMass, 'blackHoleMass');
  bindSlider(paramLensing, valLensing, 'lensingStrength');
  bindSlider(paramDensity, valDensity, 'diskDensity');
  bindSlider(paramJet, valJet, 'jetIntensity');
  bindSlider(paramBloom, valBloom, 'bloomIntensity');
  bindSlider(paramCa, valCa, 'chromaticAberration');
}

function selectTheme(themeIndex) {
  sceneManager.setColorTheme(themeIndex);
  document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.theme) === themeIndex);
  });
}

// Setup Preset Pill Buttons
function setupPills() {
  // Theme Presets
  document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectTheme(parseInt(btn.dataset.theme));
    });
  });

  // Camera Presets
  document.querySelectorAll('[data-cam]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-cam]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sceneManager.setCameraPreset(btn.dataset.cam);
    });
  });

  // Quality Presets
  document.querySelectorAll('[data-quality]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-quality]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sceneManager.setQuality(parseFloat(btn.dataset.quality));
    });
  });
}

// File Drag & Drop anywhere on screen
function setupDragAndDrop() {
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a)$/i.test(file.name)) {
        audioEngine.loadAudioFile(file);
      }
    }
  });
}

// Initialize on DOM Ready
window.addEventListener('DOMContentLoaded', initApp);
