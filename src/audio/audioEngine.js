/**
 * Web Audio Engine for Cosmic Singularity
 * - Manages Web Audio Context and AnalyserNode
 * - Provides multi-band FFT extraction (subBass, bass, mids, treble, energy)
 * - Built-in procedural ambient space synthesizer (no external audio file required to hear it immediately!)
 * - File upload & drag-and-drop support (MP3, WAV, FLAC, OGG)
 * - Live microphone input support
 * - MediaStreamAudioDestinationNode for synchronized WebM video recording
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.audioSourceNode = null;
    this.audioElement = null;
    this.micStream = null;
    this.mediaDest = null;
    this.isInitialized = false;
    this.isPlaying = false;
    this.currentMode = 'synth'; // 'synth', 'file', 'mic'

    // FFT Data
    this.fftSize = 1024;
    this.frequencyData = new Uint8Array(this.fftSize / 2);
    this.timeDomainData = new Uint8Array(this.fftSize / 2);

    // Filtered frequency bands (normalized 0.0 - 1.0)
    this.bands = {
      subBass: 0,
      bass: 0,
      mids: 0,
      treble: 0,
      energy: 0,
      rawBands: [0, 0, 0, 0]
    };

    // Smoothed values for buttery shader interpolation
    this.smoothedBands = {
      subBass: 0,
      bass: 0,
      mids: 0,
      treble: 0,
      energy: 0
    };

    // Procedural Synthesizer nodes
    this.synthInterval = null;
    this.synthMasterGain = null;
    this.synthOscs = [];
    this.synthFilter = null;
    this.tempo = 65; // Slow, majestic space tempo

    // Listeners for UI updates
    this.onStateChangeCallbacks = [];
  }

  init() {
    if (this.isInitialized) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.82;

    this.mediaDest = this.ctx.createMediaStreamDestination();

    // Master volume node for audible internal sources (Synth, uploaded MP3)
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.85;

    // Route internal sources to speakers, visualizer analyser, and WebM recorder
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.connect(this.analyser);
    this.masterGain.connect(this.mediaDest);

    // CRITICAL: this.analyser is intentionally NOT connected to this.ctx.destination.
    // This allows external sources (Spotify, YouTube tab, microphone) to feed the visualizer
    // without playing back through the speakers and causing an echo.
    this.isInitialized = true;
  }

  async resumeContext() {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  getAudioStream() {
    if (!this.mediaDest) this.init();
    return this.mediaDest.stream;
  }

  setVolume(val) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime, 0.05);
    }
  }

  /* ----------------------------------------------------
   * 1. PROCEDURAL SPACE SYNTHESIZER
   * Deep cosmic drones, evolving sub-bass, and stellar chimes
   * ---------------------------------------------------- */
  startProceduralSynth() {
    this.stopCurrent();
    this.resumeContext();
    this.currentMode = 'synth';
    this.isPlaying = true;

    // Synth gain node
    this.synthMasterGain = this.ctx.createGain();
    this.synthMasterGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    this.synthMasterGain.gain.exponentialRampToValueAtTime(0.7, this.ctx.currentTime + 2.0);
    this.synthMasterGain.connect(this.masterGain);

    // Warm Lowpass Filter with gentle resonance
    this.synthFilter = this.ctx.createBiquadFilter();
    this.synthFilter.type = 'lowpass';
    this.synthFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.synthFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);
    this.synthFilter.connect(this.synthMasterGain);

    // 1. Deep Sub-Bass Drone (32Hz & 48Hz - Event Horizon Rumble)
    const subOsc1 = this.ctx.createOscillator();
    subOsc1.type = 'sine';
    subOsc1.frequency.setValueAtTime(36.7, this.ctx.currentTime); // D1
    const subGain1 = this.ctx.createGain();
    subGain1.gain.value = 0.65;
    subOsc1.connect(subGain1);
    subGain1.connect(this.synthFilter);
    subOsc1.start();
    this.synthOscs.push(subOsc1);

    const subOsc2 = this.ctx.createOscillator();
    subOsc2.type = 'triangle';
    subOsc2.frequency.setValueAtTime(55.0, this.ctx.currentTime); // A1
    const subGain2 = this.ctx.createGain();
    subGain2.gain.value = 0.35;
    subOsc2.connect(subGain2);
    subGain2.connect(this.synthFilter);
    subOsc2.start();
    this.synthOscs.push(subOsc2);

    // 2. Modulated Evolving Pad (Cosmic Wind)
    const padOsc = this.ctx.createOscillator();
    padOsc.type = 'sawtooth';
    padOsc.frequency.setValueAtTime(110.0, this.ctx.currentTime); // A2
    const padGain = this.ctx.createGain();
    padGain.gain.value = 0.2;
    padOsc.connect(padGain);
    padGain.connect(this.synthFilter);
    padOsc.start();
    this.synthOscs.push(padOsc);

    // LFO for filter sweep
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime); // 8-second slow cycle
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(320, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.synthFilter.frequency);
    lfo.start();
    this.synthOscs.push(lfo);

    // 3. Arpeggiator & Cosmic Pulses generator
    const notes = [
      110.0, 130.81, 146.83, 164.81, 196.0, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0
    ]; // D Minor Pentatonic / Atmospheric
    let step = 0;

    this.synthInterval = setInterval(() => {
      if (!this.isPlaying || this.currentMode !== 'synth') return;
      
      const now = this.ctx.currentTime;
      // Pulse beat (Bass kick & warp)
      if (step % 4 === 0) {
        this.triggerKick(now);
      }
      
      // Stellar chime note
      if (Math.random() > 0.3) {
        const noteIndex = (step * 3 + Math.floor(Math.random() * 3)) % notes.length;
        this.triggerChime(notes[noteIndex], now);
      }

      // Treble spark burst
      if (step % 8 === 0) {
        this.triggerSpark(now);
      }

      step++;
    }, (60 / this.tempo / 2) * 1000);

    this.notifyState();
  }

  triggerKick(time) {
    if (!this.ctx) return;
    const kickOsc = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(130, time);
    kickOsc.frequency.exponentialRampToValueAtTime(32, time + 0.35);

    kickGain.gain.setValueAtTime(0.85, time);
    kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

    kickOsc.connect(kickGain);
    kickGain.connect(this.masterGain);
    kickOsc.start(time);
    kickOsc.stop(time + 0.45);
  }

  triggerChime(freq, time) {
    if (!this.ctx) return;
    const chimeOsc = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(freq * (Math.random() > 0.5 ? 2 : 1), time);

    chimeGain.gain.setValueAtTime(0.22, time);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, time + 1.6);

    chimeOsc.connect(chimeGain);
    chimeGain.connect(this.masterGain);
    chimeOsc.start(time);
    chimeOsc.stop(time + 1.6);
  }

  triggerSpark(time) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2400 + Math.random() * 1200, time);
    osc.frequency.exponentialRampToValueAtTime(800, time + 0.15);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  /* ----------------------------------------------------
   * 2. CUSTOM AUDIO FILE (MP3 / WAV / OGG)
   * ---------------------------------------------------- */
  async loadAudioFile(file) {
    this.stopCurrent();
    await this.resumeContext();

    const objectUrl = URL.createObjectURL(file);
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.loop = true;
    }

    this.audioElement.src = objectUrl;

    if (!this.audioSourceNode) {
      this.audioSourceNode = this.ctx.createMediaElementSource(this.audioElement);
      this.audioSourceNode.connect(this.masterGain);
    }

    try {
      await this.audioElement.play();
      this.currentMode = 'file';
      this.isPlaying = true;
      this.notifyState(file.name);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  /* ----------------------------------------------------
   * 3. MICROPHONE INPUT
   * ---------------------------------------------------- */
  async startMicrophone() {
    this.stopCurrent();
    await this.resumeContext();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micStream = stream;
      this.micSourceNode = this.ctx.createMediaStreamSource(stream);

      // Connect mic to analyser ONLY, never to speakers (avoids acoustic feedback loop)
      this.micSourceNode.connect(this.analyser);
      this.currentMode = 'mic';
      this.isPlaying = true;
      this.notifyState('Microphone (Live)');
    } catch (err) {
      alert('Could not access microphone: ' + err.message);
    }
  }

  /* ----------------------------------------------------
   * 4. SPOTIFY / YOUTUBE / TAB AUDIO CAPTURE
   * Captures direct, uncompressed audio from Spotify web player,
   * YouTube Music, or any desktop audio app via screen/tab sharing.
   * ---------------------------------------------------- */
  async startTabAudio() {
    this.stopCurrent();
    await this.resumeContext();

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(t => t.stop());
        alert('No audio track detected! Please ensure the "Also share tab audio" or "Share system audio" checkbox is checked when selecting your Spotify/YouTube window.');
        return;
      }

      // Immediately shut off video tracks to save GPU/CPU cycles
      stream.getVideoTracks().forEach(track => track.stop());

      this.tabStream = stream;
      this.tabSourceNode = this.ctx.createMediaStreamSource(new MediaStream(audioTracks));

      // Connect to analyser & mediaDest ONLY (never to destination, user already hears the source tab)
      this.tabSourceNode.connect(this.analyser);
      this.tabSourceNode.connect(this.mediaDest);

      this.currentMode = 'tab';
      this.isPlaying = true;
      this.notifyState('Spotify / YouTube / Tab Audio');

      audioTracks[0].onended = () => {
        if (this.currentMode === 'tab') {
          this.stopCurrent();
        }
      };
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        alert('Could not capture audio: ' + err.message);
      }
    }
  }

  stopCurrent() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.synthOscs.length > 0) {
      this.synthOscs.forEach(osc => {
        try { osc.stop(); osc.disconnect(); } catch (e) {}
      });
      this.synthOscs = [];
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
    if (this.micSourceNode) {
      try { this.micSourceNode.disconnect(); } catch (e) {}
      this.micSourceNode = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.tabSourceNode) {
      try { this.tabSourceNode.disconnect(); } catch (e) {}
      this.tabSourceNode = null;
    }
    if (this.tabStream) {
      this.tabStream.getTracks().forEach(t => t.stop());
      this.tabStream = null;
    }
    this.isPlaying = false;
    this.notifyState();
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.stopCurrent();
    } else {
      if (this.currentMode === 'synth') {
        this.startProceduralSynth();
      } else if (this.currentMode === 'file' && this.audioElement) {
        this.audioElement.play();
        this.isPlaying = true;
        this.notifyState();
      } else {
        this.startProceduralSynth();
      }
    }
  }

  onStateChange(cb) {
    this.onStateChangeCallbacks.push(cb);
  }

  notifyState(trackName = null) {
    this.onStateChangeCallbacks.forEach(cb => cb({
      isPlaying: this.isPlaying,
      mode: this.currentMode,
      trackName: trackName || (this.currentMode === 'synth' ? 'Cosmic Singularity (Procedural Synth)' : 'Paused')
    }));
  }

  /* ----------------------------------------------------
   * 4. FRAME UPDATE & FFT FREQUENCY ANALYSIS
   * ---------------------------------------------------- */
  update() {
    if (!this.analyser) return this.smoothedBands;

    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.timeDomainData);

    const binCount = this.frequencyData.length; // 512
    const sampleRate = this.ctx ? this.ctx.sampleRate : 44100;
    const nyquist = sampleRate / 2;
    const hzPerBin = nyquist / binCount;

    // Helper: calculate average amplitude in a frequency range
    const getBandAvg = (lowHz, highHz) => {
      const startBin = Math.max(0, Math.floor(lowHz / hzPerBin));
      const endBin = Math.min(binCount - 1, Math.ceil(highHz / hzPerBin));
      let sum = 0;
      let count = 0;
      for (let i = startBin; i <= endBin; i++) {
        sum += this.frequencyData[i];
        count++;
      }
      return count > 0 ? (sum / count) / 255.0 : 0;
    };

    // Extract frequency domains
    const subBass = Math.pow(getBandAvg(20, 60), 1.3);     // 20-60 Hz: Gravitational shockwaves
    const bass = Math.pow(getBandAvg(60, 250), 1.2);       // 60-250 Hz: Event horizon pulse & mass
    const mids = getBandAvg(250, 2000);                    // 250-2000 Hz: Disk swirl velocity & Doppler
    const treble = Math.pow(getBandAvg(2000, 8000), 1.2);  // 2-8 kHz: Polar jets & plasma flare bursts

    // Calculate overall energy
    let totalSum = 0;
    for (let i = 0; i < binCount; i++) {
      totalSum += this.frequencyData[i];
    }
    const energy = (totalSum / binCount) / 255.0;

    this.bands.subBass = subBass;
    this.bands.bass = bass;
    this.bands.mids = mids;
    this.bands.treble = treble;
    this.bands.energy = energy;

    // Smooth values for fluid GLSL shader animations (LERP)
    const lerp = (a, b, t) => a + (b - a) * t;
    this.smoothedBands.subBass = lerp(this.smoothedBands.subBass, subBass, 0.18);
    this.smoothedBands.bass = lerp(this.smoothedBands.bass, bass, 0.22);
    this.smoothedBands.mids = lerp(this.smoothedBands.mids, mids, 0.15);
    this.smoothedBands.treble = lerp(this.smoothedBands.treble, treble, 0.25);
    this.smoothedBands.energy = lerp(this.smoothedBands.energy, energy, 0.15);

    return this.smoothedBands;
  }
}
