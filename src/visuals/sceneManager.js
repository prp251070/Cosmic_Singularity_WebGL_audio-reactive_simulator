import * as THREE from 'three';
import { BlackHoleShader } from '../shaders/blackholeShader.js';
import { PostProcessShader } from '../shaders/postProcessing.js';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    // Three.js Core
    this.renderer = null;
    this.scene = null;
    this.camera = null;

    // Render Targets for Post-Processing
    this.renderTarget = null;
    this.postScene = null;
    this.postCamera = null;
    this.postMaterial = null;

    // Black Hole Raymarching Quad
    this.bhMaterial = null;
    this.bhMesh = null;

    // 3D Orbiting Particle Accretion Dust
    this.particleCount = 18000;
    this.particleGeometry = null;
    this.particleMaterial = null;
    this.particleSystem = null;
    this.particleData = [];

    // Camera Orbit Controls & State
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.cameraDistance = 9.5;
    this.targetCameraDistance = 9.5;
    this.cameraRotation = { phi: 0.25, theta: 0.85 }; // Spherical coords
    this.targetRotation = { phi: 0.25, theta: 0.85 };
    this.autoRotate = true;
    this.autoRotateSpeed = 0.0018;

    // Settings & Physical Parameters
    this.params = {
      blackHoleMass: 1.0,
      lensingStrength: 1.15,
      diskInnerRadius: 2.8,
      diskOuterRadius: 9.8,
      diskDensity: 1.35,
      jetIntensity: 1.2,
      bloomIntensity: 1.4,
      chromaticAberration: 0.8,
      colorTheme: 0, // 0: Gargantua Gold, 1: Quantum Cyan, 2: Supernova Amber, 3: Void Phantom
      qualityScale: 1.0
    };

    this.startTime = performance.now();

    this.init();
  }

  init() {
    // 1. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true // Required for high-res screenshots and MediaRecorder
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(this.pixelRatio);

    // 2. Camera Setup
    this.camera = new THREE.PerspectiveCamera(55, this.width / this.height, 0.1, 100);
    this.updateCameraPosition();

    // 3. Main Scene Setup (for Black Hole Raymarching Quad)
    this.scene = new THREE.Scene();
    const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // 4. Black Hole Raymarching Shader Material
    this.bhMaterial = new THREE.ShaderMaterial({
      vertexShader: BlackHoleShader.vertexShader,
      fragmentShader: BlackHoleShader.fragmentShader,
      uniforms: {
        uResolution: { value: new THREE.Vector2(this.width * this.pixelRatio, this.height * this.pixelRatio) },
        uInvViewMatrix: { value: new THREE.Matrix4() },
        uInvProjectionMatrix: { value: new THREE.Matrix4() },
        uCameraPosition: { value: new THREE.Vector3() },
        uTime: { value: 0 },
        uSubBass: { value: 0 },
        uBass: { value: 0 },
        uMids: { value: 0 },
        uTreble: { value: 0 },
        uAudioEnergy: { value: 0 },
        uBlackHoleMass: { value: this.params.blackHoleMass },
        uLensingStrength: { value: this.params.lensingStrength },
        uDiskInnerRadius: { value: this.params.diskInnerRadius },
        uDiskOuterRadius: { value: this.params.diskOuterRadius },
        uDiskDensity: { value: this.params.diskDensity },
        uJetIntensity: { value: this.params.jetIntensity },
        uColorTheme: { value: this.params.colorTheme }
      },
      depthWrite: false,
      depthTest: false
    });

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.bhMesh = new THREE.Mesh(quadGeo, this.bhMaterial);
    this.scene.add(this.bhMesh);

    // 5. Setup Offscreen Render Target for Bloom & Post-processing
    this.createRenderTarget();

    // 6. Post-processing Screen Quad
    this.postScene = new THREE.Scene();
    this.postCamera = orthoCamera;
    this.postMaterial = new THREE.ShaderMaterial({
      vertexShader: PostProcessShader.vertexShader,
      fragmentShader: PostProcessShader.fragmentShader,
      uniforms: {
        tDiffuse: { value: this.renderTarget.texture },
        uResolution: { value: new THREE.Vector2(this.width * this.pixelRatio, this.height * this.pixelRatio) },
        uBloomIntensity: { value: this.params.bloomIntensity },
        uChromaticAberration: { value: this.params.chromaticAberration },
        uSubBass: { value: 0 },
        uTime: { value: 0 }
      },
      depthWrite: false,
      depthTest: false
    });
    const postMesh = new THREE.Mesh(quadGeo, this.postMaterial);
    this.postScene.add(postMesh);

    // 7. Event Listeners for OrbitControls & Resize
    this.setupControls();
    window.addEventListener('resize', () => this.onResize());
  }

  createRenderTarget() {
    if (this.renderTarget) this.renderTarget.dispose();
    const w = Math.floor(this.width * this.pixelRatio * this.params.qualityScale);
    const h = Math.floor(this.height * this.pixelRatio * this.params.qualityScale);

    this.renderTarget = new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType
    });

    if (this.postMaterial) {
      this.postMaterial.uniforms.tDiffuse.value = this.renderTarget.texture;
    }
  }

  setupControls() {
    // Mouse drag for 3D orbital camera
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.targetRotation.theta -= deltaX * 0.0055;
      this.targetRotation.phi += deltaY * 0.0055;

      // Clamp vertical polar angle to avoid gimbal lock flip
      const maxPhi = Math.PI / 2 - 0.05;
      const minPhi = -Math.PI / 2 + 0.05;
      this.targetRotation.phi = Math.max(minPhi, Math.min(maxPhi, this.targetRotation.phi));

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    // Touch controls for mobile/tablet
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

      this.targetRotation.theta -= deltaX * 0.0055;
      this.targetRotation.phi += deltaY * 0.0055;

      const maxPhi = Math.PI / 2 - 0.05;
      const minPhi = -Math.PI / 2 + 0.05;
      this.targetRotation.phi = Math.max(minPhi, Math.min(maxPhi, this.targetRotation.phi));

      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });

    // Scroll wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetCameraDistance += e.deltaY * 0.007;
      this.targetCameraDistance = Math.max(2.5, Math.min(22.0, this.targetCameraDistance));
    }, { passive: false });
  }

  setCameraPreset(name) {
    if (name === 'gargantua') {
      this.targetRotation = { phi: 0.12, theta: 0.75 };
      this.targetCameraDistance = 9.5;
    } else if (name === 'polar') {
      this.targetRotation = { phi: 1.45, theta: 0.0 }; // Looking down into jet
      this.targetCameraDistance = 11.0;
    } else if (name === 'horizon') {
      this.targetRotation = { phi: 0.02, theta: 1.2 }; // Close edge graze
      this.targetCameraDistance = 4.2;
    } else if (name === 'wide') {
      this.targetRotation = { phi: 0.35, theta: 2.2 }; // Deep space
      this.targetCameraDistance = 16.0;
    }
  }

  updateCameraPosition() {
    // Smooth LERP camera rotation and distance
    this.cameraRotation.phi += (this.targetRotation.phi - this.cameraRotation.phi) * 0.08;
    this.cameraRotation.theta += (this.targetRotation.theta - this.cameraRotation.theta) * 0.08;
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * 0.08;

    // Convert spherical coordinates to Cartesian (x, y, z)
    const phi = this.cameraRotation.phi;
    const theta = this.cameraRotation.theta;
    const r = this.cameraDistance;

    const x = r * Math.cos(phi) * Math.sin(theta);
    const y = r * Math.sin(phi);
    const z = r * Math.cos(phi) * Math.cos(theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld();
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(this.pixelRatio);

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    const scaledW = this.width * this.pixelRatio * this.params.qualityScale;
    const scaledH = this.height * this.pixelRatio * this.params.qualityScale;

    this.bhMaterial.uniforms.uResolution.value.set(scaledW, scaledH);
    this.postMaterial.uniforms.uResolution.value.set(this.width * this.pixelRatio, this.height * this.pixelRatio);

    this.createRenderTarget();
  }

  setQuality(scale) {
    this.params.qualityScale = scale;
    this.onResize();
  }

  setColorTheme(themeIndex) {
    this.params.colorTheme = themeIndex;
    this.bhMaterial.uniforms.uColorTheme.value = themeIndex;
  }

  setParam(name, value) {
    if (this.params[name] !== undefined) {
      this.params[name] = value;
      if (this.bhMaterial.uniforms['u' + name.charAt(0).toUpperCase() + name.slice(1)]) {
        this.bhMaterial.uniforms['u' + name.charAt(0).toUpperCase() + name.slice(1)].value = value;
      }
      if (this.postMaterial.uniforms['u' + name.charAt(0).toUpperCase() + name.slice(1)]) {
        this.postMaterial.uniforms['u' + name.charAt(0).toUpperCase() + name.slice(1)].value = value;
      }
    }
  }

  render(audioBands) {
    const elapsedTime = (performance.now() - this.startTime) * 0.001;

    // Auto rotate camera gently when user is not manually interacting
    if (this.autoRotate && !this.isDragging) {
      this.targetRotation.theta += this.autoRotateSpeed * (1.0 + audioBands.mids * 0.8);
    }

    this.updateCameraPosition();

    // Update Raymarching Matrix Uniforms
    // Pass inverse view and projection matrices to trace rays accurately in world space
    const invViewMatrix = this.camera.matrixWorld;
    const invProjMatrix = this.camera.projectionMatrixInverse;

    this.bhMaterial.uniforms.uTime.value = elapsedTime;
    this.bhMaterial.uniforms.uInvViewMatrix.value.copy(invViewMatrix);
    this.bhMaterial.uniforms.uInvProjectionMatrix.value.copy(invProjMatrix);
    this.bhMaterial.uniforms.uCameraPosition.value.copy(this.camera.position);

    // Audio bands updates to shaders
    this.bhMaterial.uniforms.uSubBass.value = audioBands.subBass;
    this.bhMaterial.uniforms.uBass.value = audioBands.bass;
    this.bhMaterial.uniforms.uMids.value = audioBands.mids;
    this.bhMaterial.uniforms.uTreble.value = audioBands.treble;
    this.bhMaterial.uniforms.uAudioEnergy.value = audioBands.energy;

    // Post processing uniforms
    this.postMaterial.uniforms.uSubBass.value = audioBands.subBass;
    this.postMaterial.uniforms.uTime.value = elapsedTime;
    this.postMaterial.uniforms.uBloomIntensity.value = this.params.bloomIntensity;
    this.postMaterial.uniforms.uChromaticAberration.value = this.params.chromaticAberration;

    // 1st Pass: Render Black Hole Raymarching Scene to HDR Render Target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.postCamera);

    // 2nd Pass: Render Post-Processing Quad to Screen Canvas
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }
}
