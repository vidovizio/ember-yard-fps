const held = new Set();
const pressed = new Set();
let lookX = 0;
let lookY = 0;
let mouseDown = false;
let scopeDown = false;
let bound = false;
const controls = {
  forward: false, back: false, left: false, right: false, crouch: false, jump: false,
  fire: false, lookX: 0, lookY: 0, buy: false, interact: false, reload: false,
  grenade: false, knife: false, scope: false, slot2: false, slot3: false, slot4: false,
};

export function attachInput(renderer, shotMode = false) {
  if (bound) return;
  bound = true;
  window.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    if (!held.has(event.code)) pressed.add(event.code);
    held.add(event.code);
    if (!shotMode && event.code === 'Escape' && document.pointerLockElement) document.exitPointerLock();
    if (!shotMode && event.code === 'KeyB') document.dispatchEvent(new CustomEvent('yard-buy'));
    if (!shotMode && event.code === 'KeyR') document.dispatchEvent(new CustomEvent('yard-reload'));
    if (!shotMode && event.code === 'KeyG') document.dispatchEvent(new CustomEvent('yard-grenade'));
    if (!shotMode && event.code === 'KeyE') document.dispatchEvent(new CustomEvent('yard-interact'));
    if (!shotMode && event.code === 'Digit1') document.dispatchEvent(new CustomEvent('yard-knife'));
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  renderer.domElement.addEventListener('click', () => {
    if (!shotMode && !document.pointerLockElement) renderer.domElement.requestPointerLock();
  });
  document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === renderer.domElement) {
      lookX += event.movementX;
      lookY += event.movementY;
    }
  });
  document.addEventListener('mousedown', (event) => { if (event.button === 0) mouseDown = true; });
  document.addEventListener('mouseup', (event) => { if (event.button === 0) mouseDown = false; });
  document.addEventListener('mousedown', (event) => { if (event.button === 2) { event.preventDefault(); scopeDown = true; } });
  document.addEventListener('mouseup', (event) => { if (event.button === 2) scopeDown = false; });
  renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
}

export function readControls() {
  controls.forward = held.has('KeyW');
  controls.back = held.has('KeyS');
  controls.left = held.has('KeyA');
  controls.right = held.has('KeyD');
  controls.crouch = held.has('ControlLeft') || held.has('KeyC');
  controls.jump = pressed.has('Space');
  controls.fire = mouseDown;
  controls.lookX = lookX;
  controls.lookY = lookY;
  controls.buy = pressed.has('KeyB');
  controls.interact = held.has('KeyE');
  controls.reload = pressed.has('KeyR');
  controls.grenade = pressed.has('KeyG');
  controls.knife = pressed.has('Digit1');
  controls.scope = scopeDown;
  controls.slot2 = pressed.has('Digit2');
  controls.slot3 = pressed.has('Digit3');
  controls.slot4 = pressed.has('Digit4');
  lookX = 0;
  lookY = 0;
  pressed.clear();
  return controls;
}
