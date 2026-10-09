import { WORLD, ENEMIES } from "./data.js";

const baseWorld = {
  gold: WORLD.gold,
  lives: WORLD.lives,
};

const baseEnemies = Object.fromEntries(
  Object.entries(ENEMIES).map(([kind, enemy]) => [
    kind,
    {
      hp: enemy.hp,
      speed: enemy.speed,
      reward: enemy.reward,
      leak: enemy.leak,
    },
  ]),
);

export const DIFFICULTIES = {
  normal: {
    key: "normal",
    name: "Normal",
    description: "Original Core Defense balance.",
    gold: baseWorld.gold,
    lives: baseWorld.lives,
    enemyHp: 1,
    enemySpeed: 1,
    enemyReward: 1,
    leak: 1,
  },
  easy: {
    key: "easy",
    name: "Easy",
    description: "More room to build, recover and learn each wave.",
    gold: 300,
    lives: 40,
    enemyHp: 0.82,
    enemySpeed: 0.96,
    enemyReward: 1.1,
    leak: 0.75,
  },
};

export function resolveDifficulty(value) {
  return DIFFICULTIES[value] || DIFFICULTIES.normal;
}

export function applyDifficulty(value) {
  const difficulty = resolveDifficulty(value);

  WORLD.gold = difficulty.gold;
  WORLD.lives = difficulty.lives;

  for (const [kind, enemy] of Object.entries(ENEMIES)) {
    const base = baseEnemies[kind];
    enemy.hp = base.hp * difficulty.enemyHp;
    enemy.speed = base.speed * difficulty.enemySpeed;
    enemy.reward = Math.max(1, Math.round(base.reward * difficulty.enemyReward));
    enemy.leak = Math.max(1, Math.round(base.leak * difficulty.leak));
  }

  return difficulty;
}
