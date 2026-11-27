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

# Unblock file to bypass Windows Protected View restriction on downloaded presentations
Unblock-File -Path $resolvedIn -ErrorAction SilentlyContinue

$hadPpt = @(Get-Process -Name POWERPNT -ErrorAction SilentlyContinue).Count -gt 0
$ppt = $null
$pres = $null

try {
    $ppt = New-Object -ComObject PowerPoint.Application
    try { $ppt.DisplayAlerts = 1 } catch {}
    
    # 1. Attempt opening in hidden background mode (ReadOnly = -1, Untitled = 0, WithWindow = 0)
    try {
        $pres = $ppt.Presentations.Open($resolvedIn, -1, 0, 0)
    }
    catch {
        # 2. If background mode fails on complex slides, open with window context
        try {
            $pres = $ppt.Presentations.Open($resolvedIn, -1, 0, -1)
        }
        catch {
            # 3. If file opens in Protected View mode, unprotect and get editable presentation
            $pv = $ppt.ProtectedViewWindows.Open($resolvedIn)
            $pres = $pv.Edit()
        }
    }
    
    if (-not $pres) {
        throw "Could not open presentation in Microsoft PowerPoint."
    }
    
    # Official built-in Microsoft PowerPoint PDF Export (ppSaveAsPDF = 32)
    # Generates exact 1:1 pixel-perfect slides matching PowerPoint exactly
    $pres.SaveAs($resolvedOut, 32)
    
    if (-not (Test-Path $resolvedOut) -or (Get-Item $resolvedOut).Length -eq 0) {
        throw "PowerPoint SaveAs completed but output PDF was not found or is empty."
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
