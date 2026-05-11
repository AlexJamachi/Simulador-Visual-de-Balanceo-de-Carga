// ============================================================
// Canvas Renderer – high-fidelity 2D drawing for the simulation
// ============================================================

import type { SimulationState, ServerNode, Packet, Vec2 } from './types';
import { computeLayout } from './simulation';

// ── Colour helpers ────────────────────────────────────────────

function serverStatusColor(load: number, max: number): string {
  const ratio = load / max;
  if (ratio <= 0.5) return '#00ff88';        // green
  if (ratio <= 0.8) return '#ffcc00';        // yellow
  return '#ff3344';                           // red
}

function serverStatusGlow(load: number, max: number): string {
  const ratio = load / max;
  if (ratio <= 0.5) return 'rgba(0,255,136,0.35)';
  if (ratio <= 0.8) return 'rgba(255,204,0,0.35)';
  return 'rgba(255,51,68,0.45)';
}

function lerpColor(a: number[], b: number[], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

// ── Background ────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  // Dark gradient background
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#0a0a1a');
  grad.addColorStop(0.5, '#0d1025');
  grad.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle grid pattern
  ctx.strokeStyle = 'rgba(0, 255, 200, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Floating particles (ambient)
  ctx.fillStyle = 'rgba(0,255,200,0.08)';
  for (let i = 0; i < 30; i++) {
    const px = ((Math.sin(time * 0.0003 + i * 1.7) + 1) / 2) * w;
    const py = ((Math.cos(time * 0.0002 + i * 2.3) + 1) / 2) * h;
    const radius = 1 + Math.sin(time * 0.001 + i) * 0.5;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Cables ────────────────────────────────────────────────────

function drawCables(ctx: CanvasRenderingContext2D, lbPos: Vec2, servers: ServerNode[], time: number) {
  for (const srv of servers) {
    if (!srv.isActive) continue; // Don't draw cable for offline servers
    
    const statusCol = serverStatusColor(srv.currentLoad, srv.maxCapacity);

    // Glow layer
    ctx.strokeStyle = statusCol.replace(')', ',0.12)').replace('rgb(', 'rgba(');
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(lbPos.x, lbPos.y);
    // Bezier curve for nicer look
    const cpx = (lbPos.x + srv.position.x) / 2;
    ctx.bezierCurveTo(cpx, lbPos.y, cpx, srv.position.y, srv.position.x, srv.position.y);
    ctx.stroke();

    // Main cable
    ctx.strokeStyle = statusCol.replace(')', ',0.35)').replace('rgb(', 'rgba(').replace('#', '');
    // Use the hex colour with alpha approach
    ctx.strokeStyle = statusCol + '59'; // ~35% alpha in hex
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lbPos.x, lbPos.y);
    ctx.bezierCurveTo(cpx, lbPos.y, cpx, srv.position.y, srv.position.x, srv.position.y);
    ctx.stroke();

    // Data pulse travelling along cable
    const pulseT = ((time * 0.0005 + srv.id * 0.25) % 1);
    const pt = bezierPoint(lbPos, { x: cpx, y: lbPos.y }, { x: cpx, y: srv.position.y }, srv.position, pulseT);
    ctx.fillStyle = statusCol;
    ctx.globalAlpha = 0.5 + Math.sin(time * 0.005) * 0.3;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function bezierPoint(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

// ── Load Balancer Node ────────────────────────────────────────

function drawLoadBalancer(ctx: CanvasRenderingContext2D, pos: Vec2, time: number, algorithm: string) {
  const radius = 38;

  // Outer ring glow
  const glowRadius = radius + 12 + Math.sin(time * 0.003) * 4;
  const grd = ctx.createRadialGradient(pos.x, pos.y, radius * 0.5, pos.x, pos.y, glowRadius);
  grd.addColorStop(0, 'rgba(0,200,255,0.25)');
  grd.addColorStop(1, 'rgba(0,200,255,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // Hexagonal shape
  ctx.fillStyle = '#0d1a2e';
  ctx.strokeStyle = '#00c8ff';
  ctx.lineWidth = 2.5;
  drawHexagon(ctx, pos.x, pos.y, radius);
  ctx.fill();
  ctx.stroke();

  // Inner ring
  ctx.strokeStyle = 'rgba(0,200,255,0.3)';
  ctx.lineWidth = 1;
  drawHexagon(ctx, pos.x, pos.y, radius * 0.7);
  ctx.stroke();

  // Label
  ctx.fillStyle = '#00e0ff';
  ctx.font = '600 8.5px "Orbitron", sans-serif'; // Reduced font size to fit "BALANCEADOR"
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BALANCEADOR', pos.x, pos.y - 7);
  ctx.font = '600 10px "Orbitron", sans-serif';
  ctx.fillText('DE CARGA', pos.x, pos.y + 7);

  // Algorithm indicator below
  ctx.fillStyle = algorithm === 'nash' ? '#00ff88' : '#ffcc00';
  ctx.font = '500 9px "Rajdhani", sans-serif';
  ctx.fillText(algorithm === 'nash' ? '⟐ NASH' : '↻ ROUND ROBIN', pos.x, pos.y + radius + 18);

  // Rotating scanner line
  const angle = time * 0.002;
  ctx.strokeStyle = 'rgba(0,200,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  ctx.lineTo(pos.x + Math.cos(angle) * radius, pos.y + Math.sin(angle) * radius);
  ctx.stroke();
}

function drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ── Server Nodes ──────────────────────────────────────────────

function drawServer(ctx: CanvasRenderingContext2D, srv: ServerNode, time: number) {
  const pos = srv.position;
  const w = 90, h = 60;
  
  if (!srv.isActive) {
    // Offline / Down appearance
    const bx = pos.x - w / 2;
    const by = pos.y - h / 2;
    
    ctx.fillStyle = 'rgba(20, 20, 30, 0.5)';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    roundRect(ctx, bx, by, w, h, 8);
    ctx.fill();
    ctx.stroke();
    
    // Cross over it
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx + 10, by + 10);
    ctx.lineTo(bx + w - 10, by + h - 10);
    ctx.moveTo(bx + w - 10, by + 10);
    ctx.lineTo(bx + 10, by + h - 10);
    ctx.stroke();

    ctx.fillStyle = '#666';
    ctx.font = '700 12px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(srv.label, pos.x, pos.y - 8);
    
    ctx.fillStyle = '#ff3344';
    ctx.font = '600 10px "Share Tech Mono", monospace';
    ctx.fillText('OFFLINE', pos.x, pos.y + 12);
    
    return;
  }

  const ratio = srv.currentLoad / srv.maxCapacity;
  const col = serverStatusColor(srv.currentLoad, srv.maxCapacity);
  const glowCol = serverStatusGlow(srv.currentLoad, srv.maxCapacity);

  // Glow
  const grd = ctx.createRadialGradient(pos.x, pos.y, 10, pos.x, pos.y, w);
  grd.addColorStop(0, glowCol);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(pos.x - w, pos.y - w, w * 2, w * 2);

  // Server box
  const bx = pos.x - w / 2;
  const by = pos.y - h / 2;
  ctx.fillStyle = '#0a1428';
  ctx.strokeStyle = col + '80';
  ctx.lineWidth = 2;
  roundRect(ctx, bx, by, w, h, 8);
  ctx.fill();
  ctx.stroke();

  // Inner accent line
  ctx.fillStyle = col + '15';
  roundRect(ctx, bx + 3, by + 3, w - 6, h - 6, 6);
  ctx.fill();

  // Server label
  ctx.fillStyle = '#c0d0e8';
  ctx.font = '700 12px "Orbitron", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(srv.label, pos.x, pos.y - 8);

  // Load count
  ctx.fillStyle = col;
  ctx.font = '600 11px "Share Tech Mono", monospace';
  ctx.fillText(`${srv.currentLoad}/${srv.maxCapacity}`, pos.x, pos.y + 10);

  // ── Health bar ──
  const barW = 80, barH = 8;
  const barX = pos.x - barW / 2;
  const barY = pos.y - h / 2 - 18;

  // Bar background
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, barX, barY, barW, barH, 3);
  ctx.fill();

  // Bar fill
  const fillW = barW * ratio;
  if (fillW > 0) {
    const barGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
    if (ratio <= 0.5) {
      barGrad.addColorStop(0, '#00ff88');
      barGrad.addColorStop(1, '#00cc66');
    } else if (ratio <= 0.8) {
      barGrad.addColorStop(0, '#ffcc00');
      barGrad.addColorStop(1, '#ff9900');
    } else {
      barGrad.addColorStop(0, '#ff3344');
      barGrad.addColorStop(1, '#cc0022');
    }
    ctx.fillStyle = barGrad;
    roundRect(ctx, barX, barY, fillW, barH, 3);
    ctx.fill();
  }

  // Bar outline
  ctx.strokeStyle = col + '40';
  ctx.lineWidth = 1;
  roundRect(ctx, barX, barY, barW, barH, 3);
  ctx.stroke();

  // Percentage text
  ctx.fillStyle = '#e0e8f0';
  ctx.font = '500 9px "Share Tech Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(ratio * 100)}%`, pos.x, barY - 4);

  // Critical warning animation
  if (ratio >= 0.8) {
    const flash = Math.sin(time * 0.008) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(255,51,68,${0.2 + flash * 0.4})`;
    ctx.lineWidth = 2;
    roundRect(ctx, bx - 4, by - 4, w + 8, h + 8, 10);
    ctx.stroke();

    // Warning icon
    ctx.fillStyle = `rgba(255,51,68,${0.6 + flash * 0.4})`;
    ctx.font = '14px sans-serif';
    ctx.fillText('⚠', pos.x + w / 2 + 12, pos.y);
  }

  // Dropped count (if any)
  if (srv.droppedCount > 0) {
    ctx.fillStyle = '#ff3344';
    ctx.font = '500 9px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`✕${srv.droppedCount} perdidos`, pos.x, pos.y + h / 2 + 16);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ── Packets ────────────────────────────────────────────────────

function drawPackets(ctx: CanvasRenderingContext2D, packets: Packet[], lbPos: Vec2, servers: ServerNode[], time: number) {
  for (const p of packets) {
    const from = lbPos;
    // If dropped early (no servers), just shoot it rightwards
    const to = p.targetServer === -1 ? { x: lbPos.x + 100, y: lbPos.y + (Math.random()*40-20) } : servers[p.targetServer].position;
    const cpx = (from.x + to.x) / 2;

    // Interpolate along bezier
    const pt = p.targetServer === -1 
      ? { x: from.x + (to.x - from.x) * p.progress, y: from.y + (to.y - from.y) * p.progress }
      : bezierPoint(from, { x: cpx, y: from.y }, { x: cpx, y: to.y }, to, Math.min(p.progress, 1));

    // Base radius by type
    let mainR = 4;
    if (p.type === 'heavy') mainR = 6;
    if (p.type === 'light') mainR = 3;
    
    mainR += Math.sin(time * 0.01 + p.id) * 1;
    
    // Fast fade out if dropped early
    const alphaMult = p.targetServer === -1 ? 1 - p.progress * 5 : 1;
    if (alphaMult <= 0) continue;

    // Trail glow
    for (let i = 0; i < p.trail.length; i++) {
      const alpha = (i / p.trail.length) * 0.3 * alphaMult;
      const r = (p.type === 'heavy' ? 3 : 2) + (i / p.trail.length) * 2;
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.trail[i].x, p.trail[i].y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Main packet circle
    const grd = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, mainR * 2.5);
    grd.addColorStop(0, `hsla(${p.hue}, 100%, 85%, ${0.9 * alphaMult})`);
    grd.addColorStop(0.5, `hsla(${p.hue}, 100%, 65%, ${0.4 * alphaMult})`);
    grd.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, mainR * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = `hsla(${p.hue}, 100%, 90%, ${1 * alphaMult})`;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, mainR * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── HUD Overlay ────────────────────────────────────────────────

function drawHUD(ctx: CanvasRenderingContext2D, w: number, h: number, state: SimulationState, time: number) {
  // Title
  ctx.fillStyle = 'rgba(0,200,255,0.7)';
  ctx.font = '700 14px "Orbitron", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('NETWORK TOPOLOGY', 20, 30);

  // Packets in flight
  ctx.fillStyle = 'rgba(200,220,255,0.5)';
  ctx.font = '400 11px "Rajdhani", sans-serif';
  ctx.fillText(`Paquetes en tránsito: ${state.packets.length}`, 20, 50);

  // Timestamp
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,200,255,0.3)';
  ctx.font = '400 10px "Share Tech Mono", monospace';
  ctx.fillText(`T+${(time / 1000).toFixed(1)}s`, w - 20, 30);

  // Scanline effect
  const scanY = (time * 0.1) % h;
  ctx.strokeStyle = 'rgba(0,255,200,0.02)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, scanY);
  ctx.lineTo(w, scanY);
  ctx.stroke();
}

// ── Main render function ──────────────────────────────────────

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  canvasW: number,
  canvasH: number,
  time: number
) {
  const { lbPos } = computeLayout(canvasW, canvasH);

  ctx.clearRect(0, 0, canvasW, canvasH);

  drawBackground(ctx, canvasW, canvasH, time);
  drawCables(ctx, lbPos, state.servers, time);
  drawPackets(ctx, state.packets, lbPos, state.servers, time);
  drawLoadBalancer(ctx, lbPos, time, state.algorithm);

  for (const srv of state.servers) {
    drawServer(ctx, srv, time);
  }

  drawHUD(ctx, canvasW, canvasH, state, time);
}
