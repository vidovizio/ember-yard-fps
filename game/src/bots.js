import { COLORS, material } from './palette.js';
import { damagePlayer } from './player.js';
import { sounds } from './audio.js';

export function createBots(THREE, scene, world, player, count = 9) {
  const bots = [];
  for (let i = 0; i < count; i++) {
    const team = i < 4 ? 'EMBER' : 'HARBOR';
    const root = new THREE.Group();
    const tint = team === 'EMBER' ? COLORS.ember : COLORS.teal;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.44, 0.8, 4, 8), material(THREE, tint, {
      roughness: 0.58, metalness: 0.08, emissive: tint, emissiveIntensity: 0.16,
    }));
    body.position.y = 0.94;
    body.castShadow = true;
    root.add(body);
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.48, 0.46), material(THREE, 0x293943));
    vest.position.set(0, 1.06, -0.02);
    vest.castShadow = true;
    root.add(vest);
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.035), material(THREE, tint, {
      emissive: tint, emissiveIntensity: 0.3, roughness: 0.5,
    }));
    patch.position.set(0, 1.12, -0.255);
    patch.castShadow = true;
    root.add(patch);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), material(THREE, 0xf0c69e, { roughness: 0.76 }));
    head.position.y = 1.72;
    head.castShadow = true;
    root.add(head);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.4, 0.42), material(THREE, 0x39464d));
    legs.position.y = 0.28;
    root.add(legs);
    scene.add(root);
    const bot = {
      id: i, team, root, position: root.position, alive: true, health: 100, armor: 35,
      hitboxes: [head, vest, legs], cooldown: 0, target: null, routeIndex: i % world.waypoints.length,
      targetState: { position: null, player: false, bot: null, distance: Infinity },
      hold: 0, reaction: 0.3 + Math.random() * 0.5, state: 'advance', kills: 0,
    };
    for (const [index, hitbox] of bot.hitboxes.entries()) {
      hitbox.userData.bot = bot;
      hitbox.userData.hitPart = index === 0 ? 'head' : index === 2 ? 'leg' : 'body';
    }
    bots.push(bot);
  }
  resetBots(bots, world, 1);
  return bots;
}

export function resetBots(bots, world, round) {
  for (const bot of bots) {
    const teamSpawns = world.spawns[bot.team];
    const spawn = teamSpawns[bot.team === 'EMBER' ? bot.id : bot.id - 4];
    bot.position.copy(spawn);
    bot.position.x += (round % 3) * (bot.team === 'EMBER' ? 0.1 : -0.1);
    let nearest = 0;
    let nearestDistance = Infinity;
    for (let i = 0; i < world.waypoints.length; i++) {
      const distance = bot.position.distanceToSquared(world.waypoints[i]);
      if (distance < nearestDistance) { nearestDistance = distance; nearest = i; }
    }
    bot.routeIndex = nearest;
    bot.root.visible = true;
    bot.alive = true;
    bot.health = 100;
    bot.armor = 35;
    bot.cooldown = 0.8 + bot.id * 0.13;
    bot.target = null;
    bot.state = 'advance';
    bot.hold = 0;
  }
}

export function hurtBot(bot, amount) {
  if (!bot.alive) return false;
  let damage = amount;
  const absorbed = Math.min(bot.armor, damage * 0.38);
  bot.armor -= absorbed;
  bot.health -= damage - absorbed;
  if (bot.health <= 0) {
    bot.health = 0;
    bot.alive = false;
    bot.root.visible = false;
    return true;
  }
  return false;
}

function visible(from, to, colliders, targetHeight = 1.1) {
  const dx = to.x - from.x;
  const dy = to.y + targetHeight - (from.y + 1.4);
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dy, dz);
  if (length < 0.001) return true;
  const dirX = dx / length, dirY = dy / length, dirZ = dz / length;
  for (const box of colliders) {
    if (box.maxY < 0.2) continue;
    let low = 0, high = length;
    let a, b;
    if (Math.abs(dirX) < 0.0001) { if (from.x < box.minX || from.x > box.maxX) continue; }
    else {
      a = (box.minX - from.x) / dirX; b = (box.maxX - from.x) / dirX;
      if (a > b) { const swap = a; a = b; b = swap; }
      low = Math.max(low, a); high = Math.min(high, b);
    }
    if (low > high) continue;
    const originY = from.y + 1.4;
    if (Math.abs(dirY) < 0.0001) { if (originY < 0 || originY > box.maxY) continue; }
    else {
      a = (0 - originY) / dirY; b = (box.maxY - originY) / dirY;
      if (a > b) { const swap = a; a = b; b = swap; }
      low = Math.max(low, a); high = Math.min(high, b);
    }
    if (low > high) continue;
    if (Math.abs(dirZ) < 0.0001) { if (from.z < box.minZ || from.z > box.maxZ) continue; }
    else {
      a = (box.minZ - from.z) / dirZ; b = (box.maxZ - from.z) / dirZ;
      if (a > b) { const swap = a; a = b; b = swap; }
      low = Math.max(low, a); high = Math.min(high, b);
    }
    const blocked = low <= high;
    if (blocked && high > 0.1 && low < length - 0.7) return false;
  }
  return true;
}

