/* ClawStudio v0.14: sample-accurate stereo post-master capture tap.
 * This processor NEVER emits audio into the live mix; its output feeds a muted
 * sink to keep it alive. Copying occurs on the render thread, with PCM chunks
 * transferred only every 16,384 frames (~3 messages/s at 48 kHz).
 */
class ClawStudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sample = null;
    this.wav = null;
    this.CHUNK = 16384;
    this.port.onmessage = e => this.command(e.data);
  }
  makeState(id, type, atFrame, frames) {
    return {id, type, atFrame, frames, copied: 0, missed: 0,
      next: 0, chunkOffset: 0, used: 0,
      left: new Float32Array(this.CHUNK), right: new Float32Array(this.CHUNK)};
  }
  command(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'capture') {
      const {id, startFrame, frames} = m;
      if (!Number.isSafeInteger(id) || !Number.isSafeInteger(startFrame) ||
          !Number.isSafeInteger(frames) || frames < 1 || frames > Math.floor(sampleRate * 32)) {
        this.port.postMessage({type:'captureError', id, error:'Invalid capture clock or duration'});
        return;
      }
      this.sample = this.makeState(id,'sample',startFrame,frames);
    } else if (m.type === 'cancelCapture') {
      if (this.sample && this.sample.id === m.id) this.sample = null;
    } else if (m.type === 'startWav') {
      if (!Number.isSafeInteger(m.id)) return;
      if (this.wav) this.finish(this.wav, false);
      this.wav = this.makeState(m.id,'wav',currentFrame,Math.floor(sampleRate * 600));
    } else if (m.type === 'stopWav') {
      if (this.wav && this.wav.id === m.id) {
        this.finish(this.wav, false);
        this.wav = null;
      }
    }
  }
  flush(s) {
    if (!s.used) return;
    const l = s.left.slice(0,s.used), r = s.right.slice(0,s.used);
    this.port.postMessage({type:s.type === 'sample'?'sampleData':'wavChunk', id:s.id,
      offset:s.chunkOffset, left:l, right:r},[l.buffer,r.buffer]);
    s.used = 0;
  }
  append(s,left,right,from,to,offset) {
    if (offset > s.next) s.missed += offset-s.next;
    s.next = offset;
    while (from < to) {
      if (!s.used) s.chunkOffset = s.next;
      const count = Math.min(to-from,this.CHUNK-s.used);
      if (left) s.left.set(left.subarray(from,from+count),s.used);
      else s.left.fill(0,s.used,s.used+count);
      if (right) s.right.set(right.subarray(from,from+count),s.used);
      else if (left) s.right.set(left.subarray(from,from+count),s.used);
      else s.right.fill(0,s.used,s.used+count);
      from += count;s.used += count;s.copied += count;s.next += count;
      if (s.used === this.CHUNK) this.flush(s);
    }
  }
  finish(s,automatic) {
    this.flush(s);
    this.port.postMessage({type:s.type==='sample'?'sampleDone':'wavDone',id:s.id,
      frames:s.frames, copied:s.copied,
      missingFrames:s.missed + Math.max(0,s.frames-s.next),automatic:!!automatic});
  }
  process(inputs,outputs) {
    const inp=inputs[0]||[],out=outputs[0]||[];
    const left=inp[0],right=inp[1]||inp[0];
    const n=(out[0]||left||[]).length || 128;
    // Output is attached to a zero-gain sink. No live signal is modified.
    for (const channel of out) channel.fill(0);
    const blockStart=currentFrame;
    if(this.sample){
      const s=this.sample,start=s.atFrame,end=start+s.frames;
      const from=Math.max(0,start-blockStart),to=Math.min(n,end-blockStart);
      if(to>from)this.append(s,left,right,from,to,blockStart+from-start);
      if(blockStart+n>=end){this.finish(s,true);this.sample=null}
    }
    if(this.wav){
      const s=this.wav,remaining=s.frames-s.copied;
      const take=Math.min(n,Math.max(0,remaining));
      if(take>0)this.append(s,left,right,0,take,s.next);
      if(s.copied>=s.frames){this.finish(s,true);this.wav=null}
    }
    return true;
  }
}
registerProcessor('clawstudio-stereo-capture',ClawStudioCaptureProcessor);
