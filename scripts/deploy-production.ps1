param([switch]$DryRun)

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

$requiredSecrets = @(
  'BETTER_AUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GEMINI_API_KEY'
)
$secrets = @{}

foreach ($line in Get-Content -LiteralPath '.dev.vars') {
  if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)$' -and $requiredSecrets -contains $Matches[1]) {
    $value = $Matches[2].Trim()
    if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    $secrets[$Matches[1]] = $value
  }
}

$missing = $requiredSecrets | Where-Object {
  -not $secrets.ContainsKey($_) -or [string]::IsNullOrWhiteSpace($secrets[$_])
}
if ($missing) {
  throw "Missing required .dev.vars entries: $($missing -join ', ')"
}

$secretFile = [System.IO.Path]::GetTempFileName()
try {
  $secrets | ConvertTo-Json -Compress | Set-Content -LiteralPath $secretFile -NoNewline
  $env:CLOUDFLARE_D1_DATABASE_ID = '116bd7e2-9f49-46c0-95c2-461b8176d161'
  $env:BETTER_AUTH_URL = 'https://lexis-sanctuary.stevethirdparty.workers.dev'
  $deployArgs = @('cf', 'deploy', '--secrets-file', $secretFile, '--message', 'Synchronize production secrets')
  if ($DryRun) { $deployArgs += '--dry-run' }
  & npx @deployArgs
  exit $LASTEXITCODE
} finally {
  Remove-Item -LiteralPath $secretFile -Force -ErrorAction SilentlyContinue
}
