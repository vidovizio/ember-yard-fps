let context;
let master;

function audio() {
  if (!context) {
    context = new window.AudioContext();
    master = context.createGain();
    master.gain.value = 0.17;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

function tone(frequency, duration, type = 'sine', volume = 0.2, slide = 0) {
  const ctx = audio();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + slide), ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  oscillator.connect(gain).connect(master);
  oscillator.start();
  oscillator.stop(ctx.currentTime + duration);
}

export const sounds = {
  shot: (power = 1) => tone(105 - power * 20, 0.09, 'sawtooth', 0.22, -65),
  hit: () => tone(620, 0.055, 'triangle', 0.22, -230),
  hurt: () => tone(190, 0.16, 'sawtooth', 0.17, -100),
  reload: () => { tone(420, 0.07, 'square', 0.12, -120); setTimeout(() => tone(260, 0.08, 'square', 0.1, 150), 125); },
  plant: () => tone(520, 0.2, 'sine', 0.18, 240),
  beep: () => tone(850, 0.06, 'square', 0.12, -250),
  round: () => { tone(440, 0.18); setTimeout(() => tone(660, 0.22), 150); },
};
