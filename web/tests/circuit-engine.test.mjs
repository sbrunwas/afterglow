// SPDX-License-Identifier: AGPL-3.0-only
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
let temporary, executable;
before(()=>{
  temporary=mkdtempSync(join(tmpdir(),'afterglow-circuit-'));
  executable=join(temporary,'circuit-probe');
  const flags=['-std=c++17','-O2','-pthread','-Isrc/core',
    'tests/circuit-probe.cpp','src/core/DrumEngine.cpp','-o',executable];
  const build=spawnSync(process.env.CXX||'g++',flags,{cwd:root,encoding:'utf8',timeout:120000});
  assert.equal(build.status,0,`Native circuit test compile failed: ${build.error||''}\n${build.stdout}\n${build.stderr}`);
});
after(()=>{if(temporary)rmSync(temporary,{recursive:true,force:true});});
for(const [suite,description] of [
  ['coverage','all 22 model/voice combinations produce finite sound at 44.1/48/96 kHz; reset clears tails'],
  ['extremes','extreme tune/decay/tone/drive combinations and rapid retriggers remain bounded and recover from invalid input'],
  ['choke','closed hat chokes synth and sample open hats, and a new open-hat hit reopens'],
  ['noise','909 noise has stable fixed-band power across sample rates and deterministic reset'],
  ['controls','tune, decay and tone affect every voice at its next hit'],
  ['free-running','808 shared metal generator advances between triggers'],
  ['instances','interleaved engines have independent oscillator/noise/envelope state and deterministic reset'],
]) test(`native circuit DSP: ${description}`,()=>{
  const result=spawnSync(executable,[suite],{cwd:root,encoding:'utf8',timeout:90000});
  assert.equal(result.status,0,`${suite}: ${result.error||''}\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr,/PASS circuit-probe/);
});
