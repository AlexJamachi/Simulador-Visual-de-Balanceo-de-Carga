import React from 'react';
import type { SimulationStats, AlgorithmMode } from '../types';
import { HistoryChart } from './HistoryChart';
import { InfoModal } from './InfoModal';

interface ControlPanelProps {
  stats: SimulationStats;
  onTrafficChange: (pps: number) => void;
  onAlgorithmChange: (mode: AlgorithmMode) => void;
  onToggleServer: (id: number) => void;
  onReset: (preserveStats?: boolean) => void;
  onSetStressMode: (active: boolean) => void;
  showFormulas: boolean;
  onToggleFormulas: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  stats,
  onTrafficChange,
  onAlgorithmChange,
  onToggleServer,
  onReset,
  onSetStressMode,
  showFormulas,
  onToggleFormulas,
}) => {
  const isNash = stats.algorithm === 'nash';

  const [stressStartSimTime, setStressStartSimTime] = React.useState<number | null>(null);
  const [showResults, setShowResults] = React.useState(false);
  const [infoModalAlgo, setInfoModalAlgo] = React.useState<'round-robin' | 'nash' | null>(null);

  const handleExportCSV = React.useCallback(() => {
    const header = "tiempo_s,algoritmo,procesados,perdidos,drop_rate_pct,std_dev_carga,paquetes_por_segundo\n";
    const rows = stats.history.map(h => {
      const dropRatePct = (h.totalProcessed + h.totalDropped) > 0 
        ? ((h.totalDropped / (h.totalProcessed + h.totalDropped)) * 100).toFixed(2) 
        : '0.00';
      return `${h.time},${h.algorithm},${h.totalProcessed},${h.totalDropped},${dropRatePct},${h.stdDevLoad?.toFixed(4)},${h.packetsPerSecond}`;
    });
    const csvContent = header + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulacion_balanceo_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [stats.history]);

  const startStressTest = () => {
    if (stressStartSimTime !== null) return;
    setShowResults(true);
    onAlgorithmChange('round-robin');
    onReset(false); // Full reset
    onSetStressMode(true); // START tracking stats!
    setStressStartSimTime(stats.simulationTime); // This will actually be 0 since we just reset
    // Initial jump to start the test visually
    onTrafficChange(20);
  };

  React.useEffect(() => {
    if (stressStartSimTime === null) return;
    
    // Elapsed time in seconds based on actual simulation time (not real time)
    const elapsed = Math.floor((stats.simulationTime - stressStartSimTime) / 1000);
    
    if (elapsed === 30 && stats.algorithm !== 'nash') {
      onAlgorithmChange('nash');
      onReset(true); // reset queues but preserve rrStats & history
    }

    const phaseTime = elapsed % 30;
    
    if (phaseTime <= 5 && phaseTime > 0) onTrafficChange(20);
    else if (phaseTime <= 15 && phaseTime > 5) onTrafficChange(80);
    else if (phaseTime <= 25 && phaseTime > 15) onTrafficChange(180);
    else if (phaseTime === 0 || phaseTime > 25) onTrafficChange(20);
    
    if (elapsed >= 60) {
      setStressStartSimTime(null);
      onSetStressMode(false); // STOP tracking stats
      onTrafficChange(0); // Reset traffic to 0
    }
  }, [stressStartSimTime, stats.simulationTime, stats.algorithm, onTrafficChange, onAlgorithmChange, onReset, onSetStressMode]); 

  // the UI counter
  const stressTime = stressStartSimTime !== null ? Math.floor((stats.simulationTime - stressStartSimTime) / 1000) : null;

  const dropRatePct = stats.totalProcessed + stats.totalDropped > 0 
    ? (stats.totalDropped / (stats.totalProcessed + stats.totalDropped)) * 100 
    : 0;
  const dropColor = dropRatePct < 5 ? 'green' : dropRatePct <= 15 ? 'yellow' : 'red';

  const getAvgStdDev = (history: number[]) => history.length ? history.reduce((a, b) => a + b, 0) / history.length : 0;
  const rrDrop = stats.rrStats.processed + stats.rrStats.dropped > 0 ? (stats.rrStats.dropped / (stats.rrStats.processed + stats.rrStats.dropped)) * 100 : 0;
  const nashDrop = stats.nashStats.processed + stats.nashStats.dropped > 0 ? (stats.nashStats.dropped / (stats.nashStats.processed + stats.nashStats.dropped)) * 100 : 0;
  const rrAvgDev = getAvgStdDev(stats.rrStats.stdDevHistory);
  const nashAvgDev = getAvgStdDev(stats.nashStats.stdDevHistory);

  return (
    <aside className="control-panel" id="control-panel">
      {/* ── Header ── */}
      <div className="panel-header">
        <div className="panel-logo">
          <span className="logo-icon">◈</span>
          <div>
            <h1>NETBALANCER</h1>
            <p className="panel-subtitle">Simulador de Balanceo de Carga</p>
          </div>
        </div>
      </div>

      {/* ── Packet Legend ── */}
      <div className="packet-legend">
        <span className="legend-item"><span className="dot dot-light"></span>Ligero (0.8s)</span>
        <span className="legend-item"><span className="dot dot-normal"></span>Normal (2s)</span>
        <span className="legend-item"><span className="dot dot-heavy"></span>Pesado (6s)</span>
      </div>

      {/* ── Traffic Control ── */}
      <section className="panel-section" id="traffic-control-section">
        <div className="section-header">
          <span className="section-icon">⟁</span>
          <h2>Inyección de Tráfico</h2>
        </div>
        <div className="traffic-display">
          <span className="traffic-value" id="traffic-value">{stats.packetsPerSecond}</span>
          <span className="traffic-unit">paquetes/s</span>
        </div>
        <input
          type="range"
          id="traffic-slider"
          className="cyber-slider"
          min="0"
          max="200"
          step="1"
          value={stats.packetsPerSecond}
          onChange={(e) => onTrafficChange(Number(e.target.value))}
        />
        <div className="slider-labels">
          <span>Inactivo</span>
          <span>Normal</span>
          <span className="label-danger">DDoS</span>
        </div>
        <div className="traffic-indicator">
          {stats.packetsPerSecond <= 30 && (
            <span className="indicator-badge badge-green">● Tráfico Normal</span>
          )}
          {stats.packetsPerSecond > 30 && stats.packetsPerSecond <= 100 && (
            <span className="indicator-badge badge-yellow">● Tráfico Alto</span>
          )}
          {stats.packetsPerSecond > 100 && (
            <span className="indicator-badge badge-red">⚠ Pico Masivo / DDoS</span>
          )}
        </div>
      </section>

      {/* ── Algorithm Toggle ── */}
      <section className="panel-section" id="algorithm-section">
        <div className="section-header">
          <span className="section-icon">⎔</span>
          <h2>Algoritmo Activo</h2>
        </div>
        <div className="algorithm-toggle">
          <button
            id="btn-round-robin"
            className={`algo-btn ${!isNash ? 'active' : ''}`}
            onClick={() => onAlgorithmChange('round-robin')}
          >
            <span className="algo-icon">↻</span>
            <div>
              <strong>Round Robin <span onClick={(e) => { e.stopPropagation(); setInfoModalAlgo('round-robin'); }} title="Ver información de Round Robin" style={{ cursor: 'pointer', color: 'var(--cyan)' }}>ⓘ</span></strong>
              <small>Secuencial reactivo</small>
            </div>
          </button>
          <button
            id="btn-nash"
            className={`algo-btn ${isNash ? 'active nash' : ''}`}
            onClick={() => onAlgorithmChange('nash')}
          >
            <span className="algo-icon">⟐</span>
            <div>
              <strong>Equilibrio Nash <span onClick={(e) => { e.stopPropagation(); setInfoModalAlgo('nash'); }} title="Ver información del Equilibrio de Nash" style={{ cursor: 'pointer', color: 'var(--purple)' }}>ⓘ</span></strong>
              <small>Heurístico adaptativo</small>
            </div>
          </button>
        </div>
        <div style={{ marginTop: '10px' }}>
          <button 
            className={`algo-btn ${showFormulas ? 'active' : ''} formula-btn`}
            onClick={onToggleFormulas}
            style={{ width: '100%', borderColor: '#00c8ff' }}
          >
            <span className="algo-icon">∑</span>
            <div>
              <strong>Ver Fórmulas en Caliente</strong>
              <small>Datos en tiempo real</small>
            </div>
          </button>
        </div>
      </section>

      {/* ── Statistics & Dynamic Topology ── */}
      <section className="panel-section" id="statistics-section">
        <div className="section-header">
          <span className="section-icon">◫</span>
          <h2>Estado del Clúster</h2>
        </div>
        
        <div className="stats-grid">
          <div className="stat-card" id="stat-processed">
            <div className="stat-value green">{stats.totalProcessed.toLocaleString()}</div>
            <div className="stat-label">Procesados</div>
          </div>
          <div className="stat-card" id="stat-dropped">
            <div className="stat-value red">{stats.totalDropped.toLocaleString()}</div>
            <div className="stat-label">Perdidos</div>
          </div>
          <div className="stat-card">
            <div className={`stat-value ${dropColor}`}>{dropRatePct.toFixed(1)}%</div>
            <div className="stat-label">Drop Rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-value cyan">{stats.loadStdDev.toFixed(2)}</div>
            <div className="stat-label">Equilibrio (σ)</div>
          </div>
        </div>

        {/* ── History Chart ── */}
        <div className="chart-wrapper">
          <HistoryChart history={stats.history} />
        </div>

        {/* ── Per-server load bars & Toggle ── */}
        <div className="server-stats">
          <h3>Topología Dinámica (Nodos)</h3>
          {stats.serverLoads.map((load, i) => {
            const isActive = stats.serverStatus[i];
            const pct = isActive ? load : 0;
            const barClass = !isActive ? 'bar-offline' : pct <= 50 ? 'bar-green' : pct <= 80 ? 'bar-yellow' : 'bar-red';
            return (
              <div className={`server-bar-row ${!isActive ? 'offline-row' : ''}`} key={i}>
                <button 
                  className={`server-toggle ${isActive ? 'online' : 'offline'}`}
                  onClick={() => onToggleServer(i)}
                  title={isActive ? "Apagar Servidor" : "Encender Servidor"}
                >
                  {isActive ? '●' : '○'}
                </button>
                <span className="srv-label">SRV-{String(i + 1).padStart(2, '0')}</span>
                <div className="srv-bar-bg">
                  <div className={`srv-bar-fill ${barClass}`} style={{ width: isActive ? `${pct}%` : '100%' }} />
                </div>
                <span className="srv-pct">{isActive ? `${Math.round(pct)}%` : 'DOWN'}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Comparative Panel ── */}
      {showResults && (
        <section className="panel-section" id="comparative-section">
          <div className="section-header">
            <span className="section-icon">⚖</span>
            <h2>Comparativa de Algoritmos</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <strong style={{ color: 'var(--cyan)' }}>Round Robin</strong>
                <div title="Drop Rate (Tasa de pérdida). Fórmula: (Paquetes Perdidos / Total de Paquetes) * 100" style={{ cursor: 'help', borderBottom: '1px dotted var(--text-secondary)', width: 'fit-content' }}>Drop: {rrDrop.toFixed(1)}%</div>
                <div title="Desviación Estándar Promedio. Mide la estabilidad de la carga entre servidores. Menor es mejor. Fórmula: √( Σ(Carga_i - Media)² / N )" style={{ cursor: 'help', borderBottom: '1px dotted var(--text-secondary)', width: 'fit-content' }}>σ prom: {rrAvgDev.toFixed(3)}</div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                <strong style={{ color: 'var(--purple)' }}>Nash</strong>
                <div title="Drop Rate (Tasa de pérdida). Fórmula: (Paquetes Perdidos / Total de Paquetes) * 100" style={{ cursor: 'help', borderBottom: '1px dotted var(--text-secondary)', width: 'fit-content' }}>Drop: {nashDrop.toFixed(1)}%</div>
                <div title="Desviación Estándar Promedio. Mide la estabilidad de la carga entre servidores. Menor es mejor. Fórmula: √( Σ(Carga_i - Media)² / N )" style={{ cursor: 'help', borderBottom: '1px dotted var(--text-secondary)', width: 'fit-content' }}>σ prom: {nashAvgDev.toFixed(3)}</div>
              </div>
            </div>
            {rrDrop + nashDrop > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '5px 10px', borderRadius: '4px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Ganador actual: <strong style={{ color: nashDrop < rrDrop ? 'var(--purple)' : 'var(--cyan)' }}>{nashDrop < rrDrop ? 'Nash' : rrDrop < nashDrop ? 'Round Robin' : 'Empate'}</strong>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <button className="algo-btn" onClick={startStressTest} disabled={stressTime !== null} style={{ justifyContent: 'center', borderColor: stressTime !== null ? 'var(--purple)' : '' }}>
          <strong>{stressTime !== null ? `▶ Corriendo Test (${stressTime}/60s) - ${stressTime < 30 ? 'Round Robin' : 'Nash'}` : '▶ Stress Test (RR + Nash)'}</strong>
        </button>
        {showResults && stressTime === null && (
          <button id="export-csv-btn" className="algo-btn" onClick={handleExportCSV} style={{ justifyContent: 'center' }}>
            <strong>⤓ Descargar Resultados (.csv)</strong>
          </button>
        )}
      </div>

      {/* ── Reset ── */}
      <button className="reset-btn" id="btn-reset" onClick={() => onReset()}>
        ↺ Reiniciar Simulación
      </button>

      <InfoModal visible={infoModalAlgo !== null} algorithm={infoModalAlgo} onClose={() => setInfoModalAlgo(null)} />
    </aside>
  );
};

export default ControlPanel;
