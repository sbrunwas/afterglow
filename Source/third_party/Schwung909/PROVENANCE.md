# Schwung 9W9 voice subset

Source: https://github.com/athousanddetails/schwung-9W9
Revision: `8e9aebde0c40a4c017f640e5c30a4f70936bb595`
License: GPL-3.0, retained in LICENSE and in each upstream header.

Vendored unchanged: `webaudio.h`, `9w9_circuit.h`, `9w9_tom909.h`,
`9w9_perc909.h` from `src/dsp/`. Engine parameter defaults adapted from
`src/dsp/9w9_engine.c` at the same revision by Afterglow's `Circuit909.h` adapter.
No upstream cymbal WAV files, artwork, UI, host API, effects, or loader are included.

These are circuit-informed, fitted virtual-analog models, not component-by-component
circuit simulation. Upstream comments describe fits to reference recordings, but
those recordings and a reproducible fitting dataset are not in this source subset.
Afterglow has not independently verified those hardware-match claims.

Structural references cited upstream:
- Roland TR-909 Service Notes (1984), voicing-board diagrams and scope traces.
- http://www.network-909.de/circuit.htm
- https://www.colinfraser.com/tr909/909mods/909mods.htm
- https://www.firstpr.com.au/rwi/tr-909/TR-909-Sound-Mods.pdf

Current adapter retains Afterglow's semitone Tune control as an extension; the
original hardware kick Tune control instead changes its pitch-sweep behavior.
Upstream's generic xorshift source is replaced in the adapter with an original
31-stage, taps 31/13 LFSR clocked at 300 kHz, based on Electric Druid's circuit
analysis: https://electricdruid.net/tr-909-noise-generator/ . Five extra output
delay stages are retained. Bit-time integration provides approximate anti-alias
filtering (a boxcar response); it is not a precise analog filter reconstruction.
Reset warm-starts a deterministic sequence after the power-on fill, rather than
simulating the original 20–30 ms startup mute. Nonlinear stages
are not oversampled, so extreme settings can alias. Output gains are adapted to
Afterglow's mixer, not calibrated to hardware voltage or to a measured reference kit.

Adapter rate handling integrates noise bit duration over each output sample
and calibrates its low-frequency spectral density to the previous 48 kHz bus.
Excitation pulse length scales from two samples at 48 kHz. The unmodified upstream
assumes its host rate. No code from the separate tr-909-noise-source repository is
used; the LFSR adapter is an independent implementation.
