import React from 'react';

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  algorithm: 'round-robin' | 'nash' | 'faq' | null;
}

export const InfoModal: React.FC<InfoModalProps> = ({ visible, onClose, algorithm }) => {
  if (!visible || !algorithm) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: 'rgba(0,0,0,0.7)', 
        zIndex: 9999, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        backdropFilter: 'blur(3px)'
      }}
    >
      <div 
        className="modal-content panel-section" 
        onClick={e => e.stopPropagation()} 
        style={{
          maxWidth: '500px', 
          backgroundColor: 'var(--bg-panel)', 
          padding: '25px',
          borderRadius: '12px', 
          border: '1px solid var(--border)',
          color: 'var(--text-main)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}
      >
        {algorithm === 'faq' ? (
          <>
            <h2 style={{ color: 'var(--text-main)', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '15px' }}>
              Preguntas Frecuentes y Costos
            </h2>
            <p><strong>¿Múltiples servidores (Scale-Out) vs Uno muy potente (Scale-Up)?</strong><br/>
              Es más eficiente y seguro usar múltiples servidores. Si se usa uno solo potente, se crea un <em>Punto Único de Falla (Single Point of Failure)</em>: si se apaga, todo el sistema cae. Además, escalar horizontalmente es más económico. Nuestro algoritmo Nash optimiza justamente estas redes descentralizadas.
            </p>
            <p><strong>Costos de Implementación:</strong><br/>
              - <strong>Startups/PYMES:</strong> Operación desde $20 - $50 USD mensuales en servidores virtuales (VPS), más un desarrollo inicial de software ($500 - $1,500 USD) para integrar el algoritmo en el balanceador.<br/>
              - <strong>Grandes Empresas:</strong> Desarrollo, auditorías y despliegue inicial desde $10,000 USD. Sin embargo, logran un ahorro mensual del 30% a 40% en facturación de la nube al aprovechar la CPU eficientemente.
            </p>
          </>
        ) : algorithm === 'round-robin' ? (
          <>
            <h2 style={{ color: 'var(--cyan)', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '15px' }}>
              Round Robin (Carrusel)
            </h2>
            <p><strong>Historia:</strong> El concepto proviene de métodos de asignación equitativa, como las peticiones en círculo (Ruban Rond) del siglo XVII en Francia. En la computación, fue uno de los primeros algoritmos de planificación de procesos creados para los sistemas de tiempo compartido en los años 60.</p>
            <p><strong>¿Cómo funciona?</strong> Es un algoritmo determinista y ciego. Distribuye las peticiones de red de forma estrictamente secuencial entre los servidores activos (1, 2, 3, 1, 2, 3...), sin importar qué tan cargado o rápido sea cada servidor.</p>
            <p><strong>Ventajas:</strong> Es extremadamente rápido, predecible y no requiere cálculos de estado ni memoria adicional.</p>
            <p><strong>Desventajas:</strong> Al ignorar la <em>capacidad</em> y <em>latencia</em> real de los servidores, puede sobrecargar servidores pequeños y provocar pérdidas de paquetes masivas mientras los servidores grandes permanecen ociosos.</p>
          </>
        ) : (
          <>
            <h2 style={{ color: 'var(--purple)', borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '15px' }}>
              Equilibrio de Nash (Teoría de Juegos)
            </h2>
            <p><strong>Historia:</strong> Postulado por el matemático <em>John Forbes Nash Jr.</em> en 1950 en su tesis sobre juegos no cooperativos, que le valió el Premio Nobel de Economía en 1994. Revolucionó el estudio de la toma de decisiones estratégicas.</p>
            <p><strong>En Redes Computacionales:</strong> Se adapta modelando la red como un ecosistema donde cada paquete entrante "juega" buscando minimizar su propio <strong>Costo</strong>. Al converger, el sistema alcanza un estado estable donde ningún paquete puede mejorar su tiempo cambiando unilateralmente de servidor.</p>
            <p><strong>Fórmula de Costo Multi-Métrica:</strong><br/>
              <code>U(i) = 0.5(CPU) + 0.3(Latencia) + 0.2(Vuelo)</code>
            </p>
            <p><strong>Dato Técnico:</strong> Nuestra implementación incluye una <em>Penalización Heurística</em> (+1000 de costo) que bloquea matemáticamente el envío de paquetes a servidores físicamente llenos, garantizando teóricamente un <strong>Drop Rate de 0%</strong> siempre que exista capacidad global disponible en el clúster.</p>
          </>
        )}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button className="algo-btn" onClick={onClose} style={{ display: 'inline-block', padding: '8px 20px' }}>
            Cerrar Información
          </button>
        </div>
      </div>
    </div>
  );
};
