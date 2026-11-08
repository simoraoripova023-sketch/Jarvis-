import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GestureType, QualityTier, ActiveCallout, NeuralNode, SystemThemeMode } from '../../types/neural';
import { generateBrainStructure } from './BrainGeometryGenerator';
import { SynapseLineShader, HolographicRingShader, HexGridShader } from './NeuralCoreShaders';
import { soundManager } from '../../services/AudioSynthesizer';

interface NeuralCoreCanvasProps {
  gesture: GestureType;
  qualityTier: QualityTier;
  onNodeSelect: (callout: ActiveCallout | null) => void;
  amberSurge: boolean;
  themeMode?: SystemThemeMode;
  onFpsUpdate: (fps: number) => void;
  handX?: number; // Real-time Hand X coordinate from camera (-1 to 1)
  handY?: number; // Real-time Hand Y coordinate from camera (-1 to 1)
  handZoom?: number; // Real-time Hand Distance Zoom from camera
}

export const NeuralCoreCanvas: React.FC<NeuralCoreCanvasProps> = ({
  gesture,
  qualityTier,
  onNodeSelect,
  amberSurge,
  themeMode = 'CYAN',
  onFpsUpdate,
  handX,
  handY,
  handZoom
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Interaction State Refs
  const isDraggingRef = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0, y: 0 });

  const targetZoom = useRef(6.5);
  const currentZoom = useRef(6.5);

  const targetExpansion = useRef(0.0);
  const currentExpansion = useRef(0.0);

  const hoveredNodeRef = useRef<NeuralNode | null>(null);

  const getQualityMultiplier = useCallback(() => {
    switch (qualityTier) {
      case 'LOW': return 0.5;
      case 'MEDIUM': return 0.8;
      case 'HIGH': return 1.0;
      case 'ULTRA': return 1.5;
      default: return 1.0;
    }
  }, [qualityTier]);

  // High-performance real-time hand motion event listener (zero React re-render overhead)
  useEffect(() => {
    const handleMotion = (e: Event) => {
      const customEvent = e as CustomEvent<{ x: number; y: number; zoom?: number }>;
      if (customEvent.detail) {
        const { x, y, zoom } = customEvent.detail;
        if (x !== undefined && y !== undefined) {
          targetRotation.current.x = x * Math.PI;
          targetRotation.current.y = y * (Math.PI * 0.5);
        }
        if (zoom !== undefined) {
          targetZoom.current = zoom;
        }
      }
    };
    window.addEventListener('jarvis-hand-motion', handleMotion);
    return () => window.removeEventListener('jarvis-hand-motion', handleMotion);
  }, []);

  // Update rotation from real-time hand coordinates if camera tracking is active
  useEffect(() => {
    if (handX !== undefined && handY !== undefined) {
      targetRotation.current.x = handX * Math.PI;
      targetRotation.current.y = handY * (Math.PI * 0.5);
    }
  }, [handX, handY]);

  // Update dynamic zoom from hand distance
  useEffect(() => {
    if (handZoom !== undefined) {
      targetZoom.current = handZoom;
    }
  }, [handZoom]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03070D);
    scene.fog = new THREE.FogExp2(0x03070D, 0.08);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, currentZoom.current);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityTier === 'ULTRA' ? 2 : 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0x071525, 1.4);
    scene.add(ambientLight);

    const corePointLight = new THREE.PointLight(0x00D9FF, 4.5, 14);
    corePointLight.position.set(0, 0, 0);
    scene.add(corePointLight);

    const topLight = new THREE.DirectionalLight(0xEAFBFF, 1.8);
    topLight.position.set(3, 5, 5);
    scene.add(topLight);

    // 5. Build Procedural Realistic Anatomical Human Brain Geometry
    const densityMult = getQualityMultiplier();
    const brainData = generateBrainStructure(densityMult);

    const brainGroup = new THREE.Group();
    scene.add(brainGroup);

    // A. Add Realistic Anatomical Organic Human Brain Surface Mesh!
    brainGroup.add(brainData.brainSurfaceMesh);

    // B. Add Inner Central Core Reactor Mesh
    brainGroup.add(brainData.coreReactorMesh);

    // C. Add Cortex Point Cloud (High density silhouette)
    const particleMat = new THREE.PointsMaterial({
      color: 0x73EEFF,
      size: 0.025,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    const cortexPoints = new THREE.Points(brainData.cortexPointCloud, particleMat);
    brainGroup.add(cortexPoints);

    // D. Add Active Neural Nodes (Sphere Instances)
    const nodeGeometry = new THREE.SphereGeometry(0.022, 10, 10);
    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: 0x00D9FF,
      emissive: 0x00D9FF,
      emissiveIntensity: 0.95,
      roughness: 0.2,
      metalness: 0.8
    });

    const instancedNodes = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, brainData.nodes.length);
    const dummy = new THREE.Object3D();

    brainData.nodes.forEach((node, idx) => {
      dummy.position.set(...node.position);
      dummy.updateMatrix();
      instancedNodes.setMatrixAt(idx, dummy.matrix);
    });
    instancedNodes.instanceMatrix.needsUpdate = true;
    brainGroup.add(instancedNodes);

    // E. Add Fiber-Optic Synapse Lines with Custom Shader
    const synapseLinesGroup = new THREE.Group();
    brainGroup.add(synapseLinesGroup);

    const lineShaderMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(SynapseLineShader.uniforms),
      vertexShader: SynapseLineShader.vertexShader,
      fragmentShader: SynapseLineShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    brainData.synapseSplines.forEach(spline => {
      const points = spline.getPoints(16);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);

      const progressArr = new Float32Array(points.length);
      const speedArr = new Float32Array(points.length);
      const speed = 0.5 + Math.random() * 1.5;

      for (let k = 0; k < points.length; k++) {
        progressArr[k] = k / (points.length - 1);
        speedArr[k] = speed;
      }

      lineGeo.setAttribute('aProgress', new THREE.BufferAttribute(progressArr, 1));
      lineGeo.setAttribute('aSpeed', new THREE.BufferAttribute(speedArr, 1));

      const line = new THREE.Line(lineGeo, lineShaderMat);
      synapseLinesGroup.add(line);
    });

    // F. Add 4 Concentric Holographic Diagnostic Rings
    const ringsGroup = new THREE.Group();
    scene.add(ringsGroup);

    const ringRadii = [2.7, 3.2, 3.8, 4.4];
    const ringRotSpeeds = [0.15, -0.22, 0.1, -0.3];
    const ringMeshes: THREE.Mesh[] = [];
    const ringMaterials: THREE.ShaderMaterial[] = [];

    ringRadii.forEach((radius, idx) => {
      const ringGeo = new THREE.RingGeometry(radius, radius + 0.04, 128);
      const ringMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0x00D9FF) },
          uSegments: { value: 32.0 + idx * 16.0 },
          uDashRatio: { value: 0.65 },
          uPulseSpeed: { value: 1.0 + idx * 0.4 },
          uAmberState: { value: 0.0 }
        },
        vertexShader: HolographicRingShader.vertexShader,
        fragmentShader: HolographicRingShader.fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });

      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2.2 + (idx * 0.08);
      ringMesh.rotation.y = (idx * 0.15);
      ringsGroup.add(ringMesh);

      ringMeshes.push(ringMesh);
      ringMaterials.push(ringMat);
    });

    // G. Hex Grid Background Plane
    const hexGeo = new THREE.PlaneGeometry(30, 30);
    const hexMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x071525) },
        uGridCyan: { value: new THREE.Color(0x00D9FF) },
        uActiveState: { value: 0.2 }
      },
      vertexShader: HexGridShader.vertexShader,
      fragmentShader: HexGridShader.fragmentShader,
      transparent: true,
      depthWrite: false
    });
    const hexMesh = new THREE.Mesh(hexGeo, hexMat);
    hexMesh.position.z = -5.0;
    scene.add(hexMesh);

    // H. Raycaster
    const raycaster = new THREE.Raycaster();
    const mouseVector = new THREE.Vector2();

    // 6. Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      frameCount++;
      const currentTime = performance.now();
      if (currentTime - lastTime >= 1000) {
        onFpsUpdate(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }

      // Smooth Rotation Interpolation
      currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * 0.08;
      currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * 0.08;

      brainGroup.rotation.y = currentRotation.current.x;
      brainGroup.rotation.x = currentRotation.current.y;

      // Breathing scale animation (98% -> 101% -> 98%)
      const breath = 1.0 + Math.sin(elapsedTime * 1.5) * 0.015;
      brainGroup.scale.set(breath, breath, breath);

      // Camera Zoom Interpolation
      currentZoom.current += (targetZoom.current - currentZoom.current) * 0.08;
      camera.position.z = currentZoom.current;

      // Node Expansion Interpolation (Open Palm gesture)
      currentExpansion.current += (targetExpansion.current - currentExpansion.current) * 0.08;
      lineShaderMat.uniforms.uExpansion.value = currentExpansion.current;

      brainData.nodes.forEach((node, idx) => {
        const factor = 1.0 + currentExpansion.current * 0.45;
        dummy.position.set(
          node.position[0] * factor,
          node.position[1] * factor,
          node.position[2] * factor
        );
        dummy.updateMatrix();
        instancedNodes.setMatrixAt(idx, dummy.matrix);
      });
      instancedNodes.instanceMatrix.needsUpdate = true;

      // Core Reactor rotation
      brainData.coreReactorMesh.rotation.y = elapsedTime * 0.4;
      brainData.coreReactorMesh.rotation.z = elapsedTime * 0.2;

      // Rotate Holographic Rings
      ringMeshes.forEach((ring, idx) => {
        ring.rotation.z = elapsedTime * ringRotSpeeds[idx];
        ring.position.z = (idx - 1.5) * 0.25 * currentExpansion.current;
        ringMaterials[idx].uniforms.uTime.value = elapsedTime;
        ringMaterials[idx].uniforms.uAmberState.value = amberSurge || themeMode === 'COMBAT' ? 1.0 : 0.0;
      });

      // Dynamic Theme Color Mapping (Cyan Arc Reactor, Crimson Gold Combat, Deep Violet Stealth)
      let baseColor = new THREE.Color(0x00D9FF);
      let surgeColor = new THREE.Color(0xFFB84D);

      if (themeMode === 'COMBAT') {
        baseColor = new THREE.Color(0xFF1E38);
        surgeColor = new THREE.Color(0xFFB800);
      } else if (themeMode === 'STEALTH') {
        baseColor = new THREE.Color(0x9933FF);
        surgeColor = new THREE.Color(0x220044);
      }

      lineShaderMat.uniforms.uColor.value.copy(baseColor);
      lineShaderMat.uniforms.uAmberColor.value.copy(surgeColor);
      ringMaterials.forEach((rm) => rm.uniforms.uColor.value.copy(baseColor));

      lineShaderMat.uniforms.uTime.value = elapsedTime;
      lineShaderMat.uniforms.uAmberSurge.value = amberSurge || themeMode === 'COMBAT' ? 1.0 : 0.0;
      hexMat.uniforms.uTime.value = elapsedTime;

      // Raycast Node Hover Check
      raycaster.setFromCamera(mouseVector, camera);
      const intersects = raycaster.intersectObject(instancedNodes);

      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        if (instanceId !== undefined && brainData.nodes[instanceId]) {
          const node = brainData.nodes[instanceId];
          if (hoveredNodeRef.current !== node) {
            hoveredNodeRef.current = node;
            soundManager.playNodePulseSound();

            const worldPos = new THREE.Vector3(...node.position);
            worldPos.applyMatrix4(brainGroup.matrixWorld);
            worldPos.project(camera);

            const screenX = (worldPos.x * 0.5 + 0.5) * width;
            const screenY = (-(worldPos.y * 0.5) + 0.5) * height;

            onNodeSelect({
              nodeId: node.id,
              label: node.label,
              layer: node.layer,
              screenPos: { x: screenX, y: screenY },
              synapseCount: node.connectedTo.length,
              loadRate: `${(node.activity * 100).toFixed(1)}%`
            });
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. Event Listeners
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseVector.x = (e.clientX / width) * 2 - 1;
      mouseVector.y = -(e.clientY / height) * 2 + 1;

      if (isDraggingRef.current) {
        const deltaX = e.clientX - previousMousePosition.current.x;
        const deltaY = e.clientY - previousMousePosition.current.y;

        targetRotation.current.x += deltaX * 0.008;
        targetRotation.current.y += deltaY * 0.008;

        previousMousePosition.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      targetZoom.current = THREE.MathUtils.clamp(targetZoom.current + e.deltaY * 0.003, 3.5, 10.0);
    };

    // Touch support for Mobile / Tablets (Touch rotation & Pinch-to-zoom)
    let lastTouchDistance = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        lastTouchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDraggingRef.current) {
        const deltaX = e.touches[0].clientX - previousMousePosition.current.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.current.y;

        targetRotation.current.x += deltaX * 0.008;
        targetRotation.current.y += deltaY * 0.008;

        previousMousePosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2 && lastTouchDistance > 0) {
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const pinchDelta = (lastTouchDistance - currentDist) * 0.012;
        targetZoom.current = THREE.MathUtils.clamp(targetZoom.current + pinchDelta, 3.5, 10.0);
        lastTouchDistance = currentDist;
      }
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
      lastTouchDistance = 0;
    };

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const handleClick = (e: MouseEvent) => {
      mouseVector.x = (e.clientX / width) * 2 - 1;
      mouseVector.y = -(e.clientY / height) * 2 + 1;
      raycaster.setFromCamera(mouseVector, camera);
      const intersects = raycaster.intersectObject(instancedNodes);

      if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;
        if (instanceId !== undefined && brainData.nodes[instanceId]) {
          const node = brainData.nodes[instanceId];
          soundManager.playQuerySentSound();

          const worldPos = new THREE.Vector3(...node.position);
          worldPos.applyMatrix4(brainGroup.matrixWorld);
          worldPos.project(camera);

          const screenX = (worldPos.x * 0.5 + 0.5) * width;
          const screenY = (-(worldPos.y * 0.5) + 0.5) * height;

          onNodeSelect({
            nodeId: node.id,
            label: node.label,
            layer: node.layer,
            screenPos: { x: screenX, y: screenY },
            synapseCount: node.connectedTo.length,
            loadRate: `${(node.activity * 100).toFixed(1)}%`
          });
        }
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    dom.addEventListener('click', handleClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: true });
    dom.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      dom.removeEventListener('mousedown', handleMouseDown);
      dom.removeEventListener('click', handleClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('wheel', handleWheel);
      dom.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [qualityTier, getQualityMultiplier, onFpsUpdate, onNodeSelect, amberSurge, themeMode]);

  useEffect(() => {
    switch (gesture) {
      case 'FIST':
        targetRotation.current.x += Math.PI * 0.5;
        soundManager.playRotationSound();
        break;
      case 'OPEN_PALM':
        targetExpansion.current = targetExpansion.current === 0 ? 1.0 : 0.0;
        soundManager.playExpansionSound();
        break;
      case 'PINCH': {
        const isCurrentlyZoomedIn = targetZoom.current < 5.2;
        targetZoom.current = isCurrentlyZoomedIn ? 6.5 : 3.8;
        soundManager.playZoomSound(!isCurrentlyZoomedIn);
        break;
      }
      case 'POINT':
        soundManager.playNodePulseSound();
        // Automatically select and decode front neuron
        onNodeSelect({
          nodeId: 'node_042',
          label: 'FRONTAL_SYNAPSE_GATE_V4',
          layer: 'FRONTAL',
          screenPos: { x: 340, y: 220 },
          synapseCount: 4,
          loadRate: '98.4%'
        });
        break;
      default:
        break;
    }
  }, [gesture, onNodeSelect]);

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
