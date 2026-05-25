type SoundName = 'shoot' | 'pickup' | 'levelup' | 'gameover' | 'select';

let audioContext: AudioContext | null = null;
let enabled = false;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function unlockAudio() {
  const context = getAudioContext();
  if (context.state === 'suspended') {
    context.resume().catch(() => undefined);
  }
  enabled = true;
}

function tone(frequency: number, duration: number, type: OscillatorType, gain = 0.04, delay = 0) {
  if (!enabled) return;
  const context = getAudioContext();
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
    tone(620, 0.07, 'triangle', 0.028);
    tone(920, 0.05, 'sine', 0.018, 0.025);
  }

  if (name === 'pickup') {
    tone(760, 0.05, 'sine', 0.026);
    tone(1180, 0.06, 'sine', 0.022, 0.04);
  }

  if (name === 'levelup') {
    tone(520, 0.08, 'triangle', 0.035);
    tone(780, 0.1, 'triangle', 0.036, 0.08);
    tone(1040, 0.12, 'triangle', 0.034, 0.17);
  }

  if (name === 'gameover') {
    tone(260, 0.14, 'sawtooth', 0.034);
    tone(180, 0.2, 'sawtooth', 0.026, 0.14);
  }

  if (name === 'select') {
    tone(440, 0.06, 'triangle', 0.026);
    tone(660, 0.08, 'triangle', 0.026, 0.05);
  }
}
