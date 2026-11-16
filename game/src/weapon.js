import { sounds } from './audio.js';

export const WEAPONS = Object.freeze({
  Kestrel: { name: 'Kestrel', cost: 0, damage: 34, rate: 0.22, mag: 12, reserve: 48, reload: 1.35, spread: 0.014 },
  'Longbow-9': { name: 'Longbow-9', cost: 900, damage: 22, rate: 0.085, mag: 28, reserve: 84, reload: 1.65, spread: 0.022 },
  'Vandal Prime': { name: 'Vandal Prime', cost: 2700, damage: 36, rate: 0.12, mag: 30, reserve: 90, reload: 1.85, spread: 0.011 },
  Osprey: { name: 'Osprey', cost: 4750, damage: 92, rate: 1.15, mag: 5, reserve: 25, reload: 2.2, spread: 0.002, scoped: true },
  Shard: { name: 'Shard', cost: 300, grenade: true },
  Knife: { name: 'Knife', cost: 0, knife: true },
});

export function createWeapon(THREE) {
  return {
    name: 'Kestrel', ammo: 12, reserve: 48, cooldown: 0, reloading: 0, grenade: false, zoom: false,
    flashTimer: 0, direction: new THREE.Vector3(), raycaster: new THREE.Raycaster(), hitMeshes: [], intersections: [],
  };
}

export function createViewModel(THREE, camera) {
  const group = new THREE.Group();
  group.position.set(0.39, -0.36, -0.78);
  camera.add(group);
  const gunmetal = new THREE.MeshStandardMaterial({ color: 0x45535b, metalness: 0.78, roughness: 0.3 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x222c33, metalness: 0.62, roughness: 0.4 });
  const ember = new THREE.MeshBasicMaterial({ color: 0xff7a26, toneMapped: false });
  const steel = new THREE.MeshStandardMaterial({ color: 0xb2c0c3, metalness: 0.84, roughness: 0.24 });
  const addBox = (size, position, material, rotationX = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.rotation.x = rotationX;
    mesh.renderOrder = 10;
    group.add(mesh);
    return mesh;
  };
  addBox([0.22, 0.15, 0.47], [0, 0, -0.1], gunmetal);
  addBox([0.25, 0.07, 0.26], [0, 0.105, -0.08], darkMetal);
  addBox([0.12, 0.17, 0.15], [0, -0.14, 0.035], darkMetal, -0.2);
  addBox([0.16, 0.12, 0.27], [0, 0.015, 0.27], darkMetal);
  addBox([0.13, 0.026, 0.18], [0, 0.096, -0.02], ember);
  addBox([0.18, 0.035, 0.07], [0, 0.095, -0.39], steel);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.038, 0.34, 8), steel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.005, -0.48);
  barrel.renderOrder = 10;
  group.add(barrel);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.07, 8), darkMetal);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.005, -0.65);
  muzzle.renderOrder = 10;
  group.add(muzzle);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.07), darkMetal);
  sight.position.set(0, 0.16, -0.14);
  sight.renderOrder = 10;
  group.add(sight);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), ember);
  flash.position.set(0, 0, -0.76);
  flash.scale.setScalar(0);
  flash.renderOrder = 11;
  group.add(flash);
  const flashLight = new THREE.PointLight(0xff9a42, 0, 3);
  flashLight.position.copy(flash.position);
  group.add(flashLight);
  return { group, flash, flashLight, baseY: -0.36, currentName: '' };
}

export function updateViewModel(viewModel, weapon, dt) {
  weapon.flashTimer = Math.max(0, weapon.flashTimer - dt);
  const reload = weapon.reloading > 0;
  viewModel.group.position.y += ((reload ? viewModel.baseY - 0.19 : viewModel.baseY) - viewModel.group.position.y) * Math.min(1, dt * 13);
  viewModel.group.rotation.x += ((reload ? -0.36 : 0) - viewModel.group.rotation.x) * Math.min(1, dt * 13);
  const scale = weapon.name === 'Osprey' ? 1.12 : weapon.name === 'Kestrel' ? 0.84 : weapon.name === 'Knife' ? 0.75 : 1;
  if (weapon.name !== viewModel.currentName) {
    viewModel.currentName = weapon.name;
    viewModel.group.scale.set(scale, scale, scale);
  }
  const flash = weapon.flashTimer > 0;
  viewModel.flash.scale.setScalar(flash ? 1 : 0);
  viewModel.flashLight.intensity = flash ? 7 : 0;
}

