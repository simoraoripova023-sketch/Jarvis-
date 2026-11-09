import * as THREE from 'three';
import { NeuralNode } from '../../types/neural';

export interface GeneratedBrainData {
  nodes: NeuralNode[];
  nodePositions: Float32Array;
  synapseSplines: THREE.CatmullRomCurve3[];
  cortexPointCloud: THREE.BufferGeometry;
  brainSurfaceMesh: THREE.Mesh;
  coreReactorMesh: THREE.Mesh;
}

/**
 * Procedurally generates realistic anatomical human brain geometry:
 * - Left & Right Cerebral Hemispheres with gyri/sulci convolutions
 * - Cerebellum (Miyacha) with horizontal folia ridges
 * - Brainstem (Miya ustuni) extending downward
 * - Dense cortical nodes & fiber-optic Catmull-Rom splines
 */
export function generateBrainStructure(nodeDensityMultiplier: number = 1.0): GeneratedBrainData {
  const nodes: NeuralNode[] = [];
  const rawNodePositions: number[] = [];

  // 1. ANATOMICAL HUMAN BRAIN SURFACE DISPLACEMENT FUNCTION
  // Evaluates 3D radius & offset to form gyri (folds) and sulci (grooves)
  const getBrainRadius = (x: number, y: number, z: number): number => {
    // Normalised direction
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len === 0) return 1.0;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    // Base Anatomical Brain Dimensions (X: width, Y: height, Z: length)
    // Human brain is elongated in Z, wide in X, curved in Y
    let baseR = 1.8;

    // Spherical angles
    const theta = Math.atan2(nx, nz); // horizontal angle (-PI to PI)
    const phi = Math.acos(ny);         // vertical angle (0 to PI)

    // Multi-harmonic gyri/sulci brain surface folds
    const gyriFolds = 0.14 * Math.sin(16.0 * theta) * Math.cos(16.0 * phi) +
                      0.08 * Math.cos(24.0 * theta + 12.0 * phi) +
                      0.04 * Math.sin(32.0 * phi);

    return baseR + gyriFolds;
  };

  // 2. GENERATE ANATOMICAL HUMAN BRAIN SURFACE MESH GEOMETRY
  const brainMeshGeo = new THREE.SphereGeometry(1.6, 64, 64);
  const posAttr = brainMeshGeo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < posAttr.count; i++) {
    let px = posAttr.getX(i);
    let py = posAttr.getY(i);
    let pz = posAttr.getZ(i);

    const isLeft = px < 0;
    const signX = isLeft ? -1 : 1;

    // Cerebral Hemisphere Deformation
    // Stretch Z (frontal to occipital), scale Y, split X for longitudinal fissure
    let r = getBrainRadius(px, py, pz);

    px = signX * (Math.abs(px) * 0.95 + 0.12); // Longitudinal fissure split gap
    py = py * 0.88;
    pz = pz * 1.35; // Frontal-Occipital length extension

    // Flatten bottom base of cerebral cortex
    if (py < -0.2 && Math.abs(px) < 1.0 && pz > -0.6) {
      py *= 0.75;
    }

    // Indent longitudinal fissure along top center (x ~ 0)
    if (Math.abs(px) < 0.35) {
      py -= 0.15 * (1.0 - Math.abs(px) / 0.35);
    }

    // Apply Gyri Surface Convolutions
    const scale = r / 1.6;
    posAttr.setXYZ(i, px * scale, py * scale, pz * scale);
  }

  brainMeshGeo.computeVertexNormals();

  // Create Translucent Glowing Organic Cybermatic Brain Surface Mesh
  const brainSurfaceMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x071525),
    emissive: new THREE.Color(0x00D9FF),
    emissiveIntensity: 0.35,
    roughness: 0.3,
    metalness: 0.7,
    wireframe: true,
    transparent: true,
    opacity: 0.28
  });
  const brainSurfaceMesh = new THREE.Mesh(brainMeshGeo, brainSurfaceMat);

  // 3. GENERATE CEREBELLUM (Miyacha) GEOMETRY AT POSTERIOR INFERIOR REGION
  const cerebellumGeo = new THREE.SphereGeometry(0.65, 32, 32);
  const cerPos = cerebellumGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cerPos.count; i++) {
    let cx = cerPos.getX(i) * 1.25;
    let cy = cerPos.getY(i) * 0.75 - 0.75; // Shift down
    let cz = cerPos.getZ(i) * 0.85 - 1.1;  // Shift back

    // Horizontal folia ridges
    const folia = 0.04 * Math.sin(36.0 * cy);
    cerPos.setXYZ(i, cx + folia, cy + folia, cz + folia);
  }
  cerebellumGeo.computeVertexNormals();
  const cerebellumMesh = new THREE.Mesh(cerebellumGeo, brainSurfaceMat);
  brainSurfaceMesh.add(cerebellumMesh);

  // 4. GENERATE BRAIN STEM (Miya ustuni) CYLINDER
  const brainstemGeo = new THREE.CylinderGeometry(0.28, 0.18, 1.1, 24);
  brainstemGeo.translate(0, -1.25, -0.3);
  const brainstemMesh = new THREE.Mesh(brainstemGeo, brainSurfaceMat);
  brainSurfaceMesh.add(brainstemMesh);

  // 5. GENERATE HIGH DENSITY CORTICAL NODES ALONG BRAIN SURFACES
  const baseNodeCount = Math.floor(280 * nodeDensityMultiplier);
  const posCount = posAttr.count;

  for (let i = 0; i < baseNodeCount; i++) {
    // Pick random vertex on the brain surface mesh
    const vIdx = Math.floor(Math.random() * posCount);
    const vx = posAttr.getX(vIdx);
    const vy = posAttr.getY(vIdx);
    const vz = posAttr.getZ(vIdx);

    // Anatomical Lobe Layer Mapping based on 3D spatial region
    let layer: 'FRONTAL' | 'TEMPORAL' | 'PARIETAL' | 'OCCIPITAL' | 'CORE' = 'FRONTAL';
    if (vz > 0.7) {
      layer = 'FRONTAL';
    } else if (vz < -0.7) {
      layer = 'OCCIPITAL';
    } else if (vy < -0.2) {
      layer = 'TEMPORAL';
    } else {
      layer = 'PARIETAL';
    }

    if (Math.random() < 0.08) {
      layer = 'CORE';
    }

    const nodeId = `node_${i.toString().padStart(3, '0')}`;
    const labels = [
      'CORTEX_ALPHA', 'SYNAPSE_GATE', 'NEURO_VECTOR', 'AXON_HUB',
      'QUANTUM_MATRIX', 'TENSOR_CORE', 'LOGIC_CLUSTER', 'MEM_NODE'
    ];
    let label = `${layer}_${labels[i % labels.length]}`;
    if (layer === 'FRONTAL' && i % 3 === 0) {
      label = `KUNLIK_REJA_SEKTORI_${i}`;
    }

    nodes.push({
      id: nodeId,
      position: [vx, vy, vz],
      layer,
      label,
      activity: 0.4 + Math.random() * 0.6,
      connectedTo: []
    });

    rawNodePositions.push(vx, vy, vz);
  }

  // 6. FIBER-OPTIC SYNAPSE SPLINE CONNECTIONS
  const synapseSplines: THREE.CatmullRomCurve3[] = [];
  const maxConn = 3;

  for (let i = 0; i < nodes.length; i++) {
    const nodeA = nodes[i];
    const posA = new THREE.Vector3(...nodeA.position);

    const distances: { index: number; dist: number }[] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const posB = new THREE.Vector3(...nodes[j].position);
      const dist = posA.distanceTo(posB);
      if (dist < 1.6) {
        distances.push({ index: j, dist });
      }
    }

    distances.sort((a, b) => a.dist - b.dist);
    const targets = distances.slice(0, maxConn);

    targets.forEach(target => {
      const nodeB = nodes[target.index];
      nodeA.connectedTo.push(nodeB.id);

      const posB = new THREE.Vector3(...nodeB.position);
      const midPoint = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);

      // Curve through corpus callosum or surface arc
      midPoint.multiplyScalar(0.92);

      const spline = new THREE.CatmullRomCurve3([posA, midPoint, posB]);
      synapseSplines.push(spline);
    });
  }

  // 7. CORTEX HIGH-DENSITY POINT CLOUD
  const pointCount = Math.floor(5500 * nodeDensityMultiplier);
  const particlePositions = new Float32Array(pointCount * 3);
  const particleSizes = new Float32Array(pointCount);

  for (let i = 0; i < pointCount; i++) {
    const vIdx = Math.floor(Math.random() * posCount);
    // Add subtle jitter around surface
    const jitter = 0.05;
    particlePositions[i * 3] = posAttr.getX(vIdx) + (Math.random() - 0.5) * jitter;
    particlePositions[i * 3 + 1] = posAttr.getY(vIdx) + (Math.random() - 0.5) * jitter;
    particlePositions[i * 3 + 2] = posAttr.getZ(vIdx) + (Math.random() - 0.5) * jitter;
    particleSizes[i] = 1.0 + Math.random() * 2.5;
  }

  const cortexPointCloud = new THREE.BufferGeometry();
  cortexPointCloud.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  cortexPointCloud.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

  // 8. INNER CORE REACTOR MESH
  const coreGeometry = new THREE.IcosahedronGeometry(0.5, 3);
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x00D9FF),
    emissive: new THREE.Color(0x00D9FF),
    emissiveIntensity: 0.9,
    roughness: 0.1,
    metalness: 0.9,
    wireframe: true,
    transparent: true,
    opacity: 0.5
  });

  const coreReactorMesh = new THREE.Mesh(coreGeometry, coreMaterial);

  return {
    nodes,
    nodePositions: new Float32Array(rawNodePositions),
    synapseSplines,
    cortexPointCloud,
    brainSurfaceMesh,
    coreReactorMesh
  };
}
