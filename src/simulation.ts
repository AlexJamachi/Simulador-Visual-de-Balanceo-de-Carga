// ============================================================
// Simulation Engine – pure logic, no rendering
// ============================================================

import type { SimulationState, ServerNode, Packet, AlgorithmMode, Vec2, PacketType } from './types';

/** Packet travel speed (progress-units per ms). 1.0 = full cable length */
const PACKET_SPEED = 0.0008;

// ── Layout positions (will be recalculated on canvas resize) ──────────────

export function computeLayout(canvasW: number, canvasH: number) {
  const lbPos: Vec2 = { x: canvasW * 0.15, y: canvasH * 0.5 };

  const serverPositions: Vec2[] = [];
  const count = 4;
  const startY = canvasH * 0.15;
  const endY = canvasH * 0.85;
  const step = (endY - startY) / (count - 1);
  for (let i = 0; i < count; i++) {
    serverPositions.push({ x: canvasW * 0.82, y: startY + step * i });
  }

  return { lbPos, serverPositions };
}

// ── Factory ──────────────────────────────────────────────────────────────

export function createInitialState(canvasW: number, canvasH: number): SimulationState {
  const { serverPositions } = computeLayout(canvasW, canvasH);

  const servers: ServerNode[] = serverPositions.map((pos, i) => ({
    id: i,
    label: `SRV-${String(i + 1).padStart(2, '0')}`,
    position: pos,
    isActive: true, // Start online
    currentLoad: 0,
    maxCapacity: 100,
    resolvedCount: 0,
    droppedCount: 0,
    processingQueue: [],
    pulsePhase: Math.random() * Math.PI * 2,
  }));

  return {
    servers,
    packets: [],
    algorithm: 'round-robin',
    packetsPerSecond: 10,
    totalProcessed: 0,
    totalDropped: 0,
    nextPacketId: 0,
    roundRobinIndex: 0,
    spawnAccumulator: 0,
    simulationTime: 0,
    history: [],
    lastHistoryTime: 0,
    lastProcessedCount: 0,
    lastDroppedCount: 0,
  };
}

// ── Algorithm selection ──────────────────────────────────────────────────

function selectServerRoundRobin(state: SimulationState): number {
  const activeServers = state.servers.filter(s => s.isActive);
  if (activeServers.length === 0) return -1;

  // Find the next active server sequentially
  for (let i = 0; i < state.servers.length; i++) {
    const idx = (state.roundRobinIndex + i) % state.servers.length;
    if (state.servers[idx].isActive) {
      state.roundRobinIndex = idx + 1;
      return idx;
    }
  }
  return -1;
}

