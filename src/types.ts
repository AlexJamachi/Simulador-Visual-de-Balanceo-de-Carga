// ============================================================
// Types & Interfaces for the Load Balancer Simulator
// ============================================================

export interface Vec2 {
  x: number;
  y: number;
}

export interface ServerNode {
  id: number;
  label: string;
  position: Vec2;
  isActive: boolean; // For dynamic topology (simulate offline)
  currentLoad: number;
  maxCapacity: number;
  processingSpeed: number;
  resolvedCount: number;
  droppedCount: number;
  /** Processing slots – each entry is the remaining time (ms) for that request */
  processingQueue: number[];
  /** Visual pulse animation timer */
  pulsePhase: number;
}

export type PacketType = 'light' | 'normal' | 'heavy';

export interface Packet {
  id: number;
  type: PacketType;
  /** Processing time in ms needed on the server */
  weight: number;
  /** Normalised 0→1 progress along the cable */
  progress: number;
  /** Index of the target server (-1 if all servers down) */
  targetServer: number;
  /** Start position (load balancer) */
  from: Vec2;
  /** End position (server node) */
  to: Vec2;
  /** Speed in progress-units per millisecond */
  speed: number;
  /** Trail positions for glow effect */
  trail: Vec2[];
  /** Hue for colour variation */
  hue: number;
}

export type AlgorithmMode = 'round-robin' | 'nash';

export interface HistoricalDataPoint {
  time: number;
  processedRate: number; // packets per second at this snapshot
  droppedRate: number;
  algorithm: AlgorithmMode;
  stdDevLoad: number;
  packetsPerSecond: number;
  totalProcessed: number;
  totalDropped: number;
}

export interface AlgoStats {
  processed: number;
  dropped: number;
  stdDevHistory: number[];
}

export interface SimulationState {
  servers: ServerNode[];
  packets: Packet[];
  algorithm: AlgorithmMode;
  packetsPerSecond: number;
  totalProcessed: number;
  totalDropped: number;
  nextPacketId: number;
  roundRobinIndex: number;
  /** Accumulator for packet spawning (ms) */
  spawnAccumulator: number;
  /** Time of simulation in ms */
  simulationTime: number;
  /** Historical data for charts */
  history: HistoricalDataPoint[];
  /** Used to calculate rates */
  lastHistoryTime: number;
  lastProcessedCount: number;
  lastDroppedCount: number;
  loadStdDev: number;
  rrStats: AlgoStats;
  nashStats: AlgoStats;
  isStressTesting: boolean;
}

export interface SimulationStats {
  totalProcessed: number;
  totalDropped: number;
  serverLoads: number[];
  serverStatus: boolean[];
  serverCapacities: number[];
  serverSpeeds: number[];
  inFlightCounts: number[];
  serverQueues: number[][];
  algorithm: AlgorithmMode;
  packetsPerSecond: number;
  history: HistoricalDataPoint[];
  roundRobinIndex: number;
  loadStdDev: number;
  rrStats: AlgoStats;
  nashStats: AlgoStats;
  simulationTime: number;
}
