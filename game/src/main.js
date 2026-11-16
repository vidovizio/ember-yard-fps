import * as THREE from 'three';
import { game, seedRandom, FIXED_DT, PHASES } from './state.js';
import { createWorld, addRain, updateRain } from './world.js';
import { createPlayer, updatePlayer } from './player.js';
import { createWeapon, createViewModel, updateViewModel, updateWeapon, reload, equip } from './weapon.js';
import { createBots, updateBots, hurtBot } from './bots.js';
import { createRounds } from './rounds.js';
import { createHUD } from './hud.js';
import { attachInput, readControls } from './input.js';
import { sounds } from './audio.js';

const query = new URLSearchParams(location.search);
const shotMode = query.get('shot');
game.shotMode = shotMode;
if (query.has('seed')) {
  seedRandom(query.get('seed'));
  Math.random = game.rng;
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, 0.08, 180);
scene.add(camera);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
document.body.prepend(renderer.domElement);
renderer.domElement.id = 'yard-canvas';
const world = createWorld(THREE, scene);
const rain = addRain(THREE, scene);
const player = createPlayer(THREE, camera, world.spawns.EMBER[0]);
const weapon = createWeapon(THREE);
const viewModel = createViewModel(THREE, camera);
game.player = player;
const bots = createBots(THREE, scene, world, player);
const enemyBots = bots.filter((bot) => bot.team === 'HARBOR');
game.bots = bots;
const rounds = createRounds(game, world, player, bots, weapon);
const hud = createHUD(game, rounds, weapon, shotMode);
attachInput(renderer, Boolean(shotMode));

const walk = new THREE.Vector3();
game.noise.position = new THREE.Vector3();
function recordNoise(position) {
  game.noise.position.copy(position);
  game.noise.age = 0;
}
function killFeed(killer, victim) {
  hud.feed(killer === 'PLAYER' ? 'YOU' : killer.team, `eliminated ${victim.team} ${String(victim.id + 1).padStart(2, '0')}`);
  if (killer === 'PLAYER') {
    game.money += 300;
    game.kills++;
  }
  game.hitmarker = 1;
}
function roundEnd(winner) {
  game.feed.unshift({ winner, result: game.result });
}
const hooks = {
  feed: (killer, text) => hud.feed(killer, text),
  roundEnd,
};
const grenade = { mesh: null, velocity: new THREE.Vector3(), timer: 0 };

function resetMatch() {
  game.round = 1;
  game.scores.EMBER = 0;
  game.scores.HARBOR = 0;
  game.money = 800;
  game.grenades = 0;
  game.owned = { Kestrel: true };
  game.kills = 0;
  game.phase = PHASES.BUY;
  rounds.begin();
}
window.addEventListener('yard-restart', resetMatch);
window.addEventListener('yard-reload-action', () => reload(weapon));
window.addEventListener('yard-knife-action', () => equip(weapon, 'Knife'));
window.addEventListener('yard-grenade', () => {
  if (game.phase !== PHASES.LIVE || game.grenades <= 0 || grenade.mesh) return;
  game.grenades--;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  grenade.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0x5d756f, metalness: 0.6, roughness: 0.35 }));
  grenade.mesh.position.copy(camera.position).addScaledVector(direction, 0.7);
  scene.add(grenade.mesh);
  grenade.velocity.copy(direction).multiplyScalar(13);
  grenade.velocity.y += 3.8;
  grenade.timer = 1.65;
  recordNoise(player.position);
});

function updateGrenade(dt) {
  if (!grenade.mesh) return;
  grenade.timer -= dt;
  grenade.velocity.y -= 9.8 * dt;
  grenade.mesh.position.addScaledVector(grenade.velocity, dt);
  if (grenade.mesh.position.y < 0.16) {
    grenade.mesh.position.y = 0.16;
    grenade.velocity.y = Math.abs(grenade.velocity.y) * 0.42;
    grenade.velocity.x *= 0.68;
    grenade.velocity.z *= 0.68;
  }
  if (grenade.timer > 0) return;
  for (const bot of bots) {
    if (!bot.alive || bot.team !== 'HARBOR') continue;
    const distance = bot.position.distanceTo(grenade.mesh.position);
    if (distance < 9 && hurtBot(bot, (1 - distance / 9) * 150)) killFeed('SHARD', bot);
  }
  scene.remove(grenade.mesh);
  grenade.mesh.geometry.dispose();
  grenade.mesh.material.dispose();
  grenade.mesh = null;
  hud.feed('SHARD', 'fragment burst');
  sounds.shot(1.7);
}

