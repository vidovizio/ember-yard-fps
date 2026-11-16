import { PHASES } from './state.js';
import { WEAPONS, equip } from './weapon.js';
import { resetBots } from './bots.js';
import { sounds } from './audio.js';

export function createRounds(game, world, player, bots, weapon) {
  const round = {
    plantProgress: 0,
    defuseProgress: 0,
    begin() {
      game.phase = PHASES.BUY;
      game.phaseTimer = 12;
      game.roundTimer = 100;
      game.winner = null;
      game.result = '';
      game.charge.planted = false;
      game.charge.site = null;
      game.charge.timer = 0;
      game.charge.progress = 0;
      game.charge.defuser = null;
      this.plantProgress = 0;
      this.defuseProgress = 0;
      player.position.copy(world.spawns.EMBER[0]);
      player.position.y = 0;
      player.velocity.set(0, 0, 0);
      player.health = 100;
      player.armor = 50;
      player.alive = true;
      player.grounded = true;
      player.recoil = 0;
      equip(weapon, weapon.name || 'Kestrel');
      resetBots(bots, world, game.round);
      sounds.round();
    },
    buy(name) {
      if (game.phase !== PHASES.BUY || !WEAPONS[name]) return false;
      const def = WEAPONS[name];
      if (game.money < def.cost) return false;
      game.money -= def.cost;
      if (name === 'Shard') {
        game.grenades = Math.min(2, game.grenades + 1);
      } else {
        game.owned[name] = true;
        equip(weapon, name);
      }
      return true;
    },
    update(dt, controls, callbacks) {
      if (game.phase === PHASES.BUY) {
        game.phaseTimer -= dt;
        if (game.phaseTimer <= 0) game.phase = PHASES.LIVE;
        return;
      }
      if (game.phase === PHASES.POST) {
        game.phaseTimer -= dt;
        if (game.phaseTimer <= 0) {
          if (game.scores.EMBER >= 9 || game.scores.HARBOR >= 9 || game.round >= 16) {
            game.phase = PHASES.MATCH;
          } else {
            game.round++;
            this.begin();
          }
        }
        return;
      }
      if (game.phase !== PHASES.LIVE) return;
      game.roundTimer -= dt;
      if (game.charge.planted) {
        game.charge.timer -= dt;
        if (game.charge.timer <= 0) {
          this.finish('EMBER', 'The Ember charge detonated');
          return;
        }
        const defuser = bots.find((bot) => bot.alive && bot.team === 'HARBOR' && bot.position.distanceTo(game.charge.site.position) < 2.8);
        if (defuser) {
          game.charge.defuser = defuser;
          this.defuseProgress += dt;
          if (this.defuseProgress >= 5) {
            this.finish('HARBOR', 'Charge defused');
            return;
          }
        } else {
          game.charge.defuser = null;
          this.defuseProgress = Math.max(0, this.defuseProgress - dt * 0.4);
        }
      } else {
        const site = world.sites.find((candidate) => player.position.distanceTo(candidate.position) < candidate.radius && player.alive);
        if (site && controls.interact && aliveCount(bots, 'HARBOR') > 0) {
          this.plantProgress += dt;
          game.charge.progress = this.plantProgress / 3;
          if (this.plantProgress >= 3) {
            game.charge.planted = true;
            game.charge.site = site;
            game.charge.timer = 35;
            game.charge.progress = 0;
            game.money += 800;
            sounds.plant();
            callbacks.feed('PLAYER', `planted at ${site.name}`);
          }
        } else {
          this.plantProgress = Math.max(0, this.plantProgress - dt * 1.4);
          game.charge.progress = this.plantProgress / 3;
        }
      }
      if (aliveCount(bots, 'HARBOR') === 0) { this.finish('EMBER', 'Harbor team eliminated'); return; }
      if (!player.alive && aliveCount(bots, 'EMBER') === 0) { this.finish('HARBOR', 'Ember team eliminated'); return; }
      if (!game.charge.planted && game.roundTimer <= 0) this.finish('HARBOR', 'Yard secured on the clock');
    },
    finish(winner, result) {
      if (game.phase !== PHASES.LIVE) return;
      game.phase = PHASES.POST;
      game.phaseTimer = 5;
      game.winner = winner;
      game.result = result;
      game.scores[winner]++;
      if (winner === 'EMBER') game.money += 3250;
      else game.money += 1400;
      sounds.round();
      callbacksEnd(callbacks, winner);
    },
  };
  let callbacks;
  const originalUpdate = round.update.bind(round);
  round.update = (dt, controls, hooks) => { callbacks = hooks; originalUpdate(dt, controls, hooks); };
  round.begin();
  return round;
}

function callbacksEnd(callbacks, winner) {
  callbacks?.roundEnd(winner);
}

function aliveCount(bots, team) {
  let count = 0;
  for (const bot of bots) if (bot.alive && bot.team === team) count++;
  return count;
}
