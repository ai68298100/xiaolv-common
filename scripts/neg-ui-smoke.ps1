$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$source = Join-Path $repoRoot "src\ui\dialog.ts"
$backup = "$source.negcheck.bak"
$needle = 'create.textContent = this.deps.t("newItemAction");'
$violation = 'create.textContent = "＋ " + this.deps.t("newItem");'
$expectedFailure = "empty-state new-item action did not use the English localized label"
$originalHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
$negativeExitCode = $null
$negativeOutput = ""
$negativeMatched = $false

if (Test-Path -LiteralPath $backup) {
    throw "Refusing to overwrite an existing negative-test backup: $backup"
}

Copy-Item -LiteralPath $source -Destination $backup
if ((Get-FileHash -LiteralPath $backup -Algorithm SHA256).Hash -ne $originalHash) {
    Remove-Item -LiteralPath $backup -Force
    throw "Source backup hash mismatch before mutation"
}

try {
    $raw = [System.IO.File]::ReadAllText($source)
    if (-not $raw.Contains($needle)) {
        throw "Target source expression was not found; no negative test was run"
    }
    $mutated = $raw.Replace($needle, $violation)
    if ($mutated -ceq $raw) {
        throw "Violation injection did not change the source"
    }
    [System.IO.File]::WriteAllText($source, $mutated, [System.Text.UTF8Encoding]::new($false))

    Push-Location $repoRoot
    try {
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        $output = & pnpm run test:ui 2>&1
        $negativeExitCode = $LASTEXITCODE
        $negativeOutput = ($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
        $negativeMatched = $negativeExitCode -ne 0 -and $negativeOutput.Contains($expectedFailure)
        $ErrorActionPreference = $previousErrorActionPreference
    } finally {
        if ($null -ne $previousErrorActionPreference) {
            $ErrorActionPreference = $previousErrorActionPreference
        }
        Pop-Location
    }
} finally {
    Copy-Item -LiteralPath $backup -Destination $source -Force
    Remove-Item -LiteralPath $backup -Force
}

$restoredHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
if ($restoredHash -ne $originalHash) {
    throw "Source restoration hash mismatch: expected $originalHash, got $restoredHash"
}

if (-not $negativeMatched) {
    Write-Output $negativeOutput
    throw "Negative smoke did not fail on the expected assertion (exit=$negativeExitCode; expected marker: $expectedFailure)"
}

Write-Output "Negative UI smoke verified: exit=$negativeExitCode; matched target assertion; restored SHA256=$restoredHash"
