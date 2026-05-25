type SoundName = 'shoot' | 'pickup' | 'levelup' | 'gameover' | 'select';

let audioContext: AudioContext | null = null;
let enabled = false;

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

export function unlockAudio() {
  const context = getAudioContext();
  enabled = true;
  if (context.state === 'suspended') {
    context.resume().catch(() => undefined);
  }
}

function tone(frequency: number, duration: number, type: OscillatorType, gain = 0.04, delay = 0) {
  if (!enabled) return;
  const context = getAudioContext();
  if (context.state === 'suspended') {
    context.resume().catch(() => undefined);
  }
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const volume = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(volume);
  volume.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

export function playSound(name: SoundName) {
  if (!enabled) return;

  if (name === 'shoot') {
    tone(620, 0.07, 'triangle', 0.06);
    tone(920, 0.05, 'sine', 0.035, 0.025);
  }

  if (name === 'pickup') {
    tone(760, 0.05, 'sine', 0.055);
    tone(1180, 0.06, 'sine', 0.042, 0.04);
  }

  if (name === 'levelup') {
    tone(520, 0.08, 'triangle', 0.07);
    tone(780, 0.1, 'triangle', 0.07, 0.08);
    tone(1040, 0.12, 'triangle', 0.066, 0.17);
  }

  if (name === 'gameover') {
    tone(260, 0.14, 'sawtooth', 0.065);
    tone(180, 0.2, 'sawtooth', 0.052, 0.14);
  }

  if (name === 'select') {
    tone(440, 0.06, 'triangle', 0.06);
    tone(660, 0.08, 'triangle', 0.056, 0.05);
  }
}
