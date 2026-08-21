import * as THREE from 'three';

// 1. Fiber-Optic Synapse Line Pulse Shader
export const SynapseLineShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00D9FF) },
    uAmberColor: { value: new THREE.Color(0xFFB84D) },
    uAmberSurge: { value: 0.0 },
    uExpansion: { value: 0.0 }
  },
  vertexShader: `
    attribute float aProgress;
    attribute float aSpeed;
    varying float vProgress;
    varying float vSpeed;
    varying vec3 vPosition;
    uniform float uExpansion;

    void main() {
      vProgress = aProgress;
      vSpeed = aSpeed;
      vec3 pos = position * (1.0 + uExpansion * 0.4);
      vPosition = pos;
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uAmberColor;
    uniform float uAmberSurge;
    varying float vProgress;
    varying float vSpeed;
    varying vec3 vPosition;

    void main() {
      // Pulse wave traveling down the line
      float wave = sin((vProgress * 15.0 - uTime * vSpeed * 3.0));
      wave = pow(max(0.0, wave), 6.0); // sharp bright pulses

      float baseAlpha = 0.15 + wave * 0.85;
      vec3 finalColor = mix(uColor, uAmberColor, uAmberSurge);

      // Core intensity glow
      vec3 glow = finalColor * (1.0 + wave * 2.0);
      gl_FragColor = vec4(glow, baseAlpha);
    }
  `
};

// 2. Concentric Holographic Ring Shader
export const HolographicRingShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00D9FF) },
    uSegments: { value: 64.0 },
    uDashRatio: { value: 0.7 },
    uPulseSpeed: { value: 1.0 },
    uAmberState: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uSegments;
    uniform float uDashRatio;
    uniform float uPulseSpeed;
    uniform float uAmberState;
    varying vec2 vUv;

    void main() {
      float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
      float segmentPattern = sin(angle * uSegments + uTime * uPulseSpeed);
      
      float dash = step(1.0 - uDashRatio, (segmentPattern + 1.0) * 0.5);
      
      vec3 col = mix(uColor, vec3(1.0, 0.72, 0.3), uAmberState);
      float pulse = 0.6 + 0.4 * sin(uTime * 2.0);

      gl_FragColor = vec4(col * (1.2 + pulse * 0.8), dash * 0.8 * pulse);
    }
  `
};

// 3. Hex Grid Background Shader
export const HexGridShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x071525) },
    uGridCyan: { value: new THREE.Color(0x00D9FF) },
    uActiveState: { value: 0.15 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uGridCyan;
    uniform float uActiveState;
    varying vec2 vUv;

    // Hexagon distance function
    float hexDistance(vec2 p) {
      p = abs(p);
      return max(p.x * 0.866025 + p.y * 0.5, p.y);
    }

    vec4 hexGrid(vec2 uv) {
      vec2 r = vec2(1.0, 1.7320508); // 1, sqrt(3)
      vec2 h = r * 0.5;
      vec2 a = mod(uv, r) - h;
      vec2 b = mod(uv - h, r) - h;
      vec2 gv = dot(a, a) < dot(b, b) ? a : b;
      
      float d = hexDistance(gv);
      float edge = smoothstep(0.48, 0.5, d);
      return vec4(edge);
    }

    void main() {
      vec2 st = (vUv - 0.5) * 12.0;
      float hex = hexGrid(st).r;

      // Vertical scanning pulse line
      float scan = smoothstep(0.0, 0.05, abs(vUv.y - fract(uTime * 0.05)));
      scan = 1.0 - scan;

      vec3 baseGrid = mix(uColor, uGridCyan, hex * uActiveState);
      vec3 finalCol = baseGrid + uGridCyan * scan * 0.3 * hex;

      float distFromCenter = length(vUv - 0.5);
      float vignette = 1.0 - smoothstep(0.2, 0.7, distFromCenter);

      gl_FragColor = vec4(finalCol, uActiveState * hex * vignette);
    }
  `
};
