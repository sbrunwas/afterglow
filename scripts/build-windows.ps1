$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
cmake -S $root -B "$root/build" -A x64 -DBUILD_TESTING=ON
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cmake --build "$root/build" --config Release --parallel 2
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
ctest --test-dir "$root/build" -C Release --output-on-failure
exit $LASTEXITCODE
