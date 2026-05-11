import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { HistoricalDataPoint } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface HistoryChartProps {
  history: HistoricalDataPoint[];
}

export const HistoryChart: React.FC<HistoryChartProps> = ({ history }) => {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 }, // Disable animation for performance on constant updates
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#8899aa',
          font: { family: "'Share Tech Mono', monospace", size: 9 },
          maxTicksLimit: 5
        }
      },
      x: {
        grid: { display: false },
        ticks: {
          color: '#8899aa',
          font: { family: "'Share Tech Mono', monospace", size: 9 },
          maxTicksLimit: 6
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        labels: {
          color: '#e0e8f0',
          font: { family: "'Rajdhani', sans-serif", size: 10, weight: 600 as const },
          boxWidth: 10
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(10, 10, 26, 0.9)',
        titleColor: '#00c8ff',
        bodyColor: '#e0e8f0',
        borderColor: 'rgba(0, 200, 255, 0.3)',
        borderWidth: 1,
        titleFont: { family: "'Orbitron', sans-serif", size: 11 },
        bodyFont: { family: "'Share Tech Mono', monospace", size: 10 }
      }
    }
  };

  const labels = history.map(h => `${h.time}s`);
  const data = {
    labels,
    datasets: [
      {
        label: 'Procesados/s',
        data: history.map(h => h.processedRate),
        borderColor: '#00ff88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.4
      },
      {
        label: 'Perdidos/s',
        data: history.map(h => h.droppedRate),
        borderColor: '#ff3344',
        backgroundColor: 'rgba(255, 51, 68, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.4
      }
    ]
  };

  return (
    <div className="history-chart-container">
      {history.length > 0 ? (
        <Line options={options} data={data} />
      ) : (
        <div className="chart-empty">Recolectando datos...</div>
      )}
    </div>
  );
};
