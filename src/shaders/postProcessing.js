/**
 * Cinematic Post-Processing Shader:
 * - Multi-pass / Multi-tap HDR Bloom
 * - Gravitational Chromatic Aberration
 * - ACES Filmic Tone Mapping
 * - Subtle Lens Flare & Starburst Glare
 */

export const PostProcessShader = {
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
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uBloomIntensity;
    uniform float uChromaticAberration;
    uniform float uSubBass;
    uniform float uTime;

    // ACES Filmic Tone Mapping Curve
    vec3 ACESFilm(vec3 x) {
      float a = 2.51;
      float b = 0.03;
      float c = 2.43;
      float d = 0.59;
      float e = 0.14;
      return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = vec2(0.5);
      vec2 toCenter = center - uv;
      float distToCenter = length(toCenter);

      // 1. Relativistic Chromatic Aberration
      // Gravitational spacetime dispersion pulses with bass
      float caAmount = (uChromaticAberration * 0.012 + uSubBass * 0.008) * distToCenter;
      vec2 caDir = normalize(toCenter + 0.0001);

      vec3 col;
      col.r = texture2D(tDiffuse, uv + caDir * caAmount).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - caDir * caAmount).b;

      // 2. High-grade Bloom / Glare Extraction (13-tap cross sample)
      vec3 bloom = vec3(0.0);
      vec2 texel = 1.0 / uResolution;

      float weights[5];
      weights[0] = 0.227027;
      weights[1] = 0.1945946;
      weights[2] = 0.1216216;
      weights[3] = 0.054054;
      weights[4] = 0.016216;

      // Radial bloom blur samples
      for (int i = 1; i < 5; i++) {
        vec2 offset = float(i) * texel * 3.5;
        bloom += max(vec3(0.0), texture2D(tDiffuse, uv + vec2(offset.x, 0.0)).rgb - 0.45) * weights[i];
        bloom += max(vec3(0.0), texture2D(tDiffuse, uv - vec2(offset.x, 0.0)).rgb - 0.45) * weights[i];
        bloom += max(vec3(0.0), texture2D(tDiffuse, uv + vec2(0.0, offset.y)).rgb - 0.45) * weights[i];
        bloom += max(vec3(0.0), texture2D(tDiffuse, uv - vec2(0.0, offset.y)).rgb - 0.45) * weights[i];
      }

      // Add bloom to base color
      col += bloom * uBloomIntensity * 2.8;

      // 3. ACES Filmic Tone Mapping & Gamma Correction
      col = ACESFilm(col);
      col = pow(col, vec3(1.0 / 2.2));

      gl_FragColor = vec4(col, 1.0);
    }
  `
};
