import {
  WORLD,
  TOWERS,
  ENEMIES,
  TARGET_MODES,
  towerStats,
  upgradeOption,
} from "./data.js";
import {
  ROAD,
  BLOCKED,
  PATH_LENGTH,
  pointOnPath,
  distanceSquared,
} from "./map.js";
import { WAVES, waveScale, waveSpawns, completionReward } from "./waves.js";
export const STEP = 1 / 60;
export class GameClock {
  constructor() {
    this.accumulator = 0;
  }
  reset() {
    this.accumulator = 0;
  }
  advance(game, elapsed) {
    if (game.paused || game.terminal) {
      this.reset();
      return 0;
    }
    this.accumulator += Math.min(0.25, Math.max(0, elapsed)) * game.speed;
    let steps = 0;
    while (this.accumulator + 1e-10 >= STEP) {
      game.update(STEP);
      this.accumulator -= STEP;
      steps++;
      if (game.terminal) {
        this.reset();
        break;
      }
    }
    return steps;
  }
}
export class Game {
  constructor() {
    this.reset();
  }
  reset() {
    this.gold = WORLD.gold;
    this.lives = WORLD.lives;
    this.wave = 0;
    this.time = 0;
    this.status = "build";
    this.paused = false;
    this.speed = 1;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.spawnQueue = [];
    this.encounters = new Map();
    this.nextId = 1;
    this.selectedId = null;
    this.events = [];
    this.kills = 0;
    this.totalDamage = 0;
    this.leaked = 0;
    this.wavesCleared = 0;
    this.revision = 0;
  }
  get terminal() {
    return this.status === "lost" || this.status === "won";
  }
  get selected() {
    return this.towers.find((t) => t.id === this.selectedId) || null;
  }
  get remaining() {
    return this.enemies.length + this.spawnQueue.length;
  }
  emit(type, data = {}) {
    if (this.events.length < 180) this.events.push({ type, ...data });
  }
  drainEvents() {
    return this.events.splice(0);
  }
  touch() {
    this.revision++;
  }
  setSpeed(value) {
    if ([1, 2, 3].includes(value)) {
      this.speed = value;
      this.touch();
    }
  }
  setPaused(value) {
    if (!this.terminal) {
      this.paused = !!value;
      this.touch();
    }
  }
  placement(kind, gx, gy) {
    if (this.terminal) return { ok: false, reason: "Omgången är avslutad." };
    if (!TOWERS[kind]) return { ok: false, reason: "Välj ett torn först." };
    if (
      !Number.isInteger(gx) ||
      !Number.isInteger(gy) ||
      gx < 0 ||
      gy < 0 ||
      gx >= WORLD.width / WORLD.tile ||
      gy >= WORLD.height / WORLD.tile
    )
      return { ok: false, reason: "Välj en ruta på spelplanen." };
    if (ROAD.has(`${gx},${gy}`))
      return { ok: false, reason: "Vägen måste hållas fri." };
    if (BLOCKED.has(`${gx},${gy}`))
      return { ok: false, reason: "Terrängen blockerar den här rutan." };
    if (this.towers.some((t) => t.gx === gx && t.gy === gy))
      return { ok: false, reason: "Här står redan ett torn." };
    const missing = TOWERS[kind].cost - this.gold;
    if (missing > 0)
      return { ok: false, reason: `Saknar ${missing} krediter.` };
    return {
      ok: true,
      reason: `Bygg ${TOWERS[kind].name} · ${TOWERS[kind].cost} krediter`,
    };
  }
  place(kind, gx, gy) {
    const check = this.placement(kind, gx, gy);
    if (!check.ok) return check;
    const t = {
      id: this.nextId++,
      kind,
      gx,
      gy,
      x: (gx + 0.5) * WORLD.tile,
      y: (gy + 0.5) * WORLD.tile,
      levels: [0, 0],
      spent: TOWERS[kind].cost,
      targeting: "First",
      kills: 0,
      totalDamage: 0,
      cooldown: 0,
      angle: -Math.PI / 2,
      recoil: 0,
    };
    this.gold -= t.spent;
    this.towers.push(t);
    this.selectedId = t.id;
    this.touch();
    this.emit("build", { x: t.x, y: t.y, color: TOWERS[kind].color });
    return { ok: true, tower: t };
  }
  select(id) {
    this.selectedId = this.towers.some((t) => t.id === id) ? id : null;
    this.touch();
  }
  sell(id) {
    if (this.terminal) return { ok: false, reason: "Omgången är avslutad." };
    const i = this.towers.findIndex((t) => t.id === id);
    if (i < 0) return { ok: false, reason: "Tornet finns inte längre." };
    const t = this.towers[i],
      value = this.sellValue(t);
    this.gold += value;
    this.towers.splice(i, 1);
    if (this.selectedId === id) this.selectedId = null;
    this.touch();
    this.emit("money", { x: t.x, y: t.y, amount: value });
    return { ok: true, value };
  }
  sellValue(t) {
    return Math.floor(t.spent * WORLD.sellRatio);
  }
  upgrade(id, path) {
    const t = this.towers.find((t) => t.id === id);
    if (!t || this.terminal)
      return { ok: false, reason: "Tornet kan inte uppgraderas." };
    const option = upgradeOption(t, path);
    if (!option || option.maxed)
      return { ok: false, reason: "Vägen är fullt uppgraderad." };
    if (option.locked)
      return { ok: false, reason: "En annan specialisering är vald." };
    if (this.gold < option.cost)
      return {
        ok: false,
        reason: `Saknar ${option.cost - this.gold} krediter.`,
      };
    this.gold -= option.cost;
    t.spent += option.cost;
    t.levels[path]++;
    this.touch();
    this.emit("upgrade", { x: t.x, y: t.y, color: TOWERS[t.kind].color });
    return { ok: true };
  }
  setTargeting(id, mode) {
    const t = this.towers.find((t) => t.id === id);
    if (!t || !TARGET_MODES.includes(mode) || this.terminal) return false;
    t.targeting = mode;
    this.touch();
    return true;
  }
  startInfo() {
    if (this.terminal || this.wave >= WAVES.length)
      return { ok: false, reason: "Sista vågen", bonus: 0 };
    if (this.spawnQueue.length)
      return { ok: false, reason: "Fiender anländer…", bonus: 0 };
    if (this.encounters.size >= 2)
      return { ok: false, reason: "Två vågor är aktiva", bonus: 0 };
    const early = this.enemies.length > 0;
    return {
      ok: true,
      early,
      bonus: early ? Math.min(25, 8 + Math.ceil(this.enemies.length * 0.6)) : 0,
    };
  }
  startWave() {
    const info = this.startInfo();
    if (!info.ok) return info;
    this.wave++;
    const spawns = waveSpawns(this.wave);
    this.spawnQueue.push(
      ...spawns.map((s) => ({ ...s, at: this.time + s.at, wave: this.wave })),
    );
    this.encounters.set(this.wave, { pending: spawns.length, alive: 0 });
    this.gold += info.bonus;
    this.status = "wave";
    this.touch();
    this.emit("wave", {
      number: this.wave,
      name: WAVES[this.wave - 1].name,
      bonus: info.bonus,
    });
    return { ok: true, bonus: info.bonus };
  }
  spawn(kind, wave) {
    const def = ENEMIES[kind],
      scale = waveScale(wave),
      boss = kind === "boss";
    const maxHp =
      def.hp * (boss ? [1, 2.3, 4.4][Math.floor((wave - 1) / 10)] : scale.hp);
    const e = {
      id: this.nextId++,
      kind,
      wave,
      status: "active",
      hp: maxHp,
      maxHp,
      speed: def.speed * scale.speed,
      reward: def.reward,
      leak: def.leak,
      radius: def.radius,
      armor: def.armor,
      regen: def.regen || 0,
      slowResist: def.slowResist || 0,
      distance: 0,
      ...pointOnPath(0),
      age: 0,
      lastHit: -100,
      hitFlash: 0,
      slow: 0,
      slowUntil: 0,
      vulnerability: 0,
      vulnerableUntil: 0,
      burn: 0,
      burnUntil: 0,
      burnSource: null,
    };
    this.enemies.push(e);
    return e;
  }
  effectiveStats(t) {
    const s = towerStats(t);
    if (t.kind === "relay") return s;
    let damage = 0,
      rate = 0;
    for (const r of this.towers) {
      if (r.kind !== "relay") continue;
      const rs = towerStats(r);
      if (distanceSquared(r, t) <= rs.range ** 2) {
        damage = Math.max(damage, rs.buffDamage);
        rate = Math.max(rate, rs.buffRate);
      }
    }
    return {
      ...s,
      damage: s.damage * (1 + damage),
      rate: s.rate * (1 + rate),
      auraDamage: damage,
      auraRate: rate,
    };
  }
  chooseTarget(t, stats) {
    let best = null,
      bestValue = Infinity;
    for (const e of this.enemies) {
      if (e.status !== "active") continue;
      const d = distanceSquared(t, e);
      if (d > stats.range ** 2 || d < stats.minRange ** 2) continue;
      const score =
        t.targeting === "First"
          ? -e.distance
          : t.targeting === "Last"
            ? e.distance
            : t.targeting === "Strong"
              ? -e.hp
              : t.targeting === "Weak"
                ? e.hp
                : d;
      if (
        score < bestValue ||
        (score === bestValue && e.id < (best?.id ?? Infinity))
      ) {
        best = e;
        bestValue = score;
      }
    }
    return best;
  }
  armorFor(e) {
    return Math.min(
      0.85,
      e.armor + (e.kind === "boss" && e.age % 10 < 3 ? 0.2 : 0),
    );
  }
  damage(e, amount, penetration = 0, sourceId = null) {
    if (e.status !== "active" || amount <= 0) return 0;
    const vulnerable = e.vulnerableUntil > this.time ? e.vulnerability : 0;
    const actual = Math.min(
      e.hp,
      amount * (1 - this.armorFor(e) * (1 - penetration)) * (1 + vulnerable),
    );
    e.hp -= actual;
    e.lastHit = this.time;
    e.hitFlash = 0.1;
    this.totalDamage += actual;
    const source = this.towers.find((t) => t.id === sourceId);
    if (source) source.totalDamage += actual;
    if (e.hp <= 1e-8) {
      e.hp = 0;
      e.status = "dead";
      this.gold += e.reward;
      this.kills++;
      if (source) source.kills++;
      const encounter = this.encounters.get(e.wave);
      if (encounter) encounter.alive--;
      this.touch();
      this.emit("death", {
        x: e.x,
        y: e.y,
        color: ENEMIES[e.kind].color,
        radius: e.radius,
        boss: e.kind === "boss",
        amount: e.reward,
      });
    }
    return actual;
  }
  hit(e, p) {
    if (e.status !== "active") return;
    const s = p.stats;
    if (
      s.vulnerability &&
      (e.vulnerableUntil <= this.time || s.vulnerability >= e.vulnerability)
    ) {
      e.vulnerability = s.vulnerability;
      e.vulnerableUntil = this.time + 2.5;
    }
    this.damage(e, s.damage, s.penetration, p.sourceId);
    if (e.status !== "active") return;
    if (s.slow && (e.slowUntil <= this.time || s.slow >= e.slow)) {
      e.slow = s.slow;
      e.slowUntil = this.time + s.slowTime;
    }
    if (s.burn && (e.burnUntil <= this.time || s.burn >= e.burn)) {
      e.burn = s.burn;
      e.burnUntil = this.time + s.burnTime;
      e.burnSource = p.sourceId;
    }
  }
  update(dt) {
    if (this.paused || this.terminal) return;
    this.time += dt;
    while (this.spawnQueue.length && this.spawnQueue[0].at <= this.time) {
      const spawn = this.spawnQueue.shift();
      this.spawn(spawn.kind, spawn.wave);
      const w = this.encounters.get(spawn.wave);
      w.pending--;
      w.alive++;
    }
    for (const e of this.enemies) {
      if (e.status !== "active") continue;
      e.age += dt;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.burnUntil > this.time) this.damage(e, e.burn * dt, 0, e.burnSource);
      if (e.status !== "active") continue;
      if (e.regen && this.time - e.lastHit > 2)
        e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
      const slow = e.slowUntil > this.time ? e.slow * (1 - e.slowResist) : 0;
      e.distance += e.speed * (1 - slow) * dt;
      Object.assign(e, pointOnPath(e.distance));
      if (e.distance >= PATH_LENGTH) {
        e.status = "escaped";
        this.lives = Math.max(0, this.lives - e.leak);
        this.leaked++;
        this.encounters.get(e.wave).alive--;
        this.touch();
        this.emit("leak", { x: e.x, y: e.y, amount: e.leak });
        if (this.lives === 0) {
          this.finish("lost");
          return;
        }
      }
    }
    this.enemies = this.enemies.filter((e) => e.status === "active");
    for (const t of this.towers) {
      t.recoil = Math.max(0, t.recoil - dt * 6);
      if (t.kind === "relay") continue;
      const s = this.effectiveStats(t);
      t.cooldown -= dt;
      if (t.cooldown > 1e-8) continue;
      const target = this.chooseTarget(t, s);
      if (!target) {
        t.cooldown = 0;
        continue;
      }
      t.cooldown += 1 / s.rate;
      t.angle = Math.atan2(target.y - t.y, target.x - t.x);
      t.recoil = 1;
      // Artillery leads along the actual path; it can still miss accelerating/decelerating targets.
      const flight = Math.sqrt(distanceSquared(t, target)) / s.projectileSpeed;
      const slow =
        target.slowUntil > this.time
          ? target.slow * (1 - target.slowResist)
          : 0;
      const aim = s.ground
        ? pointOnPath(
            Math.min(
              PATH_LENGTH,
              target.distance + target.speed * (1 - slow) * flight,
            ),
          )
        : { x: target.x, y: target.y };
      this.projectiles.push({
        id: this.nextId++,
        x: t.x,
        y: t.y,
        startX: t.x,
        startY: t.y,
        aimX: aim.x,
        aimY: aim.y,
        targetId: target.id,
        sourceId: t.id,
        kind: t.kind,
        stats: s,
        age: 0,
        life: 4,
      });
      this.emit("shot", {
        x: t.x,
        y: t.y,
        angle: t.angle,
        color: TOWERS[t.kind].color,
        kind: t.kind,
      });
    }
    const active = new Map(this.enemies.map((e) => [e.id, e]));
    for (const p of this.projectiles) {
      p.age += dt;
      p.life -= dt;
      if (p.life <= 0) continue;
      const target = active.get(p.targetId);
      if (!p.stats.ground && (!target || target.status !== "active")) {
        p.life = 0;
        continue;
      }
      const aim = p.stats.ground ? { x: p.aimX, y: p.aimY } : target;
      const dx = aim.x - p.x,
        dy = aim.y - p.y,
        d = Math.hypot(dx, dy),
        step = p.stats.projectileSpeed * dt;
      if (d <= step + (p.stats.ground ? 0 : target.radius)) {
        p.x = aim.x;
        p.y = aim.y;
        if (p.stats.splash) {
          for (const e of this.enemies)
            if (
              e.status === "active" &&
              distanceSquared(p, e) <= (p.stats.splash + e.radius * 0.4) ** 2
            )
              this.hit(e, p);
        } else this.hit(target, p);
        this.emit("impact", {
          x: p.x,
          y: p.y,
          radius: p.stats.splash || 8,
          color: TOWERS[p.kind].color,
          kind: p.kind,
        });
        p.life = 0;
      } else {
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.life > 0);
    this.enemies = this.enemies.filter((e) => e.status === "active");
    for (const [number, w] of this.encounters) {
      if (w.pending === 0 && w.alive === 0) {
        this.encounters.delete(number);
        this.gold += completionReward(number);
        this.wavesCleared++;
        this.touch();
        this.emit("clear", { number, amount: completionReward(number) });
      }
    }
    if (this.wave > 0 && !this.encounters.size) {
      if (this.wave === WAVES.length) this.finish("won");
      else this.status = "build";
    }
  }
  finish(status) {
    this.status = status;
    this.paused = false;
    this.spawnQueue = [];
    this.projectiles = [];
    this.selectedId = null;
    this.touch();
    this.emit("finish", { status });
  }
}