function nearestOpponent(bot, bots, player, colliders) {
  const result = bot.targetState;
  result.position = null;
  result.player = false;
  result.bot = null;
  result.distance = Infinity;
  if (bot.team === 'HARBOR' && player.alive) {
    const distance = bot.position.distanceTo(player.position);
    if (distance < 34 && visible(bot.position, player.position, colliders)) {
      result.position = player.position;
      result.player = true;
      result.distance = distance;
      return result;
    }
  }
  for (const other of bots) {
    if (!other.alive || other.team === bot.team || other === bot) continue;
    const distance = bot.position.distanceTo(other.position);
    if (distance < 32 && distance < result.distance && visible(bot.position, other.position, colliders)) {
      result.position = other.position;
      result.bot = other;
      result.distance = distance;
    }
  }
  return result.position ? result : null;
}

export function updateBots(bots, dt, context) {
  const { world, player, phase, charge, onKill, onNoise, THREE } = context;
  const walk = context.walk;
  for (const bot of bots) {
    if (!bot.alive) continue;
    bot.cooldown = Math.max(0, bot.cooldown - dt);
    bot.reaction = Math.max(0, bot.reaction - dt);
    bot.hold = Math.max(0, bot.hold - dt);
    const enemy = nearestOpponent(bot, bots, player, world.colliders);
    const heard = context.noisePosition && context.noiseAge < 4 && bot.position.distanceTo(context.noisePosition) < 38;
    if (enemy && enemy.distance < 27) {
      bot.target = enemy;
      bot.state = 'engage';
      bot.root.lookAt(enemy.position.x, bot.position.y, enemy.position.z);
      if (bot.cooldown <= 0 && bot.reaction <= 0 && enemy.distance < 26) {
        bot.cooldown = 0.58 + Math.random() * 0.28;
        bot.reaction = 0.15;
        const spread = enemy.distance > 15 ? 0.1 : 0.06;
        const chance = Math.max(0.08, 0.54 - enemy.distance * 0.013);
        onNoise(bot.position);
        sounds.shot(0.45);
        if (Math.random() < chance) {
          if (enemy.player) {
            damagePlayer(player, 8 + Math.random() * 8, bot.position.clone().sub(player.position).normalize());
          } else if (hurtBot(enemy.bot, 12)) {
            onKill(bot, enemy.bot);
          }
        } else if (spread > 0) bot.reaction = 0.22;
      }
      continue;
    }
    if (heard) bot.state = 'investigate';
    else if (bot.team === 'HARBOR') bot.state = 'hold';
    else bot.state = 'advance';

    let destination;
    if (bot.team === 'HARBOR' && charge.planted) destination = charge.site.position;
    else if (bot.team === 'HARBOR') destination = world.sites[bot.id % 2].position;
    else destination = world.sites[(bot.id + Math.floor(bot.id / 2)) % 2].position;
    if (heard && context.noisePosition) destination = context.noisePosition;
    if (bot.team === 'HARBOR' && !charge.planted && bot.position.distanceTo(destination) < 6) {
      bot.hold = 0.4;
      continue;
    }
    if (bot.hold > 0) continue;
    let goalIndex = 0;
    let distance = Infinity;
    for (let i = 0; i < world.waypoints.length; i++) {
      const d = world.waypoints[i].distanceToSquared(destination);
      if (d < distance) { distance = d; goalIndex = i; }
    }
    const waypoint = world.waypoints[bot.routeIndex];
    if (bot.routeIndex !== goalIndex && bot.position.distanceToSquared(waypoint) < 4) {
      bot.routeIndex += Math.sign(goalIndex - bot.routeIndex);
    }
    const routeTarget = bot.routeIndex === goalIndex ? destination : world.waypoints[bot.routeIndex];
    walk.set(routeTarget.x - bot.position.x, 0, routeTarget.z - bot.position.z);
    if (walk.lengthSq() > 0.2) {
      walk.normalize();
      const speed = bot.state === 'investigate' ? 4.1 : 2.8;
      const nextX = bot.position.x + walk.x * speed * dt;
      const nextZ = bot.position.z + walk.z * speed * dt;
      let blocked = false;
      for (const c of world.colliders) {
        if (nextX + 0.5 > c.minX && nextX - 0.5 < c.maxX && nextZ + 0.5 > c.minZ && nextZ - 0.5 < c.maxZ && c.maxY > 1.7) {
          blocked = true;
          break;
        }
      }
      if (!blocked) bot.position.set(nextX, 0, nextZ);
      else if (bot.routeIndex !== goalIndex) bot.routeIndex += Math.sign(goalIndex - bot.routeIndex);
      else bot.routeIndex = Math.max(0, Math.min(world.waypoints.length - 1, bot.routeIndex + (bot.team === 'EMBER' ? 1 : -1)));
      bot.root.lookAt(bot.position.x + walk.x, bot.position.y, bot.position.z + walk.z);
    }
  }
}
