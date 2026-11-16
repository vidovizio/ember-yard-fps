import { sounds } from './audio.js';

export function createPlayer(THREE, camera, spawn) {
  const player = {
    position: spawn.clone(),
    velocity: new THREE.Vector3(),
    yaw: -Math.PI / 2,
    pitch: 0,
    health: 100,
    armor: 50,
    alive: true,
    crouched: false,
    grounded: true,
    spread: 0,
    recoil: 0,
    camera,
    damageFlash: 0,
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    candidate: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
  };
  camera.position.set(spawn.x, 1.65, spawn.z);
  return player;
}

function blocked(x, z, y, colliders, radius) {
  for (const c of colliders) {
    if (y >= c.maxY + 0.1) continue;
    if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) return true;
  }
  return false;
}

export function updatePlayer(player, dt, controls, colliders) {
  const { forward, right, candidate, up } = player;
  const height = controls.crouch ? 1.05 : 1.65;
  player.crouched = controls.crouch;
  const camera = player.camera;
  player.yaw -= controls.lookX * 0.0022;
  player.pitch = Math.max(-1.48, Math.min(1.48, player.pitch - controls.lookY * 0.0022));
  camera.rotation.order = 'YXZ';
  camera.rotation.set(player.pitch, player.yaw, 0);
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(forward, up).normalize();
  let dx = 0;
  let dz = 0;
  if (controls.forward) { dx += forward.x; dz += forward.z; }
  if (controls.back) { dx -= forward.x; dz -= forward.z; }
  if (controls.right) { dx += right.x; dz += right.z; }
  if (controls.left) { dx -= right.x; dz -= right.z; }
  const moving = dx !== 0 || dz !== 0;
  const length = Math.hypot(dx, dz) || 1;
  dx /= length;
  dz /= length;
  const speed = controls.crouch ? 3.2 : 6.4;
  const accel = player.grounded ? 29 : 9;
  const targetX = dx * speed;
  const targetZ = dz * speed;
  player.velocity.x += (targetX - player.velocity.x) * Math.min(1, accel * dt);
  player.velocity.z += (targetZ - player.velocity.z) * Math.min(1, accel * dt);
  if (!moving && player.grounded) {
    player.velocity.x *= Math.max(0, 1 - 14 * dt);
    player.velocity.z *= Math.max(0, 1 - 14 * dt);
  }
  if (controls.jump && player.grounded) {
    player.velocity.y = 6.2;
    player.grounded = false;
  }
  player.velocity.y -= 17 * dt;
  candidate.copy(player.position);
  candidate.x += player.velocity.x * dt;
  if (!blocked(candidate.x, candidate.z, candidate.y, colliders, 0.35)) player.position.x = candidate.x;
  else player.velocity.x = 0;
  candidate.copy(player.position);
  candidate.z += player.velocity.z * dt;
  if (!blocked(candidate.x, candidate.z, candidate.y, colliders, 0.35)) player.position.z = candidate.z;
  else player.velocity.z = 0;
  player.position.y += player.velocity.y * dt;
  if (player.position.y <= 0) {
    player.position.y = 0;
    player.velocity.y = 0;
    player.grounded = true;
  }
  camera.position.set(player.position.x, player.position.y + height, player.position.z);
  player.spread = Math.max(0.004, Math.min(0.12,
    0.004 + (moving ? 0.018 : 0) + (!player.grounded ? 0.045 : 0) + (controls.crouch ? -0.003 : 0) + player.recoil * 0.005));
  player.recoil = Math.max(0, player.recoil - dt * 1.8);
  player.damageFlash = Math.max(0, player.damageFlash - dt * 1.8);
}

export function damagePlayer(player, amount, direction) {
  if (!player.alive) return false;
  let damage = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, damage * 0.45);
    player.armor -= absorbed;
    damage -= absorbed;
  }
  player.health = Math.max(0, player.health - damage);
  player.damageFlash = 1;
  sounds.hurt();
  if (direction) player.damageDirection = direction;
  if (player.health === 0) player.alive = false;
  return !player.alive;
}
