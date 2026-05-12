import React, { useRef, useEffect, useCallback } from 'react';
import { SimulationState, Vec2 } from '../types';
import { tickSimulation, createInitialState } from '../simulation';
import { renderFrame } from '../renderer';

interface SimulationCanvasProps {
  stateRef: React.MutableRefObject<SimulationState>;
  onStatsUpdate: () => void;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ stateRef, onStatsUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const statsTickRef = useRef<number>(0);
  const mousePosRef = useRef<Vec2 | null>(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    // Re-initialize state positions if needed
    const state = stateRef.current;
    if (state.servers.length === 0) {
      Object.assign(stateRef.current, createInitialState(rect.width, rect.height));
    }
  }, [stateRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();

    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);

    startTimeRef.current = performance.now();
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(now - lastTimeRef.current, 50); // cap delta to avoid spiral
      lastTimeRef.current = now;

      const container = canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      // Tick simulation
      tickSimulation(stateRef.current, dt, rect.width, rect.height);

      // Render
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        renderFrame(ctx, stateRef.current, rect.width, rect.height, now - startTimeRef.current, mousePosRef.current);
        ctx.restore();
      }

      // Update stats periodically (every ~100ms)
      statsTickRef.current += dt;
      if (statsTickRef.current > 100) {
        statsTickRef.current = 0;
        onStatsUpdate();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleMouseLeave = () => {
      mousePosRef.current = null;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [stateRef, onStatsUpdate, resizeCanvas]);

  return (
    <div className="canvas-container" id="simulation-viewport">
      <canvas ref={canvasRef} id="simulation-canvas" />
    </div>
  );
};

export default SimulationCanvas;
