export const COLORS = Object.freeze({
  ember: 0xff7a26,
  teal: 0x2fd4c4,
  dusk: 0x263645,
  deep: 0x111b25,
  metal: 0x46525b,
  rust: 0x714b3d,
  glow: 0xffb35c,
  water: 0x182b37,
  white: 0xe7eff1,
  red: 0xff5555,
});

export const CSS = Object.freeze({
  ember: '#ff7a26',
  teal: '#2fd4c4',
  dusk: '#263645',
  deep: '#111b25',
  glow: '#ffb35c',
  white: '#e7eff1',
  red: '#ff5555',
});

export function material(THREE, color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.72, metalness: 0.18, ...options,
  });
}
