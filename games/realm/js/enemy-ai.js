// Authoritative enemy rules. Presentation reads intent; it never decides hits.
import { ENEMIES } from './data.js';
import { distance, inSafe, moveBody, blocked, lineClear } from './world.js';

function move(enemy, dx, dy, radius) {
  if (inSafe(enemy.x + dx, enemy.y + dy)) return;
  const x = enemy.x, y = enemy.y;
  moveBody(enemy, dx, dy, radius);
  // A small deterministic steering correction keeps trees from trapping a pursuit.
  if (distance(enemy, { x, y }) < .1 && Math.hypot(dx, dy) > .1) {
    const side = Number(enemy.id.replace('enemy', '')) % 2 ? 1 : -1;
    const sx = -dy * side, sy = dx * side;
    if (!inSafe(x + sx, y + sy)) moveBody(enemy, sx, sy, radius);
  }
}
function beginAttack(s, e, def) {
  const p = s.player, d = distance(p, e) || 1;
  e.aim = { x: (p.x - e.x) / d, y: (p.y - e.y) / d };
  e.mode = 'windup';
  e.windup = e.windupMax = def.behavior === 'pounce' ? .7 : def.behavior === 'ranged' ? .65 : def.boss ? 1 : .5;
  if (def.behavior === 'eruption') {
    const spots = [{ x: p.x, y: p.y }];
    if (e.hp < def.hp / 2) spots.push({ x: p.x + p.facing.x * 90, y: p.y + p.facing.y * 90 });
    for (const pos of spots) if (!inSafe(pos.x, pos.y) && s.hazards.length < 12) {
      s.hazards.push({ ...pos, owner: e.id, radius: 62, delay: 1.05, maxDelay: 1.05, damage: def.attack });
    }
  }
}
export function stepEnemies(s, dt, { random, hurt, effect }) {
  const p = s.player;
  for (const e of s.enemies) {
    const def = ENEMIES[e.type];
    if (e.mode === 'dead') {
      e.respawn -= dt;
      if (e.respawn <= 0 && distance(p, e) > 280) Object.assign(e, { hp: def.hp, x: e.homeX, y: e.homeY, mode: 'idle', cooldown: 1, windup: 0, hit: 0 });
      continue;
    }
    e.hit = Math.max(0, e.hit - dt); e.cooldown = Math.max(0, e.cooldown - dt);
    const d = distance(p, e), homeDistance = Math.hypot(e.x - e.homeX, e.y - e.homeY);
    const loseTarget = inSafe(p.x, p.y) || d > def.leash + 70 || homeDistance > def.leash;
    if (['chase', 'windup', 'pounce'].includes(e.mode) && loseTarget) {
      e.mode = 'return'; e.windup = 0;
      s.hazards = s.hazards.filter(h => h.owner !== e.id);
    }
    if (e.mode === 'windup') {
      e.windup -= dt;
      if (e.windup <= 0) {
        e.cooldown = def.cooldown;
        e.mode = 'chase';
        if (def.behavior === 'pounce') { e.mode = 'pounce'; e.pounceTime = .42; e.pounceHit = false; }
        else if (def.behavior === 'ranged') {
          if (s.projectiles.length < 32) s.projectiles.push({ x: e.x, y: e.y, vx: e.aim.x * 190, vy: e.aim.y * 190, damage: def.attack, owner: e.id, life: 2.4 });
        } else if (def.behavior !== 'eruption') {
          if (d < (def.boss ? 100 : 45) && lineClear(e, p)) hurt(s, def.attack);
          if (def.boss) effect(s, 'slam', e.x, e.y);
        }
      }
      continue;
    }
    if (e.mode === 'pounce') {
      e.pounceTime -= dt;
      move(e, e.aim.x * 310 * dt, e.aim.y * 310 * dt, def.radius);
      if (!e.pounceHit && distance(e, p) < def.radius + 13 && lineClear(e, p)) { hurt(s, def.attack); e.pounceHit = true; }
      if (e.pounceTime <= 0) e.mode = 'chase';
      continue;
    }
    if (e.mode === 'idle' && d < def.aggro && !inSafe(p.x, p.y) && lineClear(e, p)) e.mode = 'chase';
    if (e.mode === 'return') {
      if (homeDistance < 8) { e.mode = 'idle'; e.hp = def.hp; }
      else move(e, (e.homeX - e.x) / homeDistance * def.speed * dt, (e.homeY - e.y) / homeDistance * def.speed * dt, def.radius);
    } else if (e.mode === 'chase') {
      e.facing = p.x < e.x ? -1 : 1;
      const reach = def.behavior === 'ranged' ? 210 : def.behavior === 'eruption' ? 225 : def.behavior === 'pounce' ? 138 : def.boss ? 85 : 34;
      if (d < reach && e.cooldown === 0 && lineClear(e, p)) beginAttack(s, e, def);
      else {
        const retreat = def.behavior === 'ranged' && d < 85;
        const stop = def.behavior === 'ranged' ? 150 : def.behavior === 'eruption' ? 115 : 27;
        if ((d > stop || retreat) && d > 0) {
          const speed = def.speed * (retreat ? -.7 : 1) * dt;
          move(e, (p.x - e.x) / d * speed, (p.y - e.y) / d * speed, def.radius);
        }
      }
    } else {
      e.timer += dt;
      if (e.timer > 2.5) { e.timer = 0; e.wander = random(s) * Math.PI * 2; }
      if (e.timer < .75 && e.wander !== undefined && homeDistance < 38) move(e, Math.cos(e.wander) * 12 * dt, Math.sin(e.wander) * 12 * dt, def.radius);
      else if (homeDistance >= 38) e.mode = 'return';
    }
  }
  s.projectiles = s.projectiles.filter(shot => {
    shot.life -= dt;
    // Substeps make collision independent of rendering frame rate.
    const steps = Math.max(1, Math.ceil(Math.hypot(shot.vx, shot.vy) * dt / 5));
    for (let i = 0; i < steps; i++) {
      shot.x += shot.vx * dt / steps; shot.y += shot.vy * dt / steps;
      if (blocked(shot.x, shot.y, 3) || inSafe(shot.x, shot.y)) return false;
      if (distance(shot, p) < 17) { hurt(s, shot.damage); effect(s, 'impact', shot.x, shot.y); return false; }
    }
    return shot.life > 0;
  });
  s.hazards = s.hazards.filter(h => {
    h.delay -= dt;
    if (h.delay > 0) return true;
    if (distance(h, p) < h.radius + 8) hurt(s, h.damage);
    effect(s, 'eruption', h.x, h.y);
    return false;
  });
}
