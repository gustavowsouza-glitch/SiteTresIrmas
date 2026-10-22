param([string]$OutputDirectory = 'migration-exports')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$outputRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot $OutputDirectory))
$exportRoot = Join-Path $outputRoot (Get-Date -Format 'yyyyMMdd-HHmmss')
$codeRoot = Join-Path $exportRoot 'codigo'
$dataRoot = Join-Path $exportRoot 'dados'
$utf8 = New-Object System.Text.UTF8Encoding($false)
New-Item -ItemType Directory -Path $codeRoot, (Join-Path $dataRoot 'photos') -Force | Out-Null
Push-Location $projectRoot
try {
    # Only export catalogue fields. Never read owner credentials or sessions.
    $query = @'
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('/data/store.sqlite', { readOnly: true });
try {
  console.log(JSON.stringify(db.prepare('SELECT id,name,description,category,price_cents,active,image_path,created_at FROM products ORDER BY created_at,id').all()));
} finally { db.close(); }
'@
    $raw = $query | docker compose exec -T api node --input-type=module
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao exportar o catálogo. Confirme que a API está rodando.' }
    $products = @((($raw -join "`n") | ConvertFrom-Json))
    $records = @()
    foreach ($product in $products) {
        $photo = $null
        if ($product.image_path) {
            if ($product.image_path -notmatch '^[a-f0-9-]{36}\.(png|jpg|webp|gif)$') { throw 'Nome de foto inválido.' }
            $photo = 'photos/' + $product.image_path
            docker compose cp "api:/data/uploads/$($product.image_path)" (Join-Path $dataRoot $photo)
            if ($LASTEXITCODE -ne 0) { throw 'Falha ao copiar uma foto do catálogo.' }
        }
        $records += [ordered]@{
            id = $product.id; name = $product.name; description = $product.description
            category = $product.category; price_cents = [long]$product.price_cents
            active = [bool]$product.active; created_at = $product.created_at; image_file = $photo
        }
    }
    [IO.File]::WriteAllText((Join-Path $dataRoot 'products.json'), (ConvertTo-Json -InputObject $records -Depth 8), $utf8)

    foreach ($folder in @('site', 'backend', 'docker')) {
        Copy-Item -LiteralPath (Join-Path $projectRoot $folder) -Destination $codeRoot -Recurse
    }
    foreach ($file in @('Dockerfile', 'compose.yaml', 'README.md', '.dockerignore')) {
        Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $codeRoot
    }
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'LOVABLE-MIGRATION.md') -Destination (Join-Path $codeRoot 'LOVABLE-MIGRATION.md')
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'LOVABLE-MIGRATION.md') -Destination (Join-Path $exportRoot 'LEIA-ME.md')
    $environment = "PUBLIC_ORIGIN=`nCOOKIE_SECURE=`nDATA_DIR=`nBACKUP_DIR=`nPORT=`n"
    [IO.File]::WriteAllText((Join-Path $codeRoot '.env.example'), $environment, $utf8)

    # Reject accidental credential files, databases or links before packaging.
    $allFiles = @(Get-ChildItem -LiteralPath $codeRoot, $dataRoot -Recurse -Force -File)
    foreach ($file in $allFiles) {
        if (($file.Name -like '.env*' -and $file.Name -ne '.env.example') -or $file.Name -match '\.sqlite($|-)' -or ($file.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw "Arquivo não permitido no pacote: $($file.Name)"
        }
    }
    Compress-Archive -Path (Join-Path $codeRoot '*') -DestinationPath (Join-Path $exportRoot 'dindinha-codigo.zip')
    Compress-Archive -Path (Join-Path $dataRoot '*') -DestinationPath (Join-Path $exportRoot 'dindinha-produtos-fotos.zip')
    Get-ChildItem -LiteralPath $exportRoot -Filter '*.zip' | ForEach-Object { Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256 } | Format-Table -AutoSize
    Write-Output "Exportação concluída: $exportRoot"
    Write-Output "Produtos: $($records.Count). Sem contas administrativas, senhas, hashes de senha ou sessões exportados do banco."
} finally { Pop-Location }
