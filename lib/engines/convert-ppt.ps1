param (
    [Parameter(Mandatory=$true)]
    [string]$InputPath,
    [Parameter(Mandatory=$true)]
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

$resolvedIn = [System.IO.Path]::GetFullPath($InputPath)
$resolvedOut = [System.IO.Path]::GetFullPath($OutputPath)

if (-not (Test-Path $resolvedIn)) {
    Write-Error "Input file not found: $resolvedIn"
    exit 1
}

$hadPpt = @(Get-Process -Name POWERPNT -ErrorAction SilentlyContinue).Count -gt 0
$ppt = $null
$pres = $null

try {
    $ppt = New-Object -ComObject PowerPoint.Application
    try { $ppt.DisplayAlerts = 1 } catch {}
    
    # ReadOnly = -1, Untitled = 0, WithWindow = 0 (Hidden background mode)
    $pres = $ppt.Presentations.Open($resolvedIn, -1, 0, 0)
    
    # ppSaveAsPDF = 32 (Official built-in Microsoft PowerPoint PDF Export)
    $pres.SaveAs($resolvedOut, 32)
    
    if (-not (Test-Path $resolvedOut)) {
        throw "PowerPoint SaveAs completed but output PDF was not found."
    }
    
    Write-Host "SUCCESS: $resolvedOut"
    exit 0
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
finally {
    if ($pres) {
        try { $pres.Close() } catch {}
    }
    if ($ppt -and -not $hadPpt) {
        try {
            if ($ppt.Presentations.Count -eq 0) {
                $ppt.Quit()
            }
        } catch {}
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
