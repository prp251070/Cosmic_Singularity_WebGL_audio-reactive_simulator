/**
 * WebM Video and High-Resolution Screenshot Recorder
 * - Synchronously records WebGL canvas 60FPS video + Web Audio API stream
 * - Supports automatic download as .webm and .png
 * - Provides live recording duration callbacks
 */

export class VideoRecorder {
  constructor(canvas, audioEngine) {
    this.canvas = canvas;
    this.audioEngine = audioEngine;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.startTime = 0;
    this.timerInterval = null;
    this.onTimerUpdate = null;
  }

  isSupported() {
    return typeof MediaRecorder !== 'undefined' && typeof this.canvas.captureStream === 'function';
  }

  startRecording(onTimerUpdate) {
    if (this.isRecording) return;
    this.onTimerUpdate = onTimerUpdate;
    this.recordedChunks = [];

    // Capture 60FPS canvas stream
    const canvasStream = this.canvas.captureStream(60);

    // Merge audio stream if available
    const combinedStream = new MediaStream();

    canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

    try {
      const audioStream = this.audioEngine.getAudioStream();
      if (audioStream && audioStream.getAudioTracks().length > 0) {
        audioStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
      }
    } catch (e) {
      console.warn('Could not attach audio track to video recording:', e);
    }

    // Determine best supported mimeType
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm'
    ];

    let selectedMimeType = '';
    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        selectedMimeType = type;
        break;
      }
    }

    try {
      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMimeType || undefined,
        videoBitsPerSecond: 12000000 // 12 Mbps for high visual fidelity
      });
    } catch (e) {
      // Fallback without bitrate constraint
      this.mediaRecorder = new MediaRecorder(combinedStream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.finishAndDownload();
    };

    this.mediaRecorder.start(250); // Slice every 250ms
    this.isRecording = true;
    this.startTime = Date.now();

    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const secs = String(elapsed % 60).padStart(2, '0');
      if (this.onTimerUpdate) {
        this.onTimerUpdate(`${mins}:${secs}`);
      }
    }, 500);
  }

  stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.isRecording = false;
    clearInterval(this.timerInterval);
    this.timerInterval = null;

    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  finishAndDownload() {
    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `cosmic-singularity-${timestamp}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  captureScreenshot() {
    // Screen flash visual effect
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = '0';
    flash.style.backgroundColor = 'white';
    flash.style.zIndex = '999999';
    flash.style.pointerEvents = 'none';
    flash.style.opacity = '0.75';
    flash.style.transition = 'opacity 0.4s ease-out';
    document.body.appendChild(flash);
    requestAnimationFrame(() => {
      flash.style.opacity = '0';
      setTimeout(() => document.body.removeChild(flash), 400);
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dataUrl = this.canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `cosmic-singularity-${timestamp}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
  }
}
