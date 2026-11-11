<#
.SYNOPSIS
  Swap the old home IP for the new one in every DigitalOcean Cloud Firewall,
  then print the MySQL host-rename SQL for the database server.

.DESCRIPTION
  Default is a dry run: shows which firewall rules would change and prints the SQL.
  Pass -Apply to write the firewall changes.

  Old IP:  -OldIp, else the last IP this script applied (state file), else error
           with a list of single-host addresses found in the firewalls.
  New IP:  -NewIp, else detected from https://api.ipify.org.

  Each changed firewall is rewritten with a full PUT that keeps its name,
  droplets, tags, and every other rule/source exactly as they were; only the
  old address is replaced (deduped if the new one is already in that rule).

  Token: $env:DIGITALOCEAN_ACCESS_TOKEN, else the access-token from doctl's
  config ($env:APPDATA\doctl\config.yaml, written by `doctl auth init`).

.EXAMPLE
  .\Update-HomeIp.ps1                       # dry run, auto old/new IP
  .\Update-HomeIp.ps1 -OldIp 1.2.3.4        # dry run, explicit old IP
  .\Update-HomeIp.ps1 -OldIp 1.2.3.4 -Apply # write firewall changes
  .\Update-HomeIp.ps1 -OldIp 1.2.3.4 -NewIp 5.6.7.8 -SqlOnly
  .\Update-HomeIp.ps1 -ListAddresses        # show single-host IPs in all firewalls
#>
[CmdletBinding()]
param(
  [string]$OldIp,
  [string]$NewIp,
  [switch]$Apply,
  [switch]$SqlOnly,
  [switch]$ListAddresses
)

$ErrorActionPreference = 'Stop'
$ApiBase   = 'https://api.digitalocean.com/v2'
$StateFile = Join-Path $env:APPDATA 'beestat\home-ip.txt'
$SqlTemplate = Join-Path $PSScriptRoot 'rename-mysql-host.sql'

function Assert-Ipv4([string]$Ip, [string]$Label) {
  $parsed = $null
  if (-not [System.Net.IPAddress]::TryParse($Ip, [ref]$parsed) -or
      $parsed.AddressFamily -ne 'InterNetwork' -or $Ip -notmatch '^\d{1,3}(\.\d{1,3}){3}$') {
    throw "$Label '$Ip' is not a valid IPv4 address."
  }
}

function Get-PublicIp {
  foreach ($url in 'https://api.ipify.org', 'https://ipv4.icanhazip.com') {
    try {
      $ip = (Invoke-RestMethod -Uri $url -TimeoutSec 10).ToString().Trim()
      if ($ip) { return $ip }
    } catch { }
  }
  throw 'Could not detect public IP. Pass -NewIp.'
}

function Get-DoToken {
  if ($env:DIGITALOCEAN_ACCESS_TOKEN) { return $env:DIGITALOCEAN_ACCESS_TOKEN }
  $cfg = Join-Path $env:APPDATA 'doctl\config.yaml'
  if (Test-Path $cfg) {
    foreach ($line in Get-Content $cfg) {
      if ($line -match '^access-token:\s*(\S+)\s*$') { return $Matches[1].Trim('"', "'") }
    }
  }
  throw "No DigitalOcean token. Run 'doctl auth init' (see setup.md) or set DIGITALOCEAN_ACCESS_TOKEN."
}

function Invoke-Do([string]$Method, [string]$Path, $Body) {
  $params = @{
    Method  = $Method
    Uri     = "$ApiBase$Path"
    Headers = @{ Authorization = "Bearer $script:Token" }
    ContentType = 'application/json'
  }
  if ($null -ne $Body) { $params.Body = ConvertTo-Json -InputObject $Body -Depth 20 }
  try { Invoke-RestMethod @params }
  catch {
    $detail = if ($_.ErrorDetails) { $_.ErrorDetails.Message } else { $_.Exception.Message }
    throw "DigitalOcean API $Method $Path failed: $detail"
  }
}

# Strip /32 so "1.2.3.4" and "1.2.3.4/32" compare equal.
function Get-Host([string]$Addr) { $Addr -replace '/32$', '' }

function Write-Sql([string]$Old, [string]$New) {
  $sql = (Get-Content -Raw $SqlTemplate).Replace('{{OLD_IP}}', $Old).Replace('{{NEW_IP}}', $New)
  Write-Host ''
  Write-Host '===== Run this on the database server (mysql as root) =====' -ForegroundColor Cyan
  Write-Output $sql
  try { Set-Clipboard -Value $sql; Write-Host '(SQL copied to clipboard)' -ForegroundColor DarkGray } catch { }
}

# ---- Resolve IPs ------------------------------------------------------------

if (-not $SqlOnly) { $script:Token = Get-DoToken }

if ($ListAddresses) {
  $fws = (Invoke-Do GET '/firewalls?per_page=200' $null).firewalls
  foreach ($fw in $fws) {
    foreach ($dir in 'inbound_rules', 'outbound_rules') {
      $side = if ($dir -eq 'inbound_rules') { 'sources' } else { 'destinations' }
      foreach ($r in @($fw.$dir)) {
        foreach ($a in @($r.$side.addresses)) {
          if ($a -and $a -match '^\d{1,3}(\.\d{1,3}){3}(/32)?$') {
            '{0,-12} {1,-4} {2,-5} {3,-6} {4}' -f $fw.name, $dir.Substring(0, $dir.IndexOf('_')), $r.protocol, $r.ports, $a
          }
        }
      }
    }
  }
  return
}

