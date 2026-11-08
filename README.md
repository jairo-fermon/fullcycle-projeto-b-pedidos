# Projeto B — Full Cycle

API de domínio único para criar, consultar e confirmar pedidos. Trabalho individual de Jairo Fermon. Total calculado no servidor em centavos inteiros; PostgreSQL guarda pedido e itens de forma durável. Não há pagamento real, frontend ou autenticação.

## Estado e evidências

Validação técnica local e remota concluída em 08/11/2026. [Repositório público](https://github.com/jairo-fermon/fullcycle-projeto-b-pedidos) e [execução real verde do CI](https://github.com/jairo-fermon/fullcycle-projeto-b-pedidos/actions/runs/42492067490), commit `c09d20489f1c6b77e1b74cbee833c3526ef9d95b`. Resultado local: 58 testes, cobertura de 100% das linhas e 96,47% dos branches; smoke final com p95 de criação 127,73 ms e zero falhas. Consulte a [matriz de aceite](docs/ACEITE_B.md) para evidências, limites e revisão humana pendente. Envio ao Moodle ainda não efetuado.

## Pré-requisitos

- Node 24 LTS, npm 11 e Docker Desktop em modo Linux com Compose v2. Verifique `node --version`, `npm --version`, `docker info` e `docker compose version`.
- Porta local 3000 livre (ou configure `PORT` no `.env`). O PostgreSQL não publica porta para a máquina.
- Na primeira preparação, dentro desta pasta, execute `npm run env:init`. Esse comando usa apenas Node, cria `.env` com senha aleatória e não sobrescreve arquivo existente. O arquivo real é ignorado pelo Git. `.env.example` documenta nomes e valores de exemplo sem senha fixa.
- Obter as imagens e dependências exige acesso à internet na primeira execução. Não é necessário instalar PostgreSQL ou k6 no Windows.

## Subir com um comando

Depois da preparação explícita do ambiente:

```powershell
docker compose up --build -d --wait
```

O Compose sobe PostgreSQL e app; aguarda banco saudável; aplica migrations automaticamente antes do HTTP; espera o health check da API, que consulta o banco. Arquivos SQL já aplicados têm checksum verificado. Não há migration manual oculta.

```powershell
docker compose ps
Invoke-RestMethod http://127.0.0.1:3000/health
```

Para parar preservando pedidos: `docker compose down`. Para reiniciar somente app: `docker compose restart app`; aguarde health. Os dados ficam no volume `fullcycle-b-pedidos_orders-data`.

**Validação limpa e destrutiva, somente deste projeto:** `docker compose down --volumes --remove-orphans`, seguido pelo comando de subida acima. Isso apaga os pedidos locais do B. Não usar em dados que queira manter, nem executar na pasta de outro projeto. Migrations devem funcionar em banco vazio.

## Demonstração executável

Com o Compose saudável, rode `npm run demo`. O script faz chamadas HTTP reais, verifica códigos/total/status e falha se o fluxo não corresponder. Para outra porta, configure `PORT` no `.env`; para outro endereço, use variável `BASE_URL`.

Exemplo manual no PowerShell (ajuste a URL se alterou PORT):

```powershell
$baseUrl = 'http://127.0.0.1:3000'
$body = @{ items = @(@{ sku='CANETA-AZUL'; quantity=2; unitPriceCents=1500 }) } | ConvertTo-Json -Depth 4
$order = Invoke-RestMethod -Method Post -Uri "$baseUrl/orders" -ContentType 'application/json' -Body $body
$order
Invoke-RestMethod "$baseUrl/orders/$($order.id)"
Invoke-RestMethod -Method Post "$baseUrl/orders/$($order.id)/confirm"
Invoke-RestMethod "$baseUrl/orders/$($order.id)"
```

Resultado esperado do exemplo: total de 3.000 centavos, inicialmente `PENDING` e depois `CONFIRMED`. São expectativas verificáveis; os resultados efetivamente executados estão em `docs/evidencias/`. Uma segunda confirmação retorna HTTP 409.

Conferir persistência diretamente no banco, sem imprimir senha:

```powershell
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT id,status,total_cents FROM orders ORDER BY created_at DESC LIMIT 5;"'
```

## Regras, contratos e erros

| Operação | Sucesso | Erros de negócio/entrada |
| --- | --- | --- |
| POST /orders | 201 e Location | 400 entrada inválida; 413 corpo >64 KiB; 415 conteúdo não suportado |
| GET /orders/{id} | 200 | 400 UUID inválido; 404 pedido ausente |
| POST /orders/{id}/confirm | 200 | 400 UUID inválido; 404 ausente; 409 já confirmado |
| GET /health | 200 quando banco responde | 503 dependência indisponível |
| GET /metrics | 200, texto Prometheus | Rota técnica; não altera pedidos |

Falha interna usa 500 genérico com request ID. Respostas de erro de pedidos contêm `error.code`, `error.message` e `error.requestId`. `x-request-id` é gerado pelo servidor, sem confiar no valor enviado pelo cliente.

Cada pedido tem de 1 a 100 itens; SKU de 1 a 64 caracteres, sem espaços nas pontas; quantidade inteira 1 a 1.000; preço inteiro 1 a 1.000.000 centavos. Campos adicionais e coerção de strings para números são rejeitados. Total máximo 100.000.000.000 centavos, dentro do inteiro seguro do JavaScript; banco usa BIGINT com conversão explicitamente verificada. Não aceitar preço decimal evita erros de ponto flutuante.

Pedido e itens são gravados na mesma transação. A confirmação faz `UPDATE ... WHERE status='PENDING'`, portanto duas requisições simultâneas não confirmam duas vezes. Repetição é recusada com 409; este endpoint não promete retornar sucesso idempotente.

## Arquitetura e decisões

Um único domínio, com separação técnica: rota HTTP -> OrderService -> regras de domínio/interface OrderRepository -> PostgresOrderRepository -> PostgreSQL. A montagem da aplicação injeta a persistência real; os únicos doubles ficam nos testes unitários.

- [ADR único](docs/adr/0001-decisao.md): Repository com SQL explícito, comparado a SQL diretamente nas rotas.
- SOLID concreto: `src/application/order-service.ts` depende da interface `order-repository.ts`, sem importar `pg`. A implementação concreta fica em `src/infrastructure/postgres-order-repository.ts`.
- `src/domain/order.ts`: regras e cálculo; `src/app.ts`: montagem e tratamento de erros; `src/observability.ts`: medição de requisições.
- Migrations SQL transacionais em `migrations/`, aplicadas por `src/infrastructure/migrate.ts` com lock e checksum.
- Stack efetiva em `package-lock.json`. Métricas usam `@prometheus-io/client`, sucessor oficial do pacote `prom-client`; não é necessário servidor Prometheus para consultar a rota.

O lockfile fixa `minimatch` 11.0.5 por override: a auditoria encontrou GHSA-g3hv-75wg-m249 na versão 10 transitiva das ferramentas de lint. Não houve supressão do alerta; a atualização foi seguida de lint, verificação de tipos e testes reais. Essa dependência é de desenvolvimento, não do contêiner de execução.

## Testes e qualidade

Tudo em contêiner, com PostgreSQL de teste isolado e descartável em tmpfs:

```powershell
docker compose --profile test run --build --rm tests npm run lint
docker compose --profile test run --rm tests npm run typecheck
docker compose --profile test run --rm tests npm run openapi:lint
docker compose --profile test run --rm tests
```

O último comando executa unitários e integração com coverage. A integração faz HTTP real em porta efêmera e SQL real. Não usa o volume dos pedidos de demonstração. Ela falha se `PGDATABASE` não terminar em `_test`; não há skip silencioso. Para remover o banco de teste: `docker compose --profile test stop test-db` e `docker compose --profile test rm -f test-db`.

Para repetir o gate local completo com relatório por etapa: `npm run validate:local`. A opção `npm run validate:local -- --clean` também remove os volumes **somente deste projeto**, começando de banco vazio e apagando os pedidos locais do B. Os resultados ficam em `docs/evidencias/validacao-local.json`; coverage completo em `coverage/report/` (ignorado no Git), com resumo pequeno versionado nas evidências.

Alternativa local (desenvolvimento): `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:unit` e `npm run openapi:lint`. Integração e `npm test` requerem PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD apontando para um PostgreSQL de teste. Não colocar credenciais na linha de comando ou no histórico; fornecer por ambiente local. `npm start` também aceita essas variáveis para execução fora de contêiner.

O mínimo declarado para o código em `src/` é **80% linhas e 70% branches**, fiscalizado pelo Vitest. São metas nossas; o professor exige um mínimo declarado, sem impor esses números. Não há exclusões de arquivos de `src/`. Bootstrap `scripts/start.mjs` é validado pela subida real do Compose e não participa do percentual de `src/`. Os testes verificam cálculo, limites, erros HTTP, rollback, concorrência, migrations, logs sem dados sensíveis, métricas e schemas das respostas reais contra o OpenAPI.

GitHub Actions faz npm ci, lint, typecheck, build, lint OpenAPI e testes/coverage com PostgreSQL isolado. A senha de teste da CI é derivada do identificador da execução, usada somente no serviço efêmero; não é credencial de ambiente real.

A execução remota acima terminou com `success`, e o job registrou os mesmos 58 testes e cobertura do ciclo limpo local. Metadados e trechos reais em `docs/evidencias/ci-github.json` e `ci-testes-resumo.txt`. A publicação autorizada usou o conector da conta correta; os commits remotos têm hashes próprios. O Git confirmou árvore de arquivos idêntica à candidata local, conforme o registro de publicação.

## Logs, métrica e SLO

```powershell
docker compose logs --no-color app
Invoke-WebRequest http://127.0.0.1:3000/metrics | Select-Object -ExpandProperty Content
```

Cada log `request_completed` é JSON com reqId, método, rota normalizada, status e durationMs. Não registrar corpos, SQL bruto, cookies ou autorização. Erros inesperados geram código genérico no log, correlacionado pelo reqId.

Métrica: `http_requests_total{method,route,status}` e `http_request_duration_seconds` (histograma). Labels usam `/orders/:id`, nunca UUIDs. O contador reinicia com o processo e não mede pedidos totais no banco. `/metrics` não se contabiliza para evitar interferência da coleta; health é contabilizado.

SLI: p95 observado da duração HTTP de `POST /orders`, em milissegundos, coletado pelo k6. SLO: **p95 <500 ms durante smoke de 30 segundos, 1 usuário virtual, pausas de 1 segundo, Compose local saudável**, sem erro nas chamadas/checagens do fluxo. Meta não é garantia de capacidade em produção.

```powershell
docker compose --profile tools run --rm k6
```

Resultado resumido real é escrito em `docs/evidencias/k6-summary.json`. Cada execução substitui esse arquivo; só versionar depois de revisar. O script falha se p95, erros HTTP ou checks violarem o critério. Ver [relatório de desempenho](docs/desempenho.md) para ambiente, medições, limites e interpretação.

## Troubleshooting

- `docker info` falha: CLI instalada não comprova engine ativo. Corrigir Docker Desktop/WSL antes de alegar Compose validado. O erro de sockets encontrado neste computador está registrado nas evidências ambientais; não faz parte do comportamento da API.
- `POSTGRES_PASSWORD` ausente: executar `npm run env:init`. Se `.env` já existe com senha vazia, editar localmente sem versionar.
- Alterar senha no `.env` não altera automaticamente usuário de volume PostgreSQL existente. Preservar dados e ajustar a senha no banco ou recriar somente o volume descartável deste projeto, conscientemente.
- Porta ocupada: definir outra PORT no `.env`, subir novamente e ajustar URL da demonstração.
- Health 503: verificar serviço db, logs e credenciais; readiness consulta PostgreSQL de verdade.
- Migration com checksum diferente: restaurar arquivo aplicado e criar nova migration para nova mudança; não apagar histórico para ocultar divergência.
- Coverage ou teste falhou: corrigir código/teste relevante; não reduzir threshold ou excluir arquivo para produzir verde.
- OpenAPI: avisos de linter sobre localhost, licença de redistribuição não definida e ausência de erro 4xx em rotas técnicas não exigem inventar licença, ambiente público ou respostas que não existem. A especificação deve refletir a API; as regras recomendadas não foram desativadas.

## Documentação, autoria e entrega

- [OpenAPI](docs/openapi.yaml), [ADR](docs/adr/0001-decisao.md), [desempenho](docs/desempenho.md), [aceite](docs/ACEITE_B.md), [roteiro de demonstração](docs/DEMONSTRACAO.md).
- [Contribuição humana](CONTRIBUTORS.md) e [assistência de IA/decisões](docs/ia.md).
- Apresentação informada pelo aluno: 13/11/2026. Meta de implementação e validação: 08/11/2026. Envio ao Moodle não foi efetuado por este projeto.
- Projeto A não é requisito para entregar B; só será iniciado após aprovação expressa do B. PDFs definitivos e auditoria comparativa seguem gates do briefing e não estão declarados prontos.
