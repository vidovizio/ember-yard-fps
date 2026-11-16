import { WEAPONS } from './weapon.js';

const $ = (id) => document.getElementById(id);

export function createHUD(game, rounds, weapon, shotMode) {
  const buy = $('buy-menu');
  const grid = $('buy-grid');
  const entries = [
    ['Longbow-9', 'SMG', '$900'], ['Vandal Prime', 'RIFLE', '$2700'],
    ['Osprey', 'MARKSMAN', '$4750'], ['Shard', 'FRAG', '$300'],
    ['Kestrel', 'SIDEARM', 'FREE'], ['Knife', 'MELEE', 'FREE'],
  ];
  for (const [name, type, price] of entries) {
    const button = document.createElement('button');
    button.className = 'buy-card';
    button.innerHTML = `<span class="buy-type">${type}</span><strong>${name}</strong><small>${price}</small>`;
    button.addEventListener('click', () => rounds.buy(name));
    grid.append(button);
  }
  document.addEventListener('yard-buy', () => {
    if (game.phase === 'buy' && !shotMode) buy.classList.toggle('hidden');
  });
  document.addEventListener('yard-reload', () => {
    window.dispatchEvent(new CustomEvent('yard-reload-action'));
  });
  document.addEventListener('yard-knife', () => {
    window.dispatchEvent(new CustomEvent('yard-knife-action'));
  });
  $('close-buy').addEventListener('click', () => buy.classList.add('hidden'));
  $('restart').addEventListener('click', () => window.dispatchEvent(new CustomEvent('yard-restart')));
  $('start-hint').classList.toggle('hidden', shotMode !== 'start');
  if (shotMode === 'start') buy.classList.remove('hidden');
  if (shotMode === 'end') {
    game.phase = 'post';
    game.winner = 'EMBER';
    game.result = 'Yard secured';
    game.scores.EMBER = Math.max(1, game.scores.EMBER);
  }

  function feed(killer, text) {
    const item = document.createElement('div');
    item.className = 'feed-item';
    item.innerHTML = `<b>${escapeText(killer)}</b><span>${escapeText(text)}</span>`;
    $('killfeed').prepend(item);
    setTimeout(() => item.remove(), 4800);
  }

  function update(player, bots, controls) {
    $('health-value').textContent = Math.ceil(player.health);
    $('health-fill').style.width = `${player.health}%`;
    $('armor-value').textContent = Math.ceil(player.armor);
    $('armor-fill').style.width = `${player.armor * 2}%`;
    $('money').textContent = `$${game.money}`;
    $('buy-balance').textContent = `EMBER / $${game.money}`;
    $('ammo').innerHTML = weapon.reloading > 0 ? 'RELOAD'
      : WEAPONS[weapon.name].knife ? 'MELEE'
        : `${weapon.ammo}<small> / ${weapon.reserve}${game.grenades ? ` · G${game.grenades}` : ''}</small>`;
    $('weapon-name').textContent = weapon.name;
    $('score-ember').textContent = game.scores.EMBER;
    $('score-harbor').textContent = game.scores.HARBOR;
    $('round-number').textContent = `${String(game.round).padStart(2, '0')} / 16`;
    const timer = game.charge.planted ? game.charge.timer : game.roundTimer;
    $('timer').textContent = formatTime(Math.max(0, timer));
    $('timer-label').textContent = game.charge.planted ? `CHARGE ${game.charge.site.name}` : game.phase === 'buy' ? 'BUY PHASE' : 'ROUND';
    $('phase-label').textContent = game.phase === 'buy' ? 'PREPARE' : game.charge.planted ? 'CHARGE ACTIVE' : 'LIVE ROUND';
    $('plant-progress').style.width = `${Math.max(0, Math.min(1, game.charge.progress)) * 100}%`;
    $('plant-prompt').classList.toggle('visible', game.charge.progress > 0);
    const crosshair = $('crosshair');
    crosshair.style.setProperty('--spread', `${Math.min(24, player.spread * 390)}px`);
    crosshair.classList.toggle('hit', game.hitmarker > 0);
    game.hitmarker = Math.max(0, (game.hitmarker || 0) - 0.045);
    $('damage-indicator').style.opacity = `${player.damageFlash}`;
    $('damage-indicator').style.transform = `rotate(${player.damageDirection ? Math.atan2(player.damageDirection.x, player.damageDirection.z) * 57.3 : 0}deg)`;
    const overlay = $('round-overlay');
    overlay.classList.toggle('visible', game.phase === 'post' || game.phase === 'match');
    if (game.phase === 'match') {
      $('banner-kicker').textContent = 'MATCH COMPLETE';
      $('banner-title').textContent = game.scores.EMBER > game.scores.HARBOR ? 'EMBER VICTORY' : 'HARBOR VICTORY';
      $('banner-result').textContent = `Final score ${game.scores.EMBER} — ${game.scores.HARBOR}`;
      $('restart').classList.remove('hidden');
    } else if (game.phase === 'post') {
      $('banner-kicker').textContent = `ROUND ${game.round} COMPLETE`;
      $('banner-title').textContent = `${game.winner} WIN`;
      $('banner-result').textContent = game.result;
      $('restart').classList.add('hidden');
    } else {
      overlay.classList.remove('visible');
    }
    if (game.phase !== 'buy') buy.classList.add('hidden');
    $('buy-time').textContent = `${Math.ceil(game.phaseTimer)}s`;
    $('alive-ember').textContent = `E ${bots.filter((bot) => bot.alive && bot.team === 'EMBER').length + (player.alive ? 1 : 0)}`;
    $('alive-harbor').textContent = `H ${bots.filter((bot) => bot.alive && bot.team === 'HARBOR').length}`;
  }
  return { update, feed, showBuy: () => buy.classList.remove('hidden') };
}

function formatTime(seconds) {
  const whole = Math.ceil(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function escapeText(value) {
  const node = document.createElement('span');
  node.textContent = value;
  return node.innerHTML;
}
