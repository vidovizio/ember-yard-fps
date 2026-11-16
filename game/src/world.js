import { COLORS, material } from './palette.js';

let Three;

function box(scene, colliders, x, y, z, w, h, d, color, solid = true, emissive = 0) {
  const mesh = new Three.Mesh(
    new Three.BoxGeometry(w, h, d),
    material(Three, color, { emissive, emissiveIntensity: emissive ? 0.6 : 0 }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (solid) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, maxY: y + h / 2, mesh });
  return mesh;
}

export function createWorld(THREE, scene) {
  Three = THREE;
  const colliders = [];
  scene.background = new THREE.Color(0x465b70);
  scene.fog = new THREE.Fog(0x91a1a6, 90, 205);
  scene.add(new THREE.HemisphereLight(0xbdd9ec, 0x4c4a46, 2.7));
  scene.add(new THREE.AmbientLight(0x778da0, 0.65));
  const skyGeometry = new THREE.SphereGeometry(195, 40, 24);
  const skyPositions = skyGeometry.attributes.position;
  const skyColors = new Float32Array(skyPositions.count * 3);
  const horizon = new THREE.Color(0xe4a37c);
  const zenith = new THREE.Color(0x304b68);
  const high = new THREE.Color(0x70849a);
  const color = new THREE.Color();
  for (let i = 0; i < skyPositions.count; i++) {
    const height = skyPositions.getY(i) / 195;
    if (height < 0.16) color.copy(horizon);
    else color.copy(high).lerp(zenith, Math.min(1, (height - 0.16) / 0.8));
    if (height < 0.16 && height > -0.05) color.lerp(high, (height + 0.05) / 0.21);
    color.toArray(skyColors, i * 3);
  }
  skyGeometry.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
  const sky = new THREE.Mesh(skyGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false }));
  sky.renderOrder = -1;
  scene.add(sky);
  const sun = new THREE.DirectionalLight(0xffd0a6, 3.8);
  sun.position.set(-18, 34, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -48;
  sun.shadow.camera.right = 48;
  sun.shadow.camera.top = 48;
  sun.shadow.camera.bottom = -48;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 100), material(THREE, 0x59666b, { metalness: 0.24, roughness: 0.42 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  scene.add(ground);
  for (let i = 0; i < 16; i++) {
    box(scene, colliders, -55 + i * 7.3, 5, -47, 7, 10, 4, i % 2 ? COLORS.rust : COLORS.metal);
    box(scene, colliders, -55 + i * 7.3, 5, 47, 7, 10, 4, i % 2 ? COLORS.metal : COLORS.rust);
  }
  // Container lanes: west dock, central crane row, and east rail remain navigable.
  const containers = [
    [-31, -15, 11, 5, 18], [-31, 16, 11, 5, 18], [-18, 2, 10, 5, 15],
    [-2, -17, 12, 5, 18], [-2, 17, 12, 5, 18], [13, 0, 10, 5, 15],
    [30, -16, 12, 5, 20], [30, 17, 12, 5, 20], [44, 1, 8, 4, 16],
    [-43, 0, 8, 4, 12], [20, 35, 10, 4, 10], [-23, 35, 10, 4, 10],
  ];
  const containerPalette = [0xa64e2f, 0x267d78, 0x586d7b, 0x8a583e];
  containers.forEach(([x, z, w, h, d], i) => {
    const painted = box(scene, colliders, x, h / 2, z, w, h, d, containerPalette[i % containerPalette.length]);
    painted.material.roughness = 0.58;
    painted.material.metalness = 0.28;
  });

  // Crane pad and fuel depot: colored perimeter marks identify plant sites.
  box(scene, colliders, 3, 0.025, -3, 13, 0.05, 11, 0x667376, false);
  box(scene, colliders, 35, 0.025, 3, 13, 0.05, 11, 0x667376, false);
  const paint = new THREE.MeshBasicMaterial({ color: 0xe9dfbd, toneMapped: false });
  const siteLetter = (x, z, letter) => {
    const stroke = (offsetX, offsetZ, width, depth, angle = 0) => {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, depth), paint);
      mark.position.set(x + offsetX, 0.105, z + offsetZ);
      mark.rotation.y = angle;
      scene.add(mark);
    };
    if (letter === 'A') {
      stroke(-0.4, 0, 0.12, 1.3, -0.33);
      stroke(0.4, 0, 0.12, 1.3, 0.33);
      stroke(0, 0.08, 0.62, 0.11);
    } else {
      stroke(-0.31, 0, 0.12, 1.3);
      stroke(0, -0.59, 0.55, 0.11);
      stroke(0, 0, 0.48, 0.11);
      stroke(0, 0.59, 0.55, 0.11);
      stroke(0.31, -0.3, 0.12, 0.6);
      stroke(0.31, 0.3, 0.12, 0.6);
    }
  };
  siteLetter(-1.6, -6.4, 'A');
  siteLetter(30.4, -0.4, 'B');
  for (const [cx, cz, tint] of [[3, -3, COLORS.ember], [35, 3, COLORS.teal]]) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.035, 10.4), new THREE.MeshBasicMaterial({ color: tint, wireframe: true, toneMapped: false }));
    marker.position.set(cx, 0.2, cz);
    scene.add(marker);
  }
  const lamps = [
    { x: 3, z: -3, color: 0xffc27f },
    { x: 35, z: 3, color: 0x76f2dc },
    { x: -12, z: 9, color: 0xffa05d },
  ];
  for (const lamp of lamps) {
    box(scene, colliders, lamp.x, 3.9, lamp.z, 0.28, 7.8, 0.28, 0x39464b, false);
    box(scene, colliders, lamp.x, 7.75, lamp.z, 1.1, 0.22, 0.75, 0xf0bd7d, false, lamp.color);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 8), new THREE.MeshBasicMaterial({ color: lamp.color, toneMapped: false }));
    glow.position.set(lamp.x, 7.55, lamp.z);
    scene.add(glow);
    const light = new THREE.PointLight(lamp.color, 110, 39, 1.5);
    light.position.set(lamp.x, 7.25, lamp.z);
    scene.add(light);
  }
  const lanePaint = new THREE.MeshBasicMaterial({ color: 0xc3c7b1, transparent: true, opacity: 0.78, toneMapped: false });
  for (const z of [-31, 31]) {
    for (let x = -44; x <= 44; x += 8) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.025, 0.14), lanePaint);
      dash.position.set(x, 0.015, z);
      scene.add(dash);
    }
  }
  // Raised cross-yard catwalk, with access ramps and supports.
  box(scene, colliders, -8, 5.4, 0, 29, 0.42, 2.5, 0x39464d);
  for (const x of [-18, 2]) box(scene, colliders, x, 2.6, 0, 0.6, 5.2, 0.6, 0x48545a);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(7, 0.32, 2.4), material(THREE, 0x56636a));
  ramp.position.set(-20.5, 2.7, 4.2);
  ramp.rotation.z = -0.7;
  scene.add(ramp);
  box(scene, colliders, -47, 0.7, 0, 2, 1.4, 7, COLORS.ember, false, COLORS.ember);
  box(scene, colliders, 49, 0.7, 0, 2, 1.4, 7, COLORS.teal, false, COLORS.teal);
  // Crane gantry in the center.
  for (const x of [-7, 7]) box(scene, colliders, x, 9, -5, 0.8, 18, 0.8, 0x647078);
  box(scene, colliders, 0, 17.5, -5, 16, 0.8, 1.2, 0x647078);
  box(scene, colliders, 0, 0.75, -5, 6, 1.5, 4, COLORS.rust);

  const sites = [
    { name: 'A', position: new THREE.Vector3(3, 0, -3), radius: 5.6 },
    { name: 'B', position: new THREE.Vector3(35, 0, 3), radius: 5.6 },
  ];
  const waypoints = [
    new THREE.Vector3(-43, 0, 0), new THREE.Vector3(-35, 0, -8), new THREE.Vector3(-22, 0, -8),
    new THREE.Vector3(-13, 0, 0), new THREE.Vector3(-3, 0, -7), new THREE.Vector3(3, 0, -3),
    new THREE.Vector3(10, 0, 5), new THREE.Vector3(20, 0, 8), new THREE.Vector3(30, 0, 8),
    new THREE.Vector3(35, 0, 3), new THREE.Vector3(44, 0, -5), new THREE.Vector3(43, 0, 11),
    new THREE.Vector3(-26, 0, 12), new THREE.Vector3(-10, 0, 13), new THREE.Vector3(4, 0, 13),
  ];
  return {
    colliders, sites, waypoints,
    spawns: {
      EMBER: [new THREE.Vector3(-51, 0, -3), new THREE.Vector3(-51, 0, 0), new THREE.Vector3(-51, 0, 3), new THREE.Vector3(-51, 0, -5), new THREE.Vector3(-51, 0, 5)],
      HARBOR: [new THREE.Vector3(51, 0, -4), new THREE.Vector3(51, 0, -1), new THREE.Vector3(51, 0, 2), new THREE.Vector3(51, 0, 5), new THREE.Vector3(51, 0, 7)],
    },
    box,
  };
}

export function addRain(THREE, scene, count = 600) {
  const positions = new Float32Array(count * 6);
  const rain = new THREE.BufferGeometry();
  rain.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const lines = new THREE.LineSegments(rain, new THREE.LineBasicMaterial({ color: 0x9ab8c5, transparent: true, opacity: 0.3 }));
  scene.add(lines);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 112;
    const y = Math.random() * 28;
    const z = (Math.random() - 0.5) * 88;
    positions.set([x, y, z, x - 0.12, y - 0.9, z + 0.06], i * 6);
  }
  rain.attributes.position.needsUpdate = true;
  return lines;
}

export function updateRain(rain, dt) {
  const positions = rain.geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 6) {
    positions[i + 1] -= 34 * dt;
    positions[i + 4] -= 34 * dt;
    if (positions[i + 1] < 0) {
      positions[i + 1] = 24;
      positions[i + 4] = 23.1;
    }
  }
  rain.geometry.attributes.position.needsUpdate = true;
}
