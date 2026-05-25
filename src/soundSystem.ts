type SoundName = 'shoot' | 'hit' | 'pickup' | 'levelup' | 'gameover' | 'select';

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

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  gain = 0.04,
  delay = 0,
  endFrequency = frequency,
  pan = 0,
) {
  if (!enabled) return;
  const context = getAudioContext();
  if (context.state === 'suspended') {
    context.resume().catch(() => undefined);
  }
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const volume = context.createGain();
  const panner = context.createStereoPanner();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
  panner.pan.setValueAtTime(pan, start);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(volume);
  volume.connect(panner);
  panner.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function noise(duration: number, gain = 0.03, delay = 0, filterFrequency = 1200) {
  if (!enabled) return;
  const context = getAudioContext();
  const start = context.currentTime + delay;
  const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * duration)), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const volume = context.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(filterFrequency, start);
  filter.Q.setValueAtTime(2.4, start);
  volume.gain.setValueAtTime(0.0001, start);
  volume.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  volume.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(volume);
  volume.connect(context.destination);
  source.start(start);
  source.stop(start + duration + 0.02);
}

export function playSound(name: SoundName) {
  if (!enabled) return;

  if (name === 'shoot') {
    tone(260, 0.1, 'sine', 0.03, 0, 560, -0.08);
    tone(840, 0.13, 'triangle', 0.045, 0.012, 1280, 0.08);
    tone(1560, 0.055, 'sine', 0.022, 0.02, 960);
    noise(0.11, 0.018, 0.01, 2200);
  }

  if (name === 'hit') {
    tone(180, 0.045, 'triangle', 0.026, 0, 120);
    tone(520, 0.055, 'square', 0.018, 0.005, 360);
    noise(0.065, 0.022, 0, 780);
  }

  if (name === 'pickup') {
    tone(880, 0.06, 'sine', 0.042, 0, 1180);
    tone(1320, 0.08, 'triangle', 0.034, 0.045, 1760);
    tone(2200, 0.05, 'sine', 0.018, 0.09, 2640);
  }

  if (name === 'levelup') {
    tone(392, 0.1, 'triangle', 0.048);
    tone(587, 0.11, 'triangle', 0.052, 0.075);
    tone(784, 0.13, 'triangle', 0.055, 0.15);
    tone(1175, 0.22, 'sine', 0.04, 0.24);
    noise(0.22, 0.012, 0.08, 3400);
  }

  if (name === 'gameover') {
    tone(260, 0.22, 'sawtooth', 0.045, 0, 150);
    tone(174, 0.28, 'triangle', 0.04, 0.12, 92);
    noise(0.28, 0.02, 0.02, 420);
  }

  if (name === 'select') {
    tone(520, 0.055, 'triangle', 0.042);
    tone(780, 0.07, 'sine', 0.035, 0.045);
    tone(1040, 0.045, 'sine', 0.02, 0.095);
  }
}