if (-not $NewIp) { $NewIp = Get-PublicIp; Write-Host "Detected new IP: $NewIp" }
Assert-Ipv4 $NewIp 'New IP'

if (-not $OldIp -and (Test-Path $StateFile)) {
  $OldIp = (Get-Content -Raw $StateFile).Trim()
  Write-Host "Old IP from state file ($StateFile): $OldIp"
}
if (-not $OldIp) {
  throw "Old IP unknown (no state file at $StateFile). Pass -OldIp. Use -ListAddresses to see single-host IPs in the firewalls."
}
Assert-Ipv4 $OldIp 'Old IP'

if ($OldIp -eq $NewIp) {
  Write-Host "Old and new IP are both $NewIp. Nothing to change." -ForegroundColor Green
  return
}

if ($SqlOnly) { Write-Sql $OldIp $NewIp; return }

# ---- Plan firewall changes -------------------------------------------------

$fws = (Invoke-Do GET '/firewalls?per_page=200' $null).firewalls
$changed = @()

foreach ($fw in $fws) {
  $fwChanged = $false
  foreach ($dir in 'inbound_rules', 'outbound_rules') {
    $side = if ($dir -eq 'inbound_rules') { 'sources' } else { 'destinations' }
    foreach ($r in @($fw.$dir)) {
      if ($null -eq $r -or $null -eq $r.$side -or $null -eq $r.$side.addresses) { continue }
      $addrs = @($r.$side.addresses)
      if (-not ($addrs | Where-Object { (Get-Host $_) -eq $OldIp })) { continue }

      $hasNew = [bool]($addrs | Where-Object { (Get-Host $_) -eq $NewIp })
      $out = New-Object System.Collections.Generic.List[string]
      foreach ($a in $addrs) {
        if ((Get-Host $a) -eq $OldIp) {
          if (-not $hasNew) { $out.Add(($a -replace [regex]::Escape($OldIp), $NewIp)); $hasNew = $true }
        } else { $out.Add($a) }
      }
      Write-Host ('  {0,-12} {1,-8} {2,-5} {3,-6} [{4}] -> [{5}]' -f $fw.name, $dir.Replace('_rules', ''), $r.protocol, $r.ports, ($addrs -join ', '), ($out -join ', '))
      $r.$side.addresses = $out.ToArray()
      $fwChanged = $true
    }
  }
  if ($fwChanged) { $changed += $fw }
}

if ($changed.Count -eq 0) {
  Write-Host "No firewall rule contains $OldIp." -ForegroundColor Yellow
} elseif (-not $Apply) {
  Write-Host ''
  Write-Host "DRY RUN: $($changed.Count) firewall(s) would change. Re-run with -Apply to write." -ForegroundColor Yellow
} else {
  # The API reports all-ports as "0" and puts "0" on icmp rules; send what it accepts.
  function ConvertTo-PutRule($r) {
    $copy = $r | Select-Object *
    if ($copy.protocol -eq 'icmp') { $copy.PSObject.Properties.Remove('ports') }
    elseif ($copy.ports -eq '0') { $copy.ports = 'all' }
    $copy
  }
  foreach ($fw in $changed) {
    $body = [ordered]@{
      name           = $fw.name
      inbound_rules  = @(@($fw.inbound_rules)  | Where-Object { $_ } | ForEach-Object { ConvertTo-PutRule $_ })
      outbound_rules = @(@($fw.outbound_rules) | Where-Object { $_ } | ForEach-Object { ConvertTo-PutRule $_ })
      droplet_ids    = @(@($fw.droplet_ids) | Where-Object { $null -ne $_ })
      tags           = @(@($fw.tags) | Where-Object { $_ })
    }
    $null = Invoke-Do PUT "/firewalls/$($fw.id)" $body
    Write-Host "  Updated firewall $($fw.name)" -ForegroundColor Green
  }

  # Verify
  $after = (Invoke-Do GET '/firewalls?per_page=200' $null).firewalls
  $left = foreach ($fw in $after) {
    foreach ($dir in 'inbound_rules', 'outbound_rules') {
      $side = if ($dir -eq 'inbound_rules') { 'sources' } else { 'destinations' }
      foreach ($r in @($fw.$dir)) {
        if ($r -and $r.$side -and (@($r.$side.addresses) | Where-Object { (Get-Host $_) -eq $OldIp })) { $fw.name }
      }
    }
  }
  if ($left) { Write-Host "WARNING: $OldIp still present in: $(($left | Select-Object -Unique) -join ', ')" -ForegroundColor Red }
  else { Write-Host "Verified: $OldIp no longer in any firewall." -ForegroundColor Green }
}

if ($Apply) {
  $dirPath = Split-Path $StateFile
  if (-not (Test-Path $dirPath)) { New-Item -ItemType Directory -Force $dirPath | Out-Null }
  Set-Content -Path $StateFile -Value $NewIp -Encoding ascii
  Write-Host "Saved $NewIp as last-applied IP in $StateFile"
}

Write-Sql $OldIp $NewIp
