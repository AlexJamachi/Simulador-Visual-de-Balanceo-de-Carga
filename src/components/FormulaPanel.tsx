import React from 'react';
import type { SimulationStats } from '../types';

interface FormulaPanelProps {
  stats: SimulationStats;
  visible: boolean;
  onClose: () => void;
}

const FormulaPanel: React.FC<FormulaPanelProps> = ({ stats, visible, onClose }) => {
  if (!visible) return null;

  const isNash = stats.algorithm === 'nash';

  return (
    <div className="formula-panel">
      <div className="formula-header">
        <h3><span className="icon">∑</span> Análisis en Tiempo Real</h3>
        <button onClick={onClose} className="close-btn" title="Cerrar Panel">×</button>
      </div>

      {isNash ? (
        <div className="formula-content">
          <h4>Equilibrio de Nash</h4>
          <div className="math-box">
            <code>Costo(S) = (Carga + En_Vuelo) / Capacidad</code>
            <p>Se selecciona el servidor <em>S</em> que minimice <code>Costo(S)</code></p>
          </div>
          
          <table className="data-table">
            <thead>
              <tr>
                <th>SRV</th>
                <th>Carga</th>
                <th>Vuelo</th>
                <th>Cap</th>
                <th>Costo</th>
              </tr>
            </thead>
            <tbody>
              {stats.serverLoads.map((loadPct, i) => {
                const isActive = stats.serverStatus[i];
                const capacity = stats.serverCapacities[i];
                const inFlight = stats.inFlightCounts[i];
                const actualLoad = (loadPct / 100) * capacity;
                const cost = isActive ? ((actualLoad + inFlight) / capacity).toFixed(2) : 'N/A';
                
                return (
                  <tr key={i} className={!isActive ? 'offline-row' : ''}>
                    <td>0{i + 1}</td>
                    <td>{isActive ? Math.round(actualLoad) : '-'}</td>
                    <td>{isActive ? inFlight : '-'}</td>
                    <td>{capacity}</td>
                    <td className="cost-col">{cost}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="formula-content">
          <h4>Round Robin</h4>
          <div className="math-box">
            <code>Índice = Índice_Anterior mod N</code>
            <p>Distribución secuencial. Se asigna al siguiente servidor disponible de forma equitativa.</p>
          </div>
          <div className="rr-status">
            <p>Siguiente servidor a evaluar:</p>
            <div className="next-srv-badge">
              SRV-{(((stats.roundRobinIndex || 0) % (stats.serverLoads.length || 1)) + 1).toString().padStart(2, '0')}
            </div>
          </div>
        </div>
      )}

      {/* ── Gantt Chart Section ── */}
      <div className="gantt-section" style={{ marginTop: '20px' }}>
        <h4 style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>
          Diagrama de Tareas en Cola
        </h4>
        <div className="gantt-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {stats.serverQueues.map((queue, i) => {
            const isActive = stats.serverStatus[i];
            return (
              <div key={i} className={`gantt-row ${!isActive ? 'offline-row' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--cyan)', width: '40px' }}>SRV-0{i + 1}</span>
                <div className="gantt-track" style={{ flex: 1, height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', overflow: 'hidden' }}>
                  {isActive ? (
                    queue.length === 0 ? (
                      <span style={{ fontSize: '9px', color: 'var(--text-dim)', margin: 'auto' }}>Vacío</span>
                    ) : (
                      queue.map((taskTime, j) => {
                        const typeClass = taskTime > 4000 ? '#ff33aa' : taskTime > 1500 ? '#00c8ff' : '#00ff88';
                        const width = Math.max(4, taskTime / 60); // scale 6000ms -> 100px
                        return (
                          <div
                            key={j}
                            style={{ 
                              width: `${width}px`, 
                              height: '100%', 
                              background: typeClass, 
                              borderRight: '1px solid rgba(0,0,0,0.5)',
                              opacity: 0.8
                            }}
                            title={`Restante: ${Math.round(taskTime)}ms`}
                          />
                        );
                      })
                    )
                  ) : (
                    <span style={{ fontSize: '9px', color: 'var(--red)', margin: 'auto' }}>OFFLINE</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FormulaPanel;
