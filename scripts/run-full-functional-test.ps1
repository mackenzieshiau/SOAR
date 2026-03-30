param(
  [string]$BaseUrl = "http://localhost:8123",
  [switch]$Headed
)

$ErrorActionPreference = "Stop"

$node = "C:\Program Files\nodejs\node.exe"
$scriptPath = Join-Path $PSScriptRoot "run-full-functional-test.mjs"

if (-not (Test-Path $node)) {
  throw "Node was not found at $node"
}

if (-not (Test-Path $scriptPath)) {
  throw "Test script was not found at $scriptPath"
}

$arguments = @($scriptPath, "--base-url", $BaseUrl)
if ($Headed) {
  $arguments += @("--headed", "true")
}

& $node @arguments
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
