// Beaconkeeper — rendering: the night tower, its lamps, the sweeping beam,
// vision cones, fog, and every screen from title to victory. All drawing is
// canvas 2D; the darkness layer is what makes light readable as safety.
import { VIEW_H, VIEW_W } from './config.js';
import { beamPolygon, conePolygon } from './vision.js';

const FLOOR_COLORS = {
  dock: { base: '#232a33', line: '#2e3844', trim: '#3a2f22' },
  quarters: { base: '#2b2620', line: '#372f26', trim: '#4a3a28' },
  lamp: { base: '#262632', line: '#31313f', trim: '#3d3423' },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  drawFloor(game) {
    const { ctx } = this;
    const floor = game.floor;
    const def = floor.def;
    const pal = FLOOR_COLORS[def.floorStyle] || FLOOR_COLORS.dock;
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = pal.base;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Planks / tiles so the floor reads at a glance.
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 1;
    const step = def.floorStyle === 'dock' ? 40 : 48;
    for (let x = 0; x <= VIEW_W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, VIEW_H);
      ctx.stroke();
    }
    for (let y = 0; y <= VIEW_H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_W, y);
      ctx.stroke();
    }
    // Rug / quay markings per floor.
    if (def.floorStyle === 'quarters') {
      ctx.fillStyle = '#5a2e35';
      ctx.fillRect(330, 330, 180, 18);
      ctx.fillStyle = '#6e3640';
      ctx.fillRect(340, 336, 160, 6);
    }
    if (def.floorStyle === 'dock') {
      ctx.strokeStyle = '#3f5a52';
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, 920, 560);
    }
    // Cover zones: fog banks, crates, wardrobes, rugs.
    for (const c of def.cover) {
      if (c.kind === 'fog') {
        const g = ctx.createRadialGradient(c.x + c.w / 2, c.y + c.h / 2, 6, c.x + c.w / 2, c.y + c.h / 2, Math.max(c.w, c.h) * 0.62);
        g.addColorStop(0, 'rgba(190,205,220,0.34)');
        g.addColorStop(1, 'rgba(190,205,220,0.05)');
        ctx.fillStyle = g;
        ctx.fillRect(c.x - 8, c.y - 8, c.w + 16, c.h + 16);
        ctx.strokeStyle = 'rgba(200,214,228,0.5)';
        ctx.setLineDash([6, 5]);
        ctx.strokeRect(c.x, c.y, c.w, c.h);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(220,230,240,0.75)';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FOG — HIDE', c.x + c.w / 2, c.y + c.h / 2 + 4);
      } else if (c.kind === 'crates' || c.kind === 'barrels') {
        ctx.fillStyle = '#4a3a24';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = '#6b5636';
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + c.w, c.y + c.h);
        ctx.moveTo(c.x + c.w, c.y);
        ctx.lineTo(c.x, c.y + c.h);
        ctx.stroke();
        ctx.fillStyle = 'rgba(230,220,200,0.7)';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.kind === 'barrels' ? 'BARRELS' : 'CRATES', c.x + c.w / 2, c.y + c.h / 2 + 4);
      } else {
        ctx.fillStyle = c.kind === 'wardrobe' ? '#3d2b1f' : '#5a2e35';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = '#7a5a3a';
        ctx.lineWidth = 2;
        ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
        ctx.fillStyle = 'rgba(230,220,200,0.7)';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.kind.toUpperCase(), c.x + c.w / 2, c.y + c.h / 2 + 4);
      }
    }
    // Walls: stone with a warm edge.
    for (const w of def.walls) {
      ctx.fillStyle = '#171a21';
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = '#2c313d';
      ctx.fillRect(w.x, w.y, w.w, 3);
    }
    // Bell.
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(def.bell.x, def.bell.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2f10';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BELL', def.bell.x, def.bell.y - 20);
    // Items: pulsing diamonds with their names.
    for (const it of floor.items) {
      if (it.taken) continue;
      const pulse = 0.6 + 0.4 * Math.sin(game.time * 4 + it.x);
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = `rgba(255, 214, 90, ${0.75 + 0.25 * pulse})`;
      ctx.fillRect(-9, -9, 18, 18);
      ctx.strokeStyle = '#7a5c00';
      ctx.lineWidth = 2;
      ctx.strokeRect(-9, -9, 18, 18);
      ctx.restore();
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(it.name.toUpperCase(), it.x, it.y - 18);
    }
    // Exit: the gate or the great lamp.
    const e = def.exit;
    const open = floor.exitOpen;
    ctx.fillStyle = open ? 'rgba(120,220,140,0.25)' : 'rgba(120,140,160,0.16)';
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.strokeStyle = open ? '#7ddc8a' : '#5a6a7a';
    ctx.lineWidth = 3;
    ctx.strokeRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = open ? '#b8f5c2' : '#9fb0c0';
    ctx.font = 'bold 11px system-ui, sans-serif';
    const label = open ? e.label : 'LOCKED — TAKE ALL';
    ctx.textAlign = 'right';
    if (e.y < 60 || e.y + e.h > 540) {
      // Exit hugging the top or bottom edge: label to its left.
      ctx.fillText(label, e.x - 8, e.y + e.h / 2 + 4);
    } else {
      // Exit mid-height on the right edge: label beneath it.
      ctx.fillText(label, e.x + e.w, e.y + e.h + 16);
    }
    if (def.floorStyle === 'lamp') {
      // The great lamp at the centre of the room.
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(def.beam.x, def.beam.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6d1f';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#3a2f10';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.fillText('LAMP', def.beam.x, def.beam.y + 4);
    }
  }

  drawLighting(game) {
    const { ctx } = this;
    const floor = game.floor;
    const def = floor.def;
    // Warm lamp pools.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of def.lamps) {
      const g = ctx.createRadialGradient(l.x, l.y, 8, l.x, l.y, l.r);
      g.addColorStop(0, 'rgba(255,190,90,0.30)');
      g.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // The rotating beam.
    const poly = beamPolygon(def.beam, floor.beamAngle, def.walls);
    ctx.fillStyle = 'rgba(255,236,160,0.34)';
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Darkness: everything far from light goes dim, except a small ring
    // around the thief so the player can always read the floor nearby.
    const dark = ctx.createRadialGradient(
      game.floor.player.x, game.floor.player.y, 60,
      game.floor.player.x, game.floor.player.y, 340,
    );
    dark.addColorStop(0, 'rgba(4,6,12,0)');
    dark.addColorStop(1, 'rgba(4,6,12,0.62)');
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Noise ripples.
    for (const r of floor.rings) {
      const p = 1 - r.ttl / 1.2;
      ctx.strokeStyle = `rgba(255,255,255,${0.7 * (1 - p)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 12 + p * r.max, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawGuards(game) {
    const { ctx } = this;
    const floor = game.floor;
    for (const g of floor.guards) {
      const poly = conePolygon(g.x, g.y, g.angle, 0.56, 185, floor.walls);
      const col =
        g.mood === 'alarm' ? 'rgba(255,70,60,0.42)' : g.mood === 'investigate' ? 'rgba(255,170,60,0.36)' : g.mood === 'wary' ? 'rgba(255,220,90,0.30)' : 'rgba(255,220,130,0.22)';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      ctx.closePath();
      ctx.fill();
      // Lantern glow.
      const lg = ctx.createRadialGradient(g.x, g.y, 4, g.x, g.y, 46);
      lg.addColorStop(0, 'rgba(255,200,100,0.5)');
      lg.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 46, 0, Math.PI * 2);
      ctx.fill();
      // Body: a keeper with a lantern.
      ctx.fillStyle = g.mood === 'alarm' ? '#a33' : '#33455e';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d8c98a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(g.x + Math.cos(g.angle) * 10, g.y + Math.sin(g.angle) * 10, 4, 0, Math.PI * 2);
      ctx.fill();
      // Suspicion ring above the guard.
      if (g.suspicion > 4) {
        const frac = g.suspicion / 100;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(20,20,20,0.8)';
        ctx.beginPath();
        ctx.arc(g.x, g.y - 24, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = frac > 0.8 ? '#ff5040' : frac > 0.5 ? '#ffaa30' : '#ffe14d';
        ctx.beginPath();
        ctx.arc(g.x, g.y - 24, 11, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        ctx.stroke();
        if (g.mood === 'alarm') {
          ctx.fillStyle = '#ff5040';
          ctx.font = 'bold 13px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', g.x, g.y - 40);
        } else if (g.mood === 'investigate') {
          ctx.fillStyle = '#ffcf5e';
          ctx.font = 'bold 13px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('?', g.x, g.y - 40);
        }
      }
    }
  }

  drawPlayer(game) {
    const { ctx } = this;
    const p = game.floor.player;
    const bob = p.moving ? Math.sin(p.stepPhase) * 1.5 : 0;
    // Noise ring while walking.
    if (p.noise > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.noise, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(p.angle);
    // Hooded cloak: a dark triangle with a pale face.
    ctx.fillStyle = p.hiddenZone ? '#2e6b4f' : '#1f2a3a';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = p.hiddenZone ? '#7ddc8a' : '#8fa3bd';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#f2d8b0';
    ctx.beginPath();
    ctx.arc(4, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (p.hiddenZone) {
      ctx.fillStyle = '#9fe8b4';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', p.x, p.y - 22);
    } else if (p.lit) {
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('IN THE LIGHT', p.x, p.y - 22);
    }
  }

  drawHud(game) {
    const { ctx } = this;
    const floor = game.floor;
    // Top bar.
    ctx.fillStyle = 'rgba(8,10,16,0.82)';
    ctx.fillRect(0, 0, VIEW_W, 34);
    ctx.fillStyle = '#f2e8c8';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`BEACONKEEPER — ${floor.def.name}`, 12, 22);
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE ${game.score}`, VIEW_W - 12, 22);
    // Detection meter: right of the title, clear of the score.
    const bx = 600;
    const bw = 200;
    ctx.fillStyle = '#222';
    ctx.fillRect(bx, 10, bw, 14);
    ctx.fillStyle = game.detection > 66 ? '#ff5040' : game.detection > 33 ? '#ffaa30' : '#7ddc8a';
    ctx.fillRect(bx, 10, bw * (game.detection / 100), 14);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, 10, bw, 14);
    ctx.fillStyle = '#fff';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('DETECTION', bx - 78, 21);
    // Bottom bar: objectives, pebbles, hints.
    ctx.fillStyle = 'rgba(8,10,16,0.82)';
    ctx.fillRect(0, VIEW_H - 30, VIEW_W, 30);
    ctx.fillStyle = '#dfe8f2';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    const items = floor.items.map((i) => (i.taken ? '✓ ' : '○ ') + i.name).join('   ');
    ctx.fillText(items, 12, VIEW_H - 11);
    ctx.textAlign = 'right';
    ctx.fillText(`Pebbles ${game.floor.player.pebbles}  •  WASD move  •  Shift sneak  •  F pebble  •  E bell  •  P pause  •  M mute`, VIEW_W - 12, VIEW_H - 11);
  }

  panel(title, lines, accent) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(4,6,12,0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = accent || '#f2e8c8';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW_W / 2, 150);
    ctx.fillStyle = '#dfe8f2';
    ctx.font = '15px system-ui, sans-serif';
    lines.forEach((ln, i) => ctx.fillText(ln, VIEW_W / 2, 205 + i * 26));
  }

  drawTitle(game) {
    this.drawFloor(game);
    this.drawLighting(game);
    this.drawGuards(game);
    this.drawPlayer(game);
    const { ctx } = this;
    ctx.fillStyle = 'rgba(4,6,12,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 54px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('BEACONKEEPER', VIEW_W / 2, 190);
    ctx.fillStyle = '#f2e8c8';
    ctx.font = 'italic 22px Georgia, serif';
    ctx.fillText('The Midnight Light', VIEW_W / 2, 228);
    ctx.fillStyle = '#dfe8f2';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('A top-down stealth heist in a lighthouse tower — rotating beam, lantern patrols,', VIEW_W / 2, 280);
    ctx.fillText('fog cover, bell lures, 3 floors. Steal the chart, the cipher and the logbook unseen.', VIEW_W / 2, 304);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText('Press ENTER to begin  •  WASD / arrows to move  •  Shift to sneak', VIEW_W / 2, 360);
    ctx.fillStyle = '#9fb0c0';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('F throws a pebble  •  E rings the bell  •  P pauses  •  M mutes  •  never stand in the beam', VIEW_W / 2, 390);
  }

  drawBriefing(game) {
    this.drawFloor(game);
    this.drawLighting(game);
    this.panel(game.floor.def.name, [game.floor.def.brief, '', 'Press ENTER to slip in.'], '#ffd76a');
  }

  drawPaused(game) {
    this.drawFloor(game);
    this.drawLighting(game);
    this.drawGuards(game);
    this.drawPlayer(game);
    this.panel('PAUSED', ['The keepers wait. The lamp turns.', '', 'Press P to keep sneaking.'], '#dfe8f2');
  }

  drawFloorClear(game) {
    this.panel('FLOOR CLEAR', [
      `Floor bonus +${400}  •  time bonus +${game.lastTimeBonus}`,
      game.lastGhost ? 'GHOST — never seen: +500' : 'Seen along the way — no ghost bonus.',
      '',
      'Press ENTER for the next floor.',
    ], '#7ddc8a');
  }

  drawCaught(game) {
    this.panel('CAUGHT', [
      'A lantern found you, and the tower woke.',
      `Score ${game.score}  •  floor ${game.floorIndex + 1} of 3`,
      '',
      'Press R to try the floor again.',
    ], '#ff5040');
  }

  drawWin(game) {
    const { ctx } = this;
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // The great lamp, lit, at the centre.
    const g = ctx.createRadialGradient(VIEW_W / 2, 240, 10, VIEW_W / 2, 240, 260);
    g.addColorStop(0, 'rgba(255,220,120,0.9)');
    g.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(VIEW_W / 2, 240, 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 44px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE LIGHT IS YOURS', VIEW_W / 2, 150);
    ctx.fillStyle = '#f2e8c8';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Chart, cipher and logbook — stolen without a sound the tower could keep.', VIEW_W / 2, 300);
    ctx.fillText(`Final score ${game.score}  •  time ${Math.round(game.totalTime)}s  •  ${game.ghostFloors} ghost floor${game.ghostFloors === 1 ? '' : 's'}`, VIEW_W / 2, 330);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText('Press R to steal it all again.', VIEW_W / 2, 390);
  }

  draw(game) {
    const { ctx } = this;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (game.state === 'title') return this.drawTitle(game);
    if (game.state === 'briefing') return this.drawBriefing(game);
    if (game.state === 'paused') return this.drawPaused(game);
    if (game.state === 'floorclear') return this.drawFloorClear(game);
    if (game.state === 'caught') {
      this.drawFloor(game);
      this.drawLighting(game);
      this.drawGuards(game);
      this.drawPlayer(game);
      return this.panel('CAUGHT', [
        'A lantern found you, and the tower woke.',
        `Score ${game.score}  •  floor ${game.floorIndex + 1} of 3`,
        '',
        'Press R to try the floor again.',
      ], '#ff5040');
    }
    if (game.state === 'win') return this.drawWin(game);
    this.drawFloor(game);
    this.drawLighting(game);
    this.drawGuards(game);
    this.drawPlayer(game);
    this.drawHud(game);
  }
}
