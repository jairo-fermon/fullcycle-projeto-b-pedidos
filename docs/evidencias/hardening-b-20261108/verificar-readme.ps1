$ErrorActionPreference = 'Stop'
$runDirectory = $PSScriptRoot
$checkoutDirectory = Join-Path $runDirectory 'fullcycle-projeto-b-pedidos'
Set-Location -LiteralPath $checkoutDirectory
$checks = [System.Collections.Generic.List[object]]::new()
$report = [ordered]@{
    startedAt = [DateTime]::UtcNow.ToString('o')
    timeZone = 'America/Sao_Paulo'
    command = 'pwsh -File verificar-readme.ps1'
    checkout = $checkoutDirectory
    readmeAddressAdaptation = 'PORT=3002 em .env isolado; exemplo padrao usa 3000'
    projectName = 'fullcycle-b-hardening-20261108'
    checks = $checks
}
try {
    $envHashBefore = (Get-FileHash -LiteralPath '.env' -Algorithm SHA256).Hash
    $envOutput = & npm run env:init 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'env:init falhou' }
    if ((Get-FileHash -LiteralPath '.env' -Algorithm SHA256).Hash -ne $envHashBefore) { throw 'env:init alterou arquivo existente' }
    $checks.Add(@{ name='env:init preserva configuracao'; status='PASSOU'; output=$envOutput })
    $baseUrl = 'http://127.0.0.1:3002'
    $health = Invoke-RestMethod "$baseUrl/health"
    if ($health.status -ne 'ok') { throw 'Health incorreto' }
    $body = @{ items = @(@{ sku='CANETA-AZUL'; quantity=2; unitPriceCents=1500 }) } | ConvertTo-Json -Depth 4
    $order = Invoke-RestMethod -Method Post -Uri "$baseUrl/orders" -ContentType 'application/json' -Body $body
    if ($order.totalCents -ne 3000 -or $order.status -ne 'PENDING') { throw 'Criacao incorreta' }
    $found = Invoke-RestMethod "$baseUrl/orders/$($order.id)"
    $confirmed = Invoke-RestMethod -Method Post "$baseUrl/orders/$($order.id)/confirm" -ContentType 'application/json' -Body '{}'
    $updated = Invoke-RestMethod "$baseUrl/orders/$($order.id)"
    if ($found.id -ne $order.id -or $confirmed.status -ne 'CONFIRMED' -or $updated.status -ne 'CONFIRMED') { throw 'Consulta/confirmacao incorreta' }
    $checks.Add(@{ name='exemplo PowerShell do README'; status='PASSOU'; creation=$order; lookup=$found; confirmed=$confirmed; final=$updated })
    $restartOutput = & docker compose restart app 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'Reinicio falhou' }
    $waitOutput = & docker compose up -d --wait app 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { throw 'Readiness apos restart falhou' }
    $persisted = Invoke-RestMethod "$baseUrl/orders/$($order.id)"
    if ($persisted.id -ne $order.id -or $persisted.status -ne 'CONFIRMED' -or $persisted.totalCents -ne 3000) { throw 'O pedido esperado nao foi recuperado apos reiniciar a aplicacao.' }
    $checks.Add(@{ name='persistencia apos restart do app'; status='PASSOU'; before=$updated; after=$persisted; restartOutput=$restartOutput; waitOutput=$waitOutput })
    foreach ($case in @(@{path='/orders/invalido'; expected=400},@{path='/orders/00000000-0000-4000-8000-000000000000'; expected=404})) {
        $response = Invoke-WebRequest "$baseUrl$($case.path)" -SkipHttpErrorCheck
        if ([int]$response.StatusCode -ne $case.expected) { throw 'Status de erro incorreto' }
        $checks.Add(@{ name=$case.path; expected=$case.expected; actual=[int]$response.StatusCode; body=$response.Content; status='PASSOU' })
    }
    $again = Invoke-WebRequest -Method Post "$baseUrl/orders/$($order.id)/confirm" -ContentType 'application/json' -Body '{}' -SkipHttpErrorCheck
    if ([int]$again.StatusCode -ne 409) { throw 'Repeticao nao retornou 409' }
    $checks.Add(@{ name='confirmacao repetida'; expected=409; actual=[int]$again.StatusCode; body=$again.Content; status='PASSOU' })
    $beforeMetrics = (Invoke-WebRequest "$baseUrl/metrics").Content
    $null = Invoke-RestMethod "$baseUrl/orders/$($order.id)"
    $afterMetrics = (Invoke-WebRequest "$baseUrl/metrics").Content
    if ($beforeMetrics -eq $afterMetrics -or !$afterMetrics.Contains('route="/orders/:id",status="200"')) { throw 'Metrica nao refletiu trafego' }
    if ($afterMetrics.Contains($order.id)) { throw 'ID indevido em label de metrica' }
    $checks.Add(@{ name='metrica operacional real e rota normalizada'; status='PASSOU' })
    $report.orderId = $order.id
    $report.status = 'PASSOU'
} catch {
    $report.status = 'FALHOU'
    $report.failure = $_.Exception.Message
} finally {
    $report.finishedAt = [DateTime]::UtcNow.ToString('o')
    $report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $runDirectory 'readme-powershell.json') -Encoding utf8
    Write-Output ([pscustomobject]$report | Select-Object status,failure,orderId,startedAt,finishedAt | ConvertTo-Json)
}
if ($report.status -ne 'PASSOU') { exit 1 }
