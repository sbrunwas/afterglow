// SPDX-License-Identifier: AGPL-3.0-only
// Shared adapter for AudioWorklet, offline rendering, and browser/Node tests.
// All oscillator, envelope, sample playback and sequencer math stays in C++.
export function createEngine(module, sampleRate = 48000) {
  let instance;
  const fail = message => { throw new Error(message); };
  const imports = {
    env: {
      abort: () => fail('The audio engine aborted'),
      emscripten_notify_memory_growth: () => fail('Unexpected audio engine memory growth'),
    },
    wasi_snapshot_preview1: {
      proc_exit: code => fail(`The audio engine exited (${code})`),
      fd_close: () => 8,
      fd_seek: () => 8,
      fd_write: (_fd, _iov, _count, written) => {
        if (instance) new DataView(instance.exports.memory.buffer).setUint32(written, 0, true);
        return 0;
      },
    },
  };
  instance = new WebAssembly.Instance(module, imports);
  const x = instance.exports;
  if (x._initialize) x._initialize();
  const fn = name => x[name] || x[`_${name}`];
  const handle = fn('ag_create')(sampleRate);
  if (!handle) throw new Error('Could not allocate audio engine');
  const memory = x.memory;
  const floatMemory = new Float32Array(memory.buffer);
  let destroyed = false;
  const outputPointer = fn('ag_render')(handle, 0) / 4;
  const views = new Map();
  for (const frames of [128, 4096]) views.set(frames, [
    floatMemory.subarray(outputPointer, outputPointer + frames),
    floatMemory.subarray(outputPointer + 4096, outputPointer + 4096 + frames),
  ]);
  const number = (value, fallback) => Number.isFinite(value) ? value : fallback;
  const bankFrom = state => state.bank || state.sequence || (state.patterns ? state : null);
  const stepCache = new Float64Array(16 * 11 * 64 * 4).fill(NaN);
  const voiceCache = new Float64Array(11 * 12).fill(NaN);
  const lengthCache = new Float64Array(16).fill(NaN);
  const chainCache = new Float64Array(64).fill(NaN);
  let chainLengthCache = NaN;
  const api = {
    setState(state) {
      if (destroyed || !state || typeof state !== 'object') return;
      (state.voices || []).slice(0, 11).forEach((v, i) => {
        const values = [number(v.model, 0), number(v.tune, 0), number(v.decay, .5),
          number(v.tone, .5), number(v.level, .8), number(v.pan, 0), number(v.drive, 0),
          +!!v.mute, +!!v.solo, +!!v.reverse, number(v.sampleStart, 0), number(v.sampleEnd, 1)];
        const base = i * 12;
        if (values.some((value, j) => value !== voiceCache[base + j])) {
          fn('ag_voice')(handle, i, ...values);
          voiceCache.set(values, base);
        }
      });
      const bank = bankFrom(state);
      if (bank) {
        (bank.patterns || []).slice(0, 16).forEach((p, pi) => {
          const length = number(p.length, 16);
          if (length !== lengthCache[pi]) { fn('ag_length')(handle, pi, length); lengthCache[pi] = length; }
          for (let v = 0; v < 11; v++) for (let s = 0; s < 64; s++) {
            const step = p.steps?.[v]?.[s] || {};
            const base = ((pi * 11 + v) * 64 + s) * 4;
            const on = +!!step.on, velocity = number(step.velocity, .8);
            const probability = number(step.probability, 1), ratchets = number(step.ratchets, 1);
            if (stepCache[base] !== on || stepCache[base + 1] !== velocity ||
                stepCache[base + 2] !== probability || stepCache[base + 3] !== ratchets) {
              fn('ag_step')(handle, pi, v, s, on, velocity, probability, ratchets);
              stepCache[base] = on; stepCache[base + 1] = velocity;
              stepCache[base + 2] = probability; stepCache[base + 3] = ratchets;
            }
          }
        });
        const chain = bank.chain || [0];
        const length = number(bank.chainLength, chain.length || 1);
        for (let i = 0; i < 64; i++) {
          const pattern = number(chain[i], 0);
          if (chainCache[i] !== pattern || chainLengthCache !== length) {
            fn('ag_chain')(handle, i, pattern, length); chainCache[i] = pattern;
          }
        }
        chainLengthCache = length;
      }
      fn('ag_transport')(handle, number(state.tempo, 124), number(state.swing, 0),
        number(state.master, .75), number(state.selectedPattern, 0), +!!state.chainMode);
      if (fn('ag_masterDrive')) fn('ag_masterDrive')(handle, number(state.masterDrive, 0));
    },
    setSample(voice, left, right, rate = sampleRate) {
      if (destroyed) throw new Error('Audio engine has been destroyed');
      if (!Number.isInteger(voice) || voice < 0 || voice >= 11) throw new Error('Invalid sample lane');
      const frames = left?.length || 0;
      if (frames > 1920000 || frames > rate * 10 || (right && right.length !== frames))
        throw new Error('Sample must be at most 10 seconds with matching channel lengths');
      if (!frames) { fn('ag_sample')(handle, voice, 0, 0, 0, sampleRate); return; }
      const pointer = fn('malloc')(frames * 8);
      if (!pointer) throw new Error('Not enough audio sample memory');
      try {
        floatMemory.set(left, pointer / 4);
        floatMemory.set(right || left, pointer / 4 + frames);
        if (!fn('ag_sample')(handle, voice, pointer, pointer + frames * 4, frames, rate))
          throw new Error('Sample rejected: invalid rate/length or total sample memory limit');
      } finally { fn('free')(pointer); }
    },
    setSamples(samples) {
      (samples || []).forEach((sample, voice) => {
        if (sample) api.setSample(voice, sample.left, sample.right, sample.sampleRate || sampleRate);
        else api.setSample(voice, null, null, sampleRate);
      });
    },
    play() { if (!destroyed) fn('ag_play')(handle); },
    pause() { if (!destroyed) fn('ag_pause')(handle); },
    stop() { if (!destroyed) fn('ag_stop')(handle); },
    trigger(voice, velocity = 1) { if (!destroyed) fn('ag_trigger')(handle, voice, velocity); },
    render(frames = 128) {
      if (destroyed) throw new Error('Audio engine has been destroyed');
      if (!Number.isInteger(frames) || frames < 1 || frames > 4096) throw new Error('Render block must be 1–4096 frames');
      fn('ag_render')(handle, frames);
      let pair = views.get(frames);
      if (!pair) {
        pair = [floatMemory.subarray(outputPointer, outputPointer + frames),
          floatMemory.subarray(outputPointer + 4096, outputPointer + 4096 + frames)];
        views.set(frames, pair);
      }
      // These are borrowed views, overwritten by the next render. Copy for retention.
      return pair;
    },
    position() {
      if (destroyed) return { step: -1, pattern: 0, playing: false, ppq: 0, peak: 0 };
      return { step: fn('ag_currentStep')(handle), pattern: fn('ag_currentPattern')(handle),
        playing: !!fn('ag_playing')(handle), ppq: fn('ag_ppq')(handle), peak: fn('ag_peak')(handle) };
    },
    factoryBank() {
      if (destroyed) throw new Error('Audio engine has been destroyed');
      const patterns = Array.from({ length: 16 }, (_, p) => ({
        length: fn('ag_getLength')(handle, p),
        steps: Array.from({ length: 11 }, (_, v) => Array.from({ length: 64 }, (_, s) => ({
          on: !!fn('ag_getStep')(handle, p, v, s, 0), velocity: fn('ag_getStep')(handle, p, v, s, 1),
          probability: fn('ag_getStep')(handle, p, v, s, 2), ratchets: fn('ag_getStep')(handle, p, v, s, 3),
        }))),
      }));
      return { patterns, chain: Array.from({ length: 64 }, (_, i) => fn('ag_getChain')(handle, i)),
        chainLength: fn('ag_getChainLength')(handle) };
    },
    destroy() { if (!destroyed) { fn('ag_destroy')(handle); destroyed = true; } },
  };
  return api;
}
