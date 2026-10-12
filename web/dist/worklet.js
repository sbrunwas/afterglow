// SPDX-License-Identifier: AGPL-3.0-only
import { createEngine } from './wasm-runtime.js';

class AfterglowProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.engine = null;
    this.notifyFrames = 0;
    this.peak = 0;
    try {
      this.engine = createEngine(options.processorOptions.module, sampleRate);
      if (options.processorOptions.state) this.engine.setState(options.processorOptions.state);
      this.port.postMessage({ type: 'ready' });
    } catch (error) {
      this.port.postMessage({ type: 'error', message: error.message || String(error), phase: 'initialize' });
    }
    this.port.onmessage = ({ data }) => {
      if (!data || typeof data !== 'object') { this.port.postMessage({ type: 'error', phase: 'message', message: 'Invalid audio message' }); return; }
      if (!this.engine) return;
      try {
        switch (data.type) {
          case 'state': this.engine.setState(data.state); break;
          case 'sample': this.engine.setSample(data.voice, data.left, data.right, data.sampleRate); break;
          case 'samples': this.engine.setSamples(data.samples); break;
          case 'play': this.engine.play(); break;
          case 'pause': this.engine.pause(); break;
          case 'stop': this.engine.stop(); break;
          case 'trigger': this.engine.trigger(data.voice, data.velocity); break;
          case 'dispose': this.engine.destroy(); this.engine = null; break;
          default: throw new Error(`Unknown audio message: ${data.type}`);
        }
        if (data.requestId !== undefined) this.port.postMessage({ type: 'ack', requestId: data.requestId });
      } catch (error) {
        this.port.postMessage({ type: 'error', message: error.message || String(error), phase: data.type,
          requestId: data.requestId });
      }
    };
  }
  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || !output.length) return true;
    if (!this.engine) { for (const channel of output) channel.fill(0); return true; }
    try {
      const frames = output[0].length;
      const pair = this.engine.render(frames);
      output[0].set(pair[0]);
      if (output[1]) output[1].set(pair[1]);
      for (let n = 0; n < frames; n++) this.peak = Math.max(this.peak, Math.abs(pair[0][n]), Math.abs(pair[1][n]));
      this.notifyFrames += frames;
      if (this.notifyFrames >= sampleRate / 30) {
        const position = this.engine.position();
        this.port.postMessage({ type: 'position', ...position, peak: this.peak });
        this.notifyFrames = 0; this.peak = 0;
      }
    } catch (error) {
      for (const channel of output) channel.fill(0);
      this.port.postMessage({ type: 'error', message: error.message || String(error), phase: 'render' });
      this.engine = null;
    }
    return true;
  }
}
registerProcessor('afterglow-processor', AfterglowProcessor);
