<# Cria uma branch local e registra sua finalidade, sem trocar a branch atual. #>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Nome,
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Finalidade,
    [ValidateNotNullOrEmpty()]
    [string]$Base = 'main'
)

$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
$registryPath = Join-Path $repoPath 'docs/branches/README.md'
Push-Location -LiteralPath $repoPath
try {
    if ($Nome.StartsWith('-') -or $Base.StartsWith('-')) { throw 'Nome e base não podem começar com hífen.' }
    git check-ref-format --branch $Nome | Out-Null
    if ($LASTEXITCODE -ne 0 -or $Nome -eq '@{-1}') { throw 'Nome de branch inválido.' }
    # Exige uma branch local explícita, em vez de interpretar opções ou revisões arbitrárias.
    $baseCommit = git rev-parse --verify "refs/heads/$Base"
    if ($LASTEXITCODE -ne 0) { throw "A branch base local '$Base' não existe." }
    $existing = git branch --list --format='%(refname:short)'
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível consultar as branches.' }
    if ($existing -contains $Nome) { throw "A branch '$Nome' já existe. Nenhum registro foi alterado." }
    $description = ($Finalidade -replace '[\r\n]+', ' ').Trim()
    if (-not $description) { throw 'Informe uma finalidade para a branch.' }
    $registry = [IO.File]::ReadAllText($registryPath)
    $safeName = $Nome.Replace('|', '&#124;').Replace('`', '&#96;').Replace('<', '&lt;').Replace('>', '&gt;')
    if ($registry.Contains('| `' + $safeName + '` |')) { throw 'Já existe um registro desse nome. Revise a situação no guia antes de reutilizá-lo.' }
    $safeBase = $Base.Replace('|', '&#124;').Replace('`', '&#96;').Replace('<', '&lt;').Replace('>', '&gt;')
    $description = $description.Replace('&', '&amp;').Replace('|', '&#124;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('`', '&#96;')
    $date = Get-Date -Format 'yyyy-MM-dd'
    $row = '| `' + $safeName + '` | ' + $date + ' | `' + $safeBase + '` | `' + $baseCommit.Trim() + '` | ' + $description + ' | Em desenvolvimento |'
    git branch -- $Nome "refs/heads/$Base"
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível criar a branch; o registro foi preservado.' }
    try {
        [IO.File]::WriteAllText($registryPath, $registry.TrimEnd() + "`r`n" + $row + "`r`n", [Text.UTF8Encoding]::new($false))
    } catch {
        throw "A branch '$Nome' foi criada, mas o registro falhou. Anote-a manualmente em docs/branches/README.md. $($_.Exception.Message)"
    }
    Write-Output "Branch '$Nome' criada e registrada. A branch atual foi mantida."
    Write-Output "Para trabalhar nela: git switch $Nome"
} finally {
    Pop-Location
}
