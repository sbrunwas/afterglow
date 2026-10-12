# Run from an extracted Windows release. Installs for all users; elevation required.
$ErrorActionPreference = 'Stop'
$plugin = Join-Path $PSScriptRoot 'Afterglow.vst3'
if (!(Test-Path $plugin)) { throw 'Place this installer beside Afterglow.vst3 from the release zip.' }
$destination = Join-Path $env:CommonProgramFiles 'VST3'
New-Item -ItemType Directory -Force $destination | Out-Null
Copy-Item -Recurse -Force $plugin $destination
Write-Host "Installed to $destination. Enable VST3 system folders and rescan in Ableton Live."
