# 🌌 COSMIC SINGULARITY
### General Relativity & Audio-Reactive Black Hole Simulator

An interactive, GPU-accelerated **General Relativistic Black Hole and Volumetric Accretion Disk Simulator** built with **WebGL, Three.js, and the Web Audio API**.

---

## 🌟 Core Features

- **Relativistic Gravitational Lensing (Einstein Deflection)**:
  - Numerical geodesic raymarching that simulates the bending of light around a Schwarzschild black hole.
  - Authentic double-ring gravitational lensing halo (Interstellar *Gargantua* effect).
  - Razor-sharp event horizon shadow and luminous photon ring ($r = 1.5 R_s$).

- **Volumetric Accretion Disk & Fluid Turbulence**:
  - Swirling Keplerian differential rotation ($v \propto r^{-1.5}$).
  - 3D Simplex & Curl Noise generating dynamic plasma spiral arms, solar flares, and coronal mass ejections.
  - **Relativistic Doppler Beaming**: Light emitted by gas rotating toward the observer is boosted and blue-shifted, while receding gas is dimmed and red-shifted.

- **Twin Relativistic Polar Plasma Jets**:
  - Dual collimated relativistic jets erupting perpendicularly from the singularity's poles.
  - Helical twisting magnetic confinement and periodic standing shock diamonds.

- **Multi-Band Audio Engine**:
  - **Sub-Bass (20–60 Hz)**: Drives gravitational wave shockwaves, camera micro-shake, and spacetime distortion.
  - **Bass (60–250 Hz)**: Expands core mass, pulses the photon sphere bloom, and modulates accretion radius.
  - **Mids (250–2000 Hz)**: Drives accretion swirl velocity and Doppler temperature shifting.
  - **Treble (2–8 kHz)**: Triggers violent solar flare eruptions, lightning sparks, and relativistic jet ejections.

- **Multiple Audio Sources (4 Input Channels)**:
  1. **🎧 Direct Spotify & YouTube Music (Tab Audio)**: Stream uncompressed audio directly from your Spotify web player, YouTube Music, or any desktop music app via native tab audio capture.
  2. **🎵 Built-in Procedural Ambient Space Synthesizer**: Deep sub-bass drones, Hans Zimmer-style chord progressions, and cosmic chimes generated in real time using the Web Audio API.
  3. **📁 File Upload & Drag-and-Drop**: Load any local `.mp3`, `.wav`, `.flac`, or `.ogg` audio track.
  4. **🎙️ Live Microphone**: React in real time to external speech or room music.

- **WebM Video & Screenshot Capture**:
  - Built-in `MediaRecorder` pipeline capturing 60 FPS canvas video synchronized with the Web Audio stream.
  - High-res PNG screenshot capture with shutter animation.

- **Cinematic Sci-Fi HUD**:
  - 4 Spectral Themes: *Gargantua Gold*, *Quantum Cyan*, *Supernova Crimson*, *Void Phantom*.
  - 4 Camera Presets: *Equatorial Horizon*, *Polar Jet*, *Event Horizon*, *Deep Space*.
  - Real-time frequency VU meters and mini oscilloscope waveform.

---

## 🎮 Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Space` | Toggle Audio Playback (Play/Pause) |
| `R` | Start / Stop WebM Video Recording |
| `S` | Capture High-Res Screenshot |
| `H` | Hide / Show HUD (Cinematic View) |
| `F` | Toggle Fullscreen |
| `1` - `4` | Switch Spectral Color Themes |
| `Left Click + Drag` | 3D Orbit Camera |
| `Scroll Wheel` | Zoom Camera In / Out |

---

## 🚀 Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5173/` in your browser.
