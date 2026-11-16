export const FIXED_DT = 1 / 60;
export const TEAMS = Object.freeze({ EMBER: 'EMBER', HARBOR: 'HARBOR' });
export const PHASES = Object.freeze({ BUY: 'buy', LIVE: 'live', POST: 'post', MATCH: 'match' });

export const game = {
  phase: PHASES.BUY,
  round: 1,
  scores: { EMBER: 0, HARBOR: 0 },
  money: 800,
  grenades: 0,
  owned: { Kestrel: true },
  kills: 0,
  player: null,
  bots: [],
  charge: { planted: false, site: null, timer: 0, defuser: null, progress: 0 },
  phaseTimer: 12,
  roundTimer: 100,
  winner: null,
  result: '',
  feed: [],
  noise: { position: null, age: 99 },
  rng: Math.random,
  shotMode: null,
  paused: false,
};

export function seedRandom(seed) {
  let value = (Number(seed) >>> 0) || 1;
  game.rng = () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