export function equip(weapon, name) {
  const def = WEAPONS[name];
  if (!def) return;
  weapon.name = name;
  weapon.ammo = def.mag ?? 0;
  weapon.reserve = def.reserve ?? 0;
  weapon.reloading = 0;
  weapon.zoom = false;
  if (name === 'Shard') weapon.grenade = true;
}

export function reload(weapon) {
  const def = WEAPONS[weapon.name];
  if (!def || def.grenade || def.knife || weapon.ammo >= def.mag || weapon.reserve <= 0 || weapon.reloading > 0) return;
  weapon.reloading = def.reload;
  sounds.reload();
}

export function updateWeapon(weapon, player, dt, input, targets, colliders, onHit, onNoise, THREE, camera) {
  weapon.cooldown = Math.max(0, weapon.cooldown - dt);
  if (weapon.reloading > 0) {
    weapon.reloading -= dt;
    if (weapon.reloading <= 0) {
      const def = WEAPONS[weapon.name];
      const take = Math.min(def.mag - weapon.ammo, weapon.reserve);
      weapon.ammo += take;
      weapon.reserve -= take;
    }
  }
  if (weapon.name === 'Osprey' && input.scope && !weapon.scopeHeld) weapon.zoom = !weapon.zoom;
  weapon.scopeHeld = input.scope;
  if (!input.fire || weapon.cooldown > 0 || weapon.reloading > 0) return;
  const def = WEAPONS[weapon.name];
  if (def?.knife) {
    weapon.cooldown = 0.45;
    onNoise(player.position);
    const closest = targets.reduce((best, bot) => {
      const distance = bot.position.distanceTo(player.position);
      return bot.alive && distance < 2.5 && distance < best.distance ? { bot, distance } : best;
    }, { bot: null, distance: Infinity });
    if (closest.bot) onHit(closest.bot, def.damage ?? 52, 'body');
    sounds.shot(0.4);
    return;
  }
  if (def?.grenade) return;
  if (weapon.ammo <= 0) { reload(weapon); return; }
  weapon.cooldown = def.rate;
  weapon.ammo--;
  weapon.flashTimer = 0.08;
  player.recoil = Math.min(1.4, player.recoil + (def.scoped ? 0.75 : 0.42));
  player.pitch = Math.max(-1.48, player.pitch - (def.scoped ? 0.03 : 0.012));
  camera.rotation.x = player.pitch;
  sounds.shot(def.damage / 34);
  onNoise(player.position);
  const spread = player.spread * (weapon.zoom ? 0.25 : 1);
  const direction = weapon.direction;
  camera.getWorldDirection(direction);
  direction.x += (Math.random() - 0.5) * spread;
  direction.y += (Math.random() - 0.5) * spread;
  direction.z += (Math.random() - 0.5) * spread;
  direction.normalize();
  const meshes = weapon.hitMeshes;
  meshes.length = 0;
  for (const target of targets) {
    if (!target.alive) continue;
    for (const hitbox of target.hitboxes) meshes.push(hitbox);
  }
  for (const collider of colliders) meshes.push(collider.mesh);
  const raycaster = weapon.raycaster;
  raycaster.set(camera.position, direction);
  raycaster.far = 95;
  const hits = weapon.intersections;
  hits.length = 0;
  raycaster.intersectObjects(meshes, false, hits);
  const hit = hits[0];
  if (hit?.object.userData.bot) {
    const part = hit.object.userData.hitPart;
    const multiplier = part === 'head' ? 4 : part === 'leg' ? 0.75 : 1;
    onHit(hit.object.userData.bot, def.damage * multiplier, part);
  }
}
