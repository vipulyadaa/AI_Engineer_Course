param(
  [string]$Source = (Join-Path $PSScriptRoot 'AI Engineer notes'),
  [string]$Output = (Join-Path $PSScriptRoot 'study-data.js')
)

$ErrorActionPreference = 'Stop'
$sourceRoot = (Resolve-Path -LiteralPath $Source).Path
$files = Get-ChildItem -LiteralPath $sourceRoot -Recurse -File -Filter '*.md' | Sort-Object FullName

$records = foreach ($file in $files) {
  $relative = $file.FullName.Substring($sourceRoot.Length).TrimStart('\').Replace('\', '/')
  $parts = $relative.Split('/')
  $folder = if ($parts.Length -gt 1) { $parts[0] } else { '' }
  $phaseNumber = 0
  $phaseLabel = 'Library notes'
  if ($folder -match '^(\d{2})-(.+)$') {
    $phaseNumber = [int]$Matches[1]
    $phaseWords = (($Matches[2] -replace '-', ' ') -split '\s+' | ForEach-Object {
      if ($_.Length -gt 0) { $_.Substring(0, 1).ToUpper() + $_.Substring(1) }
    }) -join ' '
    $phaseWords = $phaseWords -replace '\bLlm\b', 'LLM' -replace '\bAi\b', 'AI' -replace '\bMlops\b', 'MLOps' -replace '\bRag\b', 'RAG' -replace '\bAdk\b', 'ADK' -replace '\bFaq\b', 'FAQ'
    $phaseLabel = "Phase $phaseNumber · $phaseWords"
  }
  $raw = Get-Content -LiteralPath $file.FullName -Raw
  $h1 = [regex]::Match($raw, '(?m)^#\s+(.+?)\s*$')
  $title = if ($h1.Success) { $h1.Groups[1].Value.Trim() } else { [IO.Path]::GetFileNameWithoutExtension($file.Name) -replace '^\d+-', '' -replace '-', ' ' }
  $title = $title -replace '\s+', ' '
  $topicNumber = 0
  if ($file.BaseName -match '^(\d+)-') { $topicNumber = [int]$Matches[1] }
  $excerpt = (($raw -replace '(?s)^.*?## 1\.', '## 1.') -replace '(?m)^#.*$', '' -replace '(?m)^>.*$', '' -replace '[#>*`_\-]', '' -replace '\s+', ' ').Trim()
  if ($excerpt.Length -gt 190) { $excerpt = $excerpt.Substring(0, 190).Trim() + '…' }
  [ordered]@{
    path = $relative
    title = $title
    phaseNumber = $phaseNumber
    phaseLabel = $phaseLabel
    topicNumber = $topicNumber
    excerpt = $excerpt
    content = $raw
  }
}

$json = $records | ConvertTo-Json -Depth 6 -Compress
"window.STUDY_NOTES = $json;" | Set-Content -LiteralPath $Output -Encoding utf8
Write-Host "Built $($records.Count) notes into $Output"
