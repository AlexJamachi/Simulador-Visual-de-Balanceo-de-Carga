import React from 'react';
import type { SimulationStats, AlgorithmMode } from '../types';
import { HistoryChart } from './HistoryChart';

interface ControlPanelProps {
  stats: SimulationStats;
  onTrafficChange: (pps: number) => void;
  onAlgorithmChange: (mode: AlgorithmMode) => void;
  onToggleServer: (id: number) => void;
  onReset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  stats,
  onTrafficChange,
  onAlgorithmChange,
  onToggleServer,
  onReset,
}) => {
  const isNash = stats.algorithm === 'nash';

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
              <strong>Round Robin</strong>
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
              <strong>Equilibrio Nash</strong>
              <small>Heurístico adaptativo</small>
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

      {/* ── Reset ── */}
      <button className="reset-btn" id="btn-reset" onClick={onReset}>
        ↺ Reiniciar Simulación
      </button>
    </aside>
  );
};

export default ControlPanel;
