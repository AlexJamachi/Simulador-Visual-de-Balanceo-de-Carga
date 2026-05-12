import React, { useRef, useState, useCallback } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import ControlPanel from './components/ControlPanel';
import FormulaPanel from './components/FormulaPanel';
import { SimulationState, SimulationStats, AlgorithmMode } from './types';
import { createInitialState } from './simulation';

const DEFAULT_W = 900;
const DEFAULT_H = 600;

function App() {
  const stateRef = useRef<SimulationState>(createInitialState(DEFAULT_W, DEFAULT_H));

  const [stats, setStats] = useState<SimulationStats>({
    totalProcessed: 0,
    totalDropped: 0,
    serverLoads: [0, 0, 0, 0],
    serverStatus: [true, true, true, true],
    serverCapacities: [150, 80, 120, 200],
    serverSpeeds: [1.2, 0.8, 1.0, 1.5],
    inFlightCounts: [0, 0, 0, 0],
    serverQueues: [[], [], [], []],
    algorithm: 'round-robin',
    packetsPerSecond: 10,
    history: [],
    roundRobinIndex: 0,
  });

  const [showFormulas, setShowFormulas] = useState(false);

  const handleStatsUpdate = useCallback(() => {
    const s = stateRef.current;
    setStats({
      totalProcessed: s.totalProcessed,
      totalDropped: s.totalDropped,
      serverLoads: s.servers.map(srv => (srv.currentLoad / srv.maxCapacity) * 100),
      serverStatus: s.servers.map(srv => srv.isActive),
      serverCapacities: s.servers.map(srv => srv.maxCapacity),
      serverSpeeds: s.servers.map(srv => srv.processingSpeed),
      inFlightCounts: s.servers.map((_, i) => s.packets.filter(p => p.targetServer === i).length),
      serverQueues: s.servers.map(srv => [...srv.processingQueue]),
      algorithm: s.algorithm,
      packetsPerSecond: s.packetsPerSecond,
      history: [...s.history], // Shallow copy to trigger re-render
      roundRobinIndex: s.roundRobinIndex,
    });
  }, []);

  const handleTrafficChange = useCallback((pps: number) => {
    stateRef.current.packetsPerSecond = pps;
  }, []);

  const handleAlgorithmChange = useCallback((mode: AlgorithmMode) => {
    stateRef.current.algorithm = mode;
  }, []);

  const handleToggleServer = useCallback((id: number) => {
    const srv = stateRef.current.servers[id];
    if (srv) {
      srv.isActive = !srv.isActive;
      // Force an immediate stats update so UI responds fast
      handleStatsUpdate();
    }
  }, [handleStatsUpdate]);

  const handleReset = useCallback(() => {
    const canvas = document.getElementById('simulation-canvas') as HTMLCanvasElement | null;
    const w = canvas?.parentElement?.getBoundingClientRect().width ?? DEFAULT_W;
    const h = canvas?.parentElement?.getBoundingClientRect().height ?? DEFAULT_H;
    const newState = createInitialState(w, h);
    // Preserve user settings
    newState.algorithm = stateRef.current.algorithm;
    newState.packetsPerSecond = stateRef.current.packetsPerSecond;
    Object.assign(stateRef.current, newState);
    handleStatsUpdate();
  }, [handleStatsUpdate]);

  return (
    <div className="app-layout" id="app-root">
      <SimulationCanvas stateRef={stateRef} onStatsUpdate={handleStatsUpdate} />
      <FormulaPanel stats={stats} visible={showFormulas} onClose={() => setShowFormulas(false)} />
      <ControlPanel
        stats={stats}
        showFormulas={showFormulas}
        onToggleFormulas={() => setShowFormulas(!showFormulas)}
        onTrafficChange={handleTrafficChange}
        onAlgorithmChange={handleAlgorithmChange}
        onToggleServer={handleToggleServer}
        onReset={handleReset}
      />
    </div>
  );
}

export default App;
