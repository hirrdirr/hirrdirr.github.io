import { ENEMIES } from './data.js';
import { blocked, inSafe } from './world.js';

export const respawnSeconds = type => ENEMIES[type].respawnSeconds ?? 28;

// Key by authored home rather than an array index so reordering spawns is safe.
export const spawnKey = e => e.type + ':' + e.homeX + ':' + e.homeY;

export function createEnemy(id, type, x, y) {
  return {
    id, type, homeX: x, homeY: y, x, y, hp: ENEMIES[type].hp, mode: 'idle',
    timer: 0, cooldown: .5, windup: 0, windupMax: 0, hit: 0, respawn: 0,
    facing: 1, aim: null, wander: undefined, pounceTime: 0, pounceHit: false, returnTime: 0
  };
}

// Prefer home. When occupied, use a clear nearby point and keep the authored
// home for leashing. No proximity timer can be held open by camping the spawn.
export function placeAtHome(e, player) {
  const radius = ENEMIES[e.type].radius, clearance = radius + 11 + 8;
  e.x = e.homeX; e.y = e.homeY;
  if (Math.hypot(e.x - player.x, e.y - player.y) >= clearance) return;
  for (const offset of [clearance + 1, 2 * clearance + 1]) {
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const x = e.homeX + Math.cos(angle) * offset, y = e.homeY + Math.sin(angle) * offset;
      if (Math.hypot(x - player.x, y - player.y) >= clearance && !inSafe(x, y) && !blocked(x, y, radius)) {
        e.x = x; e.y = y; return;
      }
    }
  }
  throw new Error('No clear respawn point for ' + spawnKey(e));
}

export function reviveEnemy(e, player) {
  Object.assign(e, createEnemy(e.id, e.type, e.homeX, e.homeY));
  e.cooldown = 1;
  e.risingTide = false;
  placeAtHome(e, player);
}
