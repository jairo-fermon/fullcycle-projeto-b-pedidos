# Gate de aceite - Projeto B

Data: 08/11/2026. Ciclo canônico: 11:43:28-11:45:00, America/Sao_Paulo (UTC-03:00).
Revisão de código local validada: `10caa5fd38b9c45f29e6737c52ed306d1ee0123f`.
Repositório criado pelo aluno: https://github.com/jairo-fermon/fullcycle-projeto-b-pedidos (público, metadados conferidos pelo conector).

**Resultado: validação técnica local e CI remoto PASSARAM.** Código publicado e fechado para revisão na revisão `c09d20489f1c6b77e1b74cbee833c3526ef9d95b`; alterações de documentação posteriores registram evidências sem mudar a implementação. O aluno aprovou B e A e autorizou auditoria/apresentações. [Repetição limpa e estado atual](FECHAMENTO_AUDITORIA.md). Moodle e ensaio permanecem sem comprovante. A estimativa interna consta no pacote final separado; os pesos abaixo são os módulos oficiais inteiros, sem subpesos inventados.

[CI real verde, execução 42492067490](https://github.com/jairo-fermon/fullcycle-projeto-b-pedidos/actions/runs/42492067490): início em 08/11 às 11:54:09 e conclusão success verificada às 11:54:47, horário local UTC-03:00. Os metadados constam em `evidencias/ci-github.json`. O job executou todos os controles, incluindo 58 testes e os mesmos percentuais de cobertura locais.

## Matriz requisito -> implementação -> comando -> evidência -> situação

Todos os comandos partem da raiz deste repositório. `npm run validate:local -- --clean` executa o ciclo inteiro e registra os comandos exatos. Ele apaga somente o banco local deste projeto; usar conscientemente. Cada PASSOU abaixo corresponde à execução indicada, não a uma garantia geral.

| Requisito / peso do módulo | Código/arquivo | Verificação reproduzível | Evidência real em docs/evidencias/ | Status | Risco / limite |
| --- | --- | --- | --- | --- | --- |
| M1 / 35: Compose em um comando | docker-compose.yml, Dockerfile | docker compose up --build -d --wait | subida-limpa.txt, compose-status.txt | PASSOU | Requer Docker Linux ativo e preparação explícita do .env. |
| M1 / 35: banco vazio e migrations | migrations/001-create-orders.sql, src/infrastructure/migrate.ts | Validador com --clean, depois subida | limpeza.txt, subida-limpa.txt, qualidade.txt | PASSOU | Limpeza é destrutiva só para o B; checksum detecta edição de migration aplicada. |
| M1 / 35: fluxo real de pedidos | src/domain/order.ts, src/application/order-service.ts, src/http/order-routes.ts | npm run demo | demonstracao.txt | PASSOU | Somente criação/consulta/confirmação, sem pagamento. |
| M1 / 35: persistência e atomicidade | src/infrastructure/postgres-order-repository.ts | SQL, restart e integração | persistencia-sql.txt, persistencia-reinicio.json, qualidade.txt | PASSOU | Recriar volume apaga dados; reiniciar app não apaga. |
| M1 / 35: validação/erros/concorrência | src/app.ts, domínio e repositório | Unitários e HTTP com 8 confirmações simultâneas | qualidade.txt | PASSOU | Um 200 e sete 409 no teste; erro inesperado permanece genérico. |
| M1 / 35: SOLID e pattern | interface OrderRepository, serviço e implementação; ADR 0001 | Inspeção de imports e testes por interface | Código e docs/adr/0001-decisao.md | PASSOU | Aplicação concreta de inversão de dependência; explicação pelo aluno ainda pendente. |
| M2 / 20: unitários significativos | tests/unit/*.test.ts | npm run test:unit ou suíte no Compose | qualidade.txt: 41 unitários | PASSOU | Tests não provam inexistência de defeitos. |
| M2 / 20: integração real isolada | tests/integration/api-postgres.test.ts | docker compose --profile test run --rm tests | qualidade.txt: 17 integrações | PASSOU | HTTP real, PostgreSQL real, DB _test; sem skip silencioso. |
| M2 / 20: cobertura mínima respeitada | vitest.config.ts, src/ inteiro | npm test | coverage-summary.json e qualidade.txt | PASSOU | 100% linhas/96,47% branches; mínimo 80/70; bootstrap fora do escopo src. |
| M2 / 20: pipeline install/lint/test | .github/workflows/ci.yml | Sequência equivalente local em contêiner | qualidade.txt e subida-limpa.txt | PASSOU | Código do workflow existe; status remoto é item separado. |
| M2 / 20: CI verde remoto verificável | .github/workflows/ci.yml | Consultar execução GitHub Actions 42492067490 | ci-github.json, ci-testes-resumo.txt e link acima | PASSOU | Success verificado no commit publicado; não extrapolar para futuras alterações. |
| M3 / 15: segredos externos | .env.example, .gitignore, config e Compose | git ls-files, git check-ignore .env e revisão de arquivos | seguranca-versionamento.json após revisão final | PASSOU | Senha aleatória somente no .env ignorado; exemplos/fixtures não são credenciais reais. |
| M3 / 15: logs JSON | src/app.ts, src/observability.ts | docker compose logs --no-color --no-log-prefix app | logs-json.txt; teste de ausência de dados sensíveis em qualidade.txt | PASSOU | Sem SQL/erro bruto/payload/headers sensíveis; reqId correlaciona chamada. |
| M3 / 15: métrica consultável | src/observability.ts, GET /metrics | GET /orders real entre duas consultas /metrics | metrics.prom, validacao-local.json | PASSOU | Labels normalizados; reinício zera contadores; não contam pedidos no banco. |
| M3 / 15: SLO mensurável | scripts/k6-smoke.js, README, desempenho | Smoke 30 s, 1 VU | k6-summary.json, k6-terminal.txt | PASSOU | p95 criação 127,73 ms <500 ms nesta janela local; não SLO mensal de produção. |
| M4 / 30: README de primeiro dia | README.md | Seguir preparação e subida/testes/demo documentados | validacao-local.json e comandos datados | PASSOU | Repositório público e CI verificados; Moodle e ensaio ainda sem comprovante. |
| M4 / 30: um ADR com alternativa | docs/adr/0001-decisao.md | Conferir decisão contra imports/SQL | ADR e código | PASSOU | Revisão e defesa humana pendentes. |
| M4 / 30: OpenAPI compatível | docs/openapi.yaml, testes de integração | npm run openapi:lint e schemas Ajv contra respostas reais | qualidade.txt | PASSOU | Zero erros; 4 avisos de estilo, sem desativar regras ou inventar licença/rotas. |
| M4 / 30: smoke k6 com p95 | scripts/k6-smoke.js, docs/desempenho.md | docker compose --profile tools run --rm k6 | k6-summary.json, k6-terminal.txt, versões registradas | PASSOU | 116 chamadas, zero falha; baixa carga e amostra pequena. |
| Entrega transversal: autoria e IA | CONTRIBUTORS.md, docs/ia.md | Conferência com decisões do chat e histórico real | Documentação e git log | PASSOU | Aluno ainda precisa revisar e conseguir explicar; assistência de IA declarada. |
| Entrega: repositório e link CI | README, este gate | Conferir remoto e execução 42492067490 | ci-github.json e URLs reais | PASSOU | Repositório público criado pelo aluno; publicação autorizada expressamente. |
| Entrega: submissão ao Moodle | Ação do aluno | Obter comprovante de envio | Nenhum comprovante recebido | BLOQUEADO | Envio oficial não efetuado; apresentação do aluno em 13/11. |

## Fechamento e próximo passo

1. Publicação expressamente autorizada e realizada pelo conector autenticado como jairo-fermon. Identidade de autor/committer conferida no GitHub; nenhuma credencial da outra conta foi usada para escrever no remoto.
2. Commits remotos foram criados na data real da publicação, com mensagens de implementação, testes e documentação. Não se reproduziram datas antigas nem se fabricou contribuição manual. Os commits locais originais permanecem na branch local codex/projeto-b.
3. A árvore `1304347c5700a3d35dd1a3d18aeffb0e8e977007` da candidata local 27324d2 é idêntica à publicada em c09d204. Verificação real: `git rev-parse 27324d2^{tree}` e `git rev-parse origin/main^{tree}` no momento da publicação. O mapeamento completo está em ci-github.json.
4. CI remoto terminou success; o B tem baseline técnica identificada. Documentação posterior acrescenta a URL e este fechamento, sem mudar o fluxo ou as medições.
5. O aluno deve rever o [roteiro técnico](DEMONSTRACAO.md) e os cinco conceitos essenciais. Sem revisão humana, não afirmar aprendizado ou ensaio concluído.
6. Gate B e gate A cumpridos por aprovação literal do aluno. Pré-auditoria e PDFs autorizados; submissão oficial ao Moodle e ensaio permanecem ações sem comprovante.

## Falhas encontradas e corrigidas durante a execução

- Docker Desktop falhou em sockets transitórios antes do app. Diretórios de sockets foram preservados com outro nome; motor voltou a funcionar. Não houve restauração de fábrica, exclusão de imagens/volumes de outros projetos nem desativação de segurança.
- TypeScript identificou estreitamento insuficiente de erro desconhecido e interoperabilidade de import CommonJS no teste; corrigidos sem retirar strict.
- Coverage tentou remover a raiz de um bind mount. Relatórios passaram a `coverage/report`, mantendo limpeza e thresholds, e a execução em contêiner passou.
- Auditoria encontrou minimatch transitivo vulnerável em ferramenta de lint. Override para 11.0.5 e verificações reexecutadas; resultado final zero vulnerabilidades. Sem npm audit fix --force e sem supressão de alerta.
- Resultados preliminares não substituem o ciclo canônico limpo. Testes repetidos em banco já migrado podem produzir cobertura diferente das linhas de primeira aplicação da migration; o percentual informado aqui é o ciclo limpo identificado.
