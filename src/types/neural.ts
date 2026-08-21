export type GestureType = 'NONE' | 'FIST' | 'OPEN_PALM' | 'POINT' | 'PINCH';

export type QualityTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export type SystemThemeMode = 'CYAN' | 'COMBAT' | 'STEALTH' | 'AMBER';

export interface SystemStatus {
  online: boolean;
  synapticLoad: number;
  bandwidthTbps: number;
  activeSynapses: number;
  temperatureCelsius: number;
  processingState: 'OPTIMAL' | 'ANALYZING' | 'SYNCHRONIZING' | 'AMBER_SURGE' | 'COMBAT_ACTIVE' | 'STEALTH_MODE' | 'CRITICAL';
  fps: number;
  themeMode?: SystemThemeMode;
}

export interface BatteryStatus {
  level: number; // 0 to 100
  charging: boolean;
  chargingTime?: number;
  dischargingTime?: number;
  supported: boolean;
}

export interface WeatherStatus {
  temperature: number;
  condition: string;
  windSpeed: number;
  humidity?: number;
  city: string;
  isDay?: boolean;
}

export interface ActiveTimer {
  id: string;
  durationSec: number;
  remainingSec: number;
  label: string;
  isRunning: boolean;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  category: string;
  isPlaying: boolean;
}

export interface NeuralNode {
  id: string;
  position: [number, number, number];
  layer: 'FRONTAL' | 'TEMPORAL' | 'PARIETAL' | 'OCCIPITAL' | 'CORE';
  label: string;
  activity: number;
  connectedTo: string[];
}

export interface ActiveCallout {
  nodeId: string;
  label: string;
  layer: string;
  screenPos: { x: number; y: number };
  synapseCount: number;
  loadRate: string;
  quantumMemoryHex?: string[];
  tensorOperations?: string[];
  voltageThreshold?: string;
  entangledNodes?: string[];
}

export interface TerminalMessage {
  id: string;
  timestamp: string;
  sender: 'SYSTEM' | 'USER' | 'NEURAL_CORE';
  text: string;
  type?: 'normal' | 'highlight' | 'warning' | 'amber';
}