function configureShot() {
  if (!shotMode) return;
  game.paused = true;
  camera.position.set(-38, 1.65, -7);
  if (shotMode === 'start') {
    camera.lookAt(1, 1.3, -3);
    player.position.set(-38, 0, -7);
  } else if (shotMode === 'play') {
    game.phase = PHASES.LIVE;
    game.roundTimer = 61;
    player.position.set(-5, 0, 5);
    camera.position.set(-5, 1.65, 5);
    const target = enemyBots[0];
    target.position.set(2, 0, -1);
    target.root.visible = true;
    target.alive = true;
    target.root.lookAt(-5, 0, 5);
    camera.lookAt(2, 1.13, -1);
    player.yaw = Math.atan2(-camera.getWorldDirection(new THREE.Vector3()).x, -camera.getWorldDirection(new THREE.Vector3()).z);
    player.pitch = camera.rotation.x;
    weapon.name = 'Vandal Prime';
    weapon.ammo = 24;
    weapon.reserve = 72;
  } else if (shotMode === 'end') {
    game.phase = PHASES.POST;
    game.round = 9;
    game.winner = 'EMBER';
    game.result = 'Yard secured';
    game.scores.EMBER = 5;
    game.scores.HARBOR = 3;
    player.position.set(-14, 0, 12);
    camera.position.set(-14, 1.65, 12);
    camera.lookAt(2, 1.1, -3);
    const teammate = bots.find((bot) => bot.team === 'EMBER');
    teammate.position.set(-4, 0, 3);
    teammate.root.visible = true;
    teammate.alive = true;
    teammate.root.lookAt(2, 0, -3);
    const charge = new THREE.Group();
    const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.5), new THREE.MeshStandardMaterial({
      color: 0x303a3d, metalness: 0.75, roughness: 0.28, emissive: 0xff7a26, emissiveIntensity: 0.22,
    }));
    caseMesh.position.y = 0.2;
    charge.add(caseMesh);
    const chargeLight = new THREE.PointLight(0xff7a26, 28, 12);
    chargeLight.position.set(0, 0.8, 0);
    charge.add(chargeLight);
    charge.position.copy(world.sites[0].position);
    scene.add(charge);
  }
  camera.rotation.order = 'YXZ';
}
configureShot();

let accumulator = 0;
let last = performance.now();
let controls = {};
function simulate(dt) {
  controls = readControls();
  if (game.phase === PHASES.LIVE && player.alive) {
    updatePlayer(player, dt, controls, world.colliders);
    if (controls.reload) reload(weapon);
    if (controls.knife) equip(weapon, 'Knife');
    if (controls.slot2) equip(weapon, 'Kestrel');
    if (controls.slot3 && game.owned['Longbow-9']) equip(weapon, 'Longbow-9');
    if (controls.slot4 && game.owned.Osprey) equip(weapon, 'Osprey');
    else if (controls.slot4 && game.owned['Vandal Prime']) equip(weapon, 'Vandal Prime');
    updateWeapon(weapon, player, dt, controls, enemyBots, world.colliders,
      (bot, damage) => { if (hurtBot(bot, damage)) killFeed('PLAYER', bot); else game.hitmarker = 1; },
      recordNoise, THREE, camera);
    const fov = weapon.zoom ? 34 : 76;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    updateBots(bots, dt, { world, player, phase: game.phase, charge: game.charge, onKill: killFeed, onNoise: recordNoise, noisePosition: game.noise.age < 4 ? game.noise.position : null, noiseAge: game.noise.age, THREE, walk });
  }
  game.noise.age += dt;
  updateGrenade(dt);
  rounds.update(dt, controls, hooks);
  updateRain(rain, dt);
}
function frame(now) {
  const delta = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!game.paused) {
    accumulator += delta;
    while (accumulator >= FIXED_DT) {
      simulate(FIXED_DT);
      accumulator -= FIXED_DT;
    }
  }
  hud.update(player, bots, controls);
  updateViewModel(viewModel, weapon, delta);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
if (shotMode) {
  hud.update(player, bots, controls);
  updateViewModel(viewModel, weapon, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(() => { window.__shotReady = true; });
} else {
  requestAnimationFrame(frame);
}