function selectServerNash(state: SimulationState): number {
  let bestIdx = -1;
  let bestRatio = Infinity;
  
  for (let i = 0; i < state.servers.length; i++) {
    const s = state.servers[i];
    if (!s.isActive) continue;

    // Factor in packets currently in-flight targeting this server
    const inFlight = state.packets.filter(p => p.targetServer === i).length;
    const effectiveLoad = (s.currentLoad + inFlight) / s.maxCapacity;
    if (effectiveLoad < bestRatio) {
      bestRatio = effectiveLoad;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function selectServer(state: SimulationState): number {
  return state.algorithm === 'round-robin'
    ? selectServerRoundRobin(state)
    : selectServerNash(state);
}

// ── Spawn packets ────────────────────────────────────────────────────────

function getPacketAttributes(): { type: PacketType, weight: number, hue: number } {
  const rand = Math.random();
  if (rand < 0.2) {
    // Light packet (20% chance) - Fast to process, green/blue hue
    return { type: 'light', weight: 800, hue: 150 + Math.random() * 30 };
  } else if (rand < 0.8) {
    // Normal packet (60% chance) - Normal processing, cyan hue
    return { type: 'normal', weight: 2000, hue: 180 + Math.random() * 30 };
  } else {
    // Heavy packet (20% chance) - Slow to process, purple/magenta hue
    return { type: 'heavy', weight: 6000, hue: 280 + Math.random() * 40 };
  }
}

function spawnPacket(state: SimulationState, lbPos: Vec2): void {
  const targetIdx = selectServer(state);
  
  const { type, weight, hue } = getPacketAttributes();

  const packet: Packet = {
    id: state.nextPacketId++,
    type,
    weight,
    progress: 0,
    targetServer: targetIdx,
    from: { ...lbPos },
    to: targetIdx !== -1 ? { ...state.servers[targetIdx].position } : { x: lbPos.x + 100, y: lbPos.y },
    speed: PACKET_SPEED,
    trail: [],
    hue,
  };

  state.packets.push(packet);
}

// ── Tick ──────────────────────────────────────────────────────────────────

export function tickSimulation(state: SimulationState, dt: number, canvasW: number, canvasH: number): void {
  const { lbPos, serverPositions } = computeLayout(canvasW, canvasH);
  
  state.simulationTime += dt;

  // Record history every 1 second (1000ms)
  if (state.simulationTime - state.lastHistoryTime >= 1000) {
    const elapsedSec = (state.simulationTime - state.lastHistoryTime) / 1000;
    const procRate = (state.totalProcessed - state.lastProcessedCount) / elapsedSec;
    const dropRate = (state.totalDropped - state.lastDroppedCount) / elapsedSec;
    
    state.history.push({
      time: Math.floor(state.simulationTime / 1000),
      processedRate: procRate,
      droppedRate: dropRate
    });
    
    // Keep last 60 seconds
    if (state.history.length > 60) state.history.shift();
    
    state.lastHistoryTime = state.simulationTime;
    state.lastProcessedCount = state.totalProcessed;
    state.lastDroppedCount = state.totalDropped;
  }

  // Update server positions (handle resize)
  for (let i = 0; i < state.servers.length; i++) {
    state.servers[i].position = serverPositions[i];
  }

  // ── Spawn new packets ──
  const spawnInterval = state.packetsPerSecond > 0 ? 1000 / state.packetsPerSecond : Infinity;
  state.spawnAccumulator += dt;
  while (state.spawnAccumulator >= spawnInterval && state.packetsPerSecond > 0) {
    spawnPacket(state, lbPos);
    state.spawnAccumulator -= spawnInterval;
  }

  // ── Move packets ──
  const arrivedIndices: number[] = [];
  for (let i = 0; i < state.packets.length; i++) {
    const p = state.packets[i];
    
    // Handle dropped-at-source (no active servers)
    if (p.targetServer === -1) {
      p.progress += p.speed * dt * 2; // move fast then die
      if (p.progress >= 0.2) arrivedIndices.push(i);
      continue;
    }

    // Update from/to in case of resize
    p.from = { ...lbPos };
    p.to = { ...state.servers[p.targetServer].position };

    p.progress += p.speed * dt;

    // Store trail
    const cx = p.from.x + (p.to.x - p.from.x) * p.progress;
    const cy = p.from.y + (p.to.y - p.from.y) * p.progress;
    p.trail.push({ x: cx, y: cy });
    if (p.trail.length > 8) p.trail.shift();

    if (p.progress >= 1) {
      arrivedIndices.push(i);
    }
  }

  // ── Handle arrivals (reverse order to avoid index shifts) ──
  for (let i = arrivedIndices.length - 1; i >= 0; i--) {
    const pktIdx = arrivedIndices[i];
    const pkt = state.packets[pktIdx];
    
    if (pkt.targetServer === -1) {
      // Dropped because no servers available
      state.totalDropped++;
    } else {
      const srv = state.servers[pkt.targetServer];
      
      // If server went offline while packet was in transit, drop it
      if (!srv.isActive) {
        state.totalDropped++;
        srv.droppedCount++;
      }
      else if (srv.currentLoad < srv.maxCapacity) {
        srv.currentLoad++;
        srv.processingQueue.push(pkt.weight);
        state.totalProcessed++;
        srv.resolvedCount++;
      } else {
        // Server full → packet dropped
        state.totalDropped++;
        srv.droppedCount++;
      }
    }

    state.packets.splice(pktIdx, 1);
  }

  // ── Process server queues ──
  for (const srv of state.servers) {
    if (!srv.isActive) {
      // If offline, flush queue and reset load
      srv.processingQueue = [];
      srv.currentLoad = 0;
      continue;
    }
    
    const completed: number[] = [];
    for (let j = 0; j < srv.processingQueue.length; j++) {
      srv.processingQueue[j] -= dt;
      if (srv.processingQueue[j] <= 0) {
        completed.push(j);
      }
    }
    // Remove completed (reverse)
    for (let j = completed.length - 1; j >= 0; j--) {
      srv.processingQueue.splice(completed[j], 1);
    }
    srv.currentLoad = srv.processingQueue.length;

    // Update pulse
    srv.pulsePhase += dt * 0.003;
  }
}
