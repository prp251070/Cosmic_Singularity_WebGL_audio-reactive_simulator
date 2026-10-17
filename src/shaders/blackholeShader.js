/**
 * GLSL Raymarching Shader for General Relativistic Black Hole with:
 * - Geodesic curved ray bending (Einstein gravitational lensing)
 * - Interstellar-style double-ring volumetric accretion disk
 * - Relativistic Doppler boosting (approaching side blue-shifted & brighter)
 * - Relativistic polar plasma jets with shock diamonds
 * - Audio-reactive pulsation (Sub-bass warp, Bass photon ring, Treble flares)
 * - Procedural cosmic nebula & warped starfield background
 */

export const BlackHoleShader = {
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    precision highp float;

    varying vec2 vUv;

    // View uniforms
    uniform vec2 uResolution;
    uniform mat4 uInvViewMatrix;
    uniform mat4 uInvProjectionMatrix;
    uniform vec3 uCameraPosition;
    uniform float uTime;

    // Audio reactivity uniforms
    uniform float uSubBass;    // 0.0 - 1.0 (Gravitational shockwave & warp)
    uniform float uBass;       // 0.0 - 1.0 (Photon ring bloom & radius pulse)
    uniform float uMids;       // 0.0 - 1.0 (Disk rotation velocity & temperature)
    uniform float uTreble;     // 0.0 - 1.0 (Polar jets & flare eruptions)
    uniform float uAudioEnergy;// Overall loudness

    // Physical & Artistic Controls
    uniform float uBlackHoleMass;     // Schwarzschild radius scale
    uniform float uLensingStrength;   // Geodesic deflection multiplier
    uniform float uDiskInnerRadius;   // Inner ISCO edge
    uniform float uDiskOuterRadius;   // Outer edge
    uniform float uDiskDensity;       // Accretion disk opacity
    uniform float uJetIntensity;      // Polar jet brightness
    uniform int uColorTheme;          // 0: Gargantua Gold, 1: Quantum Cyan, 2: Supernova Amber, 3: Void Phantom

    #define PI 3.14159265359
    #define TWO_PI 6.28318530718

    // -------------------------------------------------------------
    // Procedural Noise Functions (GLSL Simplex & Hash)
    // -------------------------------------------------------------
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float hash3(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    // 3D Simplex-like Value Noise
    float noise3D(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(
          mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
          mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
        mix(
          mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
          mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
    }

    // Fractal Brownian Motion for turbulent swirling gas
    float fbm(vec3 p) {
      float total = 0.0;
      float amp = 0.55;
      float freq = 1.0;
      for (int i = 0; i < 4; i++) {
        total += amp * noise3D(p * freq);
        freq *= 2.05;
        amp *= 0.48;
      }
      return total;
    }

    // -------------------------------------------------------------
    // Procedural Cosmic Nebula & Starfield
    // -------------------------------------------------------------
    vec3 getCosmicSky(vec3 rayDir) {
      // Background stars
      vec3 p = rayDir * 280.0;
      vec3 starCoord = floor(p);
      float h = hash3(starCoord);

      vec3 skyColor = vec3(0.003, 0.004, 0.012); // Deep vacuum void

      if (h > 0.985) {
        float brightness = pow(hash3(starCoord + 1.2), 16.0) * 1.8;
        // Subtle star twinkle
        brightness *= 0.8 + 0.2 * sin(uTime * 3.0 + h * 20.0);
        vec3 starTint = mix(vec3(0.7, 0.85, 1.0), vec3(1.0, 0.7, 0.4), hash3(starCoord + 5.0));
        skyColor += starTint * brightness;
      }

      // Distant swirling galactic dust / nebula lanes
      float nebula1 = fbm(rayDir * 2.5 + vec3(uTime * 0.01));
      float nebula2 = fbm(rayDir * 4.0 - vec3(uTime * 0.005));

      vec3 nebCol1 = vec3(0.12, 0.03, 0.25); // Violet cosmic gas
      vec3 nebCol2 = vec3(0.02, 0.08, 0.20); // Cyan interstellar cloud
      vec3 nebCol3 = vec3(0.25, 0.09, 0.03); // Warm amber dust

      skyColor += nebCol1 * pow(nebula1, 2.5) * 1.2;
      skyColor += nebCol2 * pow(nebula2, 3.0) * 0.9;
      skyColor += nebCol3 * pow(nebula1 * nebula2, 2.0) * 0.6;

      return skyColor;
    }

    // -------------------------------------------------------------
    // Palette Color Generator
    // -------------------------------------------------------------
    vec3 getThemeColor(float t, float doppler) {
      // t is normalized temperature/intensity (0.0 to 1.0)
      vec3 col;
      if (uColorTheme == 0) {
        // Gargantua Gold & Deep Plasma Amber
        vec3 c0 = vec3(0.15, 0.02, 0.005);
        vec3 c1 = vec3(1.00, 0.45, 0.08);
        vec3 c2 = vec3(1.20, 0.95, 0.45);
        vec3 c3 = vec3(1.40, 1.35, 1.20);
        col = (t < 0.35) ? mix(c0, c1, t / 0.35) :
              (t < 0.75) ? mix(c1, c2, (t - 0.35) / 0.4) :
                           mix(c2, c3, (t - 0.75) / 0.25);
      } else if (uColorTheme == 1) {
        // Quantum Cyan / Neutron Singularity
        vec3 c0 = vec3(0.01, 0.03, 0.12);
        vec3 c1 = vec3(0.05, 0.60, 0.95);
        vec3 c2 = vec3(0.40, 0.95, 1.20);
        vec3 c3 = vec3(1.10, 1.30, 1.40);
        col = (t < 0.35) ? mix(c0, c1, t / 0.35) :
              (t < 0.75) ? mix(c1, c2, (t - 0.35) / 0.4) :
                           mix(c2, c3, (t - 0.75) / 0.25);
      } else if (uColorTheme == 2) {
        // Supernova (Crimson, Coral & Blaze)
        vec3 c0 = vec3(0.20, 0.01, 0.02);
        vec3 c1 = vec3(1.00, 0.15, 0.10);
        vec3 c2 = vec3(1.20, 0.65, 0.15);
        vec3 c3 = vec3(1.40, 1.15, 0.80);
        col = (t < 0.35) ? mix(c0, c1, t / 0.35) :
              (t < 0.75) ? mix(c1, c2, (t - 0.35) / 0.4) :
                           mix(c2, c3, (t - 0.75) / 0.25);
      } else {
        // Void Phantom (Electric Violet & Neon Magenta)
        vec3 c0 = vec3(0.08, 0.01, 0.18);
        vec3 c1 = vec3(0.75, 0.10, 0.90);
        vec3 c2 = vec3(0.95, 0.45, 1.20);
        vec3 c3 = vec3(1.20, 1.10, 1.40);
        col = (t < 0.35) ? mix(c0, c1, t / 0.35) :
              (t < 0.75) ? mix(c1, c2, (t - 0.35) / 0.4) :
                           mix(c2, c3, (t - 0.75) / 0.25);
      }

      // Doppler color shift: blue-shift approaching, red-shift receding
      col.b *= (1.0 + doppler * 0.45);
      col.r *= (1.0 - doppler * 0.35);
      return col;
    }

    // -------------------------------------------------------------
    // Accretion Disk Plasma Density & Emission
    // -------------------------------------------------------------
    vec4 sampleAccretionDisk(vec3 pos, vec3 rayDir, float rs) {
      float r = length(pos.xz);
      float innerR = rs * uDiskInnerRadius;
      float outerR = rs * uDiskOuterRadius;

      // Outside radial bounds
      if (r < innerR || r > outerR) return vec4(0.0);

      // Vertical Gaussian thickness profile
      float diskThickness = 0.09 * r + 0.02;
      float vertDist = abs(pos.y);
      float vertFalloff = exp(-pow(vertDist / diskThickness, 2.0));
      if (vertFalloff < 0.015) return vec4(0.0);

      // Radial density profile (peaks right outside ISCO)
      float radialNorm = (r - innerR) / (outerR - innerR);
      float radialDensity = pow(radialNorm, 0.5) * exp(-radialNorm * 3.5) * 6.5;

      // Keplerian differential rotation: v ~ 1 / sqrt(r)
      float omega = 1.3 / pow(r, 1.5);
      float angle = atan(pos.z, pos.x);
      float rotSpeed = 1.0 + uMids * 1.5;
      float dynamicAngle = angle + uTime * omega * rotSpeed;

      // Swirling spiral arm noise
      vec3 noisePos = vec3(
        cos(dynamicAngle) * r * 1.1,
        pos.y * 3.0,
        sin(dynamicAngle) * r * 1.1
      );

      float gasTurbulence = fbm(noisePos * 1.8 + vec3(uTime * 0.15));
      gasTurbulence = smoothstep(0.2, 0.9, gasTurbulence);

      // Relativistic Doppler Beaming Effect
      // Orbital velocity vector tangential to circle in xz plane
      vec3 vel = normalize(vec3(-sin(angle), 0.0, cos(angle)));
      // Dot product with ray direction gives line-of-sight velocity
      float doppler = dot(vel, -rayDir); // -1.0 (moving away) to +1.0 (approaching)

      // Relativistic beaming factor (approaching side is MUCH brighter)
      float beaming = pow(1.0 + doppler * 0.65, 3.2);

      // Audio flare excitation (Treble causes electric sparks and solar prominence)
      float audioFlare = uTreble * step(0.65, gasTurbulence) * 2.5;

      // Combine density
      float density = radialDensity * vertFalloff * (0.6 + 0.8 * gasTurbulence) * uDiskDensity;
      density *= (1.0 + uBass * 0.4);

      // Radiative temperature / color
      float temp = clamp((1.0 - radialNorm) * 0.85 + audioFlare * 0.5 + gasTurbulence * 0.25, 0.0, 1.0);
      vec3 emission = getThemeColor(temp, doppler) * beaming * (1.2 + audioFlare);

      return vec4(emission, density);
    }

    // -------------------------------------------------------------
    // Relativistic Polar Jet Emission
    // -------------------------------------------------------------
    vec3 samplePolarJets(vec3 pos, float rs) {
      if (uJetIntensity <= 0.001) return vec3(0.0);

      float r = length(pos.xz);
      float h = abs(pos.y);
      if (h < rs * 1.2 || h > 18.0) return vec3(0.0);

      // Jet expands as a narrow collimated cone
      float coneRadius = 0.15 * pow(h, 0.75) + 0.08;
      if (r > coneRadius) return vec3(0.0);

      // Helical twisting magnetic field along jet
      float twist = atan(pos.z, pos.x) * 2.0 + pos.y * 1.5 - uTime * (4.0 + uTreble * 6.0);
      float helixNoise = sin(twist) * 0.5 + 0.5;

      // Pulsating shock diamonds (periodic standing nodes along jet)
      float shockDiamond = pow(sin(pos.y * 2.5 - uTime * 6.0) * 0.5 + 0.5, 4.0);

      float jetFalloff = (1.0 - r / coneRadius) * exp(-h * 0.12);
      float intensity = jetFalloff * (0.4 + 0.6 * helixNoise + shockDiamond * 1.5);
      intensity *= uJetIntensity * (0.8 + uTreble * 2.8 + uAudioEnergy * 0.8);

      vec3 jetColor = (uColorTheme == 1) ? vec3(0.2, 0.8, 1.4) :
                      (uColorTheme == 2) ? vec3(1.4, 0.3, 0.2) :
                      (uColorTheme == 3) ? vec3(1.2, 0.2, 1.4) :
                                           vec3(1.3, 0.8, 0.3);

      return jetColor * intensity * 0.12;
    }

    // -------------------------------------------------------------
    // MAIN GENERAL RELATIVITY RAY INTEGRATION
    // -------------------------------------------------------------
    void main() {
      // Compute primary camera ray from normalized screen UV coordinates
      vec2 ndc = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
      vec4 target = uInvProjectionMatrix * vec4(ndc, 1.0, 1.0);
      vec3 rayDir = normalize((uInvViewMatrix * vec4(target.xyz / target.w, 0.0)).xyz);
      vec3 rayPos = uCameraPosition;

      // Black Hole properties
      // Base Schwarzschild radius with Sub-bass & Bass pulsing
      float massPulse = 1.0 + uBass * 0.15 + uSubBass * 0.08;
      float rs = uBlackHoleMass * massPulse;
      float photonSphereR = rs * 1.5;

      vec3 accumColor = vec3(0.0);
      float transmittance = 1.0;

      // Numerical Geodesic Curved Ray Integration
      // As light passes through curved spacetime, gravity deflects its trajectory
      const int MAX_STEPS = 140;
      float dt = 0.18; // Step size
      bool hitEventHorizon = false;
      float minDistanceToSingularity = 1e6;

      for (int i = 0; i < MAX_STEPS; i++) {
        float r = length(rayPos);
        minDistanceToSingularity = min(minDistanceToSingularity, r);

        // 1. Check Event Horizon collision
        if (r < rs) {
          hitEventHorizon = true;
          break; // Trapped inside event horizon (pitch black singularity shadow)
        }

        // 2. Gravitational Deflection (General Relativity Geodesic Approximation)
        // Deflection acceleration d^2r/dt^2 ~ - 1.5 * rs * (r x v)^2 / r^5
        vec3 toCenter = -normalize(rayPos);
        float h2 = pow(length(cross(rayPos, rayDir)), 2.0);
        float deflection = (1.5 * rs * h2) / (r * r * r * r * r);
        deflection *= uLensingStrength * (1.0 + uSubBass * 0.5);

        // Apply curvature to ray direction
        rayDir = normalize(rayDir + toCenter * deflection * dt);

        // Adaptive step size: smaller steps near photon sphere, larger far away
        float stepDist = dt * clamp(pow(r / (rs * 1.5), 1.2), 0.35, 3.5);

        // 3. Sample Volumetric Accretion Disk
        vec4 diskSample = sampleAccretionDisk(rayPos, rayDir, rs);
        if (diskSample.a > 0.001) {
          float stepAlpha = clamp(diskSample.a * stepDist * 1.8, 0.0, 1.0);
          accumColor += diskSample.rgb * stepAlpha * transmittance;
          transmittance *= (1.0 - stepAlpha);
          if (transmittance < 0.01) break; // Saturated
        }

        // 4. Sample Polar Relativistic Jets
        vec3 jetSample = samplePolarJets(rayPos, rs);
        accumColor += jetSample * stepDist * transmittance;

        // Advance ray along curved path
        rayPos += rayDir * stepDist;

        // Escape condition: if ray escaped to infinity (> 35.0 units away and moving outward)
        if (r > 35.0 && dot(rayPos, rayDir) > 0.0) {
          break;
        }
      }

      // If the ray did not hit the black hole event horizon, sample the cosmic background sky
      if (!hitEventHorizon) {
        vec3 skyColor = getCosmicSky(rayDir);
        accumColor += skyColor * transmittance;
      }

      // -------------------------------------------------------------
      // Photon Sphere Ring Glow (Blinding Einstein Ring around shadow)
      // -------------------------------------------------------------
      float photonDist = abs(minDistanceToSingularity - photonSphereR);
      float photonRing = exp(-photonDist * 18.0 / rs) * (1.4 + uBass * 3.5 + uSubBass * 1.5);

      vec3 ringColor = (uColorTheme == 1) ? vec3(0.5, 0.9, 1.4) :
                       (uColorTheme == 2) ? vec3(1.4, 0.6, 0.2) :
                       (uColorTheme == 3) ? vec3(1.2, 0.4, 1.4) :
                                            vec3(1.4, 1.1, 0.6);

      accumColor += ringColor * photonRing * 0.85;

      // Event Horizon Core Shadow
      if (hitEventHorizon) {
        // Absolute void inside the event horizon
        accumColor *= 0.0;
      }

      // Gravitational Redshift / Vignette along outer screen edges
      vec2 screenUv = gl_FragCoord.xy / uResolution;
      float vignette = screenUv.x * screenUv.y * (1.0 - screenUv.x) * (1.0 - screenUv.y);
      vignette = clamp(pow(16.0 * vignette, 0.25), 0.0, 1.0);
      accumColor *= vignette;

      // Subtle film grain
      float grain = (hash(screenUv + fract(uTime)) - 0.5) * 0.025;
      accumColor += grain;

      gl_FragColor = vec4(accumColor, 1.0);
    }
  `
};
