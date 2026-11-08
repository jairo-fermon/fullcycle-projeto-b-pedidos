# Gate de aceite - Projeto B

Data: 08/11/2026. Ciclo canônico: 11:43:28-11:45:00, America/Sao_Paulo (UTC-03:00).
Revisão de código local validada: `10caa5fd38b9c45f29e6737c52ed306d1ee0123f`.
Repositório criado pelo aluno: https://github.com/jairo-fermon/fullcycle-projeto-b-pedidos (público, metadados conferidos pelo conector).

**Resultado: validação técnica local PASSOU; gate completo ainda BLOQUEADO pelo envio autorizado e CI remoto.** O B não está declarado congelado/aprovado. O A não foi iniciado. Não foi atribuída nota estimada nesta etapa; os pesos abaixo são os módulos oficiais inteiros, sem subpesos inventados.

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
| M2 / 20: CI verde remoto verificável | .github/workflows/ci.yml | Publicar revisão autorizada e consultar execução GitHub Actions | Nenhuma URL de execução ainda | BLOQUEADO | Necessários autorização de envio, acesso de escrita à conta correta e conclusão success. |
| M3 / 15: segredos externos | .env.example, .gitignore, config e Compose | git ls-files, git check-ignore .env e revisão de arquivos | seguranca-versionamento.json após revisão final | PASSOU | Senha aleatória somente no .env ignorado; exemplos/fixtures não são credenciais reais. |
| M3 / 15: logs JSON | src/app.ts, src/observability.ts | docker compose logs --no-color --no-log-prefix app | logs-json.txt; teste de ausência de dados sensíveis em qualidade.txt | PASSOU | Sem SQL/erro bruto/payload/headers sensíveis; reqId correlaciona chamada. |
| M3 / 15: métrica consultável | src/observability.ts, GET /metrics | GET /orders real entre duas consultas /metrics | metrics.prom, validacao-local.json | PASSOU | Labels normalizados; reinício zera contadores; não contam pedidos no banco. |
| M3 / 15: SLO mensurável | scripts/k6-smoke.js, README, desempenho | Smoke 30 s, 1 VU | k6-summary.json, k6-terminal.txt | PASSOU | p95 criação 127,73 ms <500 ms nesta janela local; não SLO mensal de produção. |
| M4 / 30: README de primeiro dia | README.md | Seguir preparação e subida/testes/demo documentados | validacao-local.json e comandos datados | PASSOU | Conta/CI e Moodle ainda pendentes; instruções deixam isso explícito. |
| M4 / 30: um ADR com alternativa | docs/adr/0001-decisao.md | Conferir decisão contra imports/SQL | ADR e código | PASSOU | Revisão e defesa humana pendentes. |
| M4 / 30: OpenAPI compatível | docs/openapi.yaml, testes de integração | npm run openapi:lint e schemas Ajv contra respostas reais | qualidade.txt | PASSOU | Zero erros; 4 avisos de estilo, sem desativar regras ou inventar licença/rotas. |
| M4 / 30: smoke k6 com p95 | scripts/k6-smoke.js, docs/desempenho.md | docker compose --profile tools run --rm k6 | k6-summary.json, k6-terminal.txt, versões registradas | PASSOU | 116 chamadas, zero falha; baixa carga e amostra pequena. |
| Entrega transversal: autoria e IA | CONTRIBUTORS.md, docs/ia.md | Conferência com decisões do chat e histórico real | Documentação e git log | PASSOU | Aluno ainda precisa revisar e conseguir explicar; assistência de IA declarada. |
| Entrega: link/CI e Moodle | README, este gate | Revisar remoto, URL CI e comprovante de envio | Metadados do remoto; sem CI nem comprovante Moodle | BLOQUEADO | Não marcar entrega efetuada sem ação/comprovante do aluno. |

## Pendências e próximo passo

1. Autorizar expressamente o envio dos arquivos revisados ao repositório público informado. Sem isso não executar push nem escrita equivalente pela API.
2. Usar acesso de escrita da conta jairo-fermon. O terminal está autenticado como jairofermon (outra conta); o conector correto tem permissão de escrita. Não reutilizar identidade/credencial da conta errada.
3. Publicar e acompanhar GitHub Actions; corrigir eventual falha e guardar URL realmente verde. Este documento deve ser atualizado com resultado real.
4. Rever o [roteiro técnico](DEMONSTRACAO.md) e os cinco conceitos essenciais. Sem revisão humana, não afirmar aprendizado ou ensaio concluído.
5. Apenas após B aprovado e congelado, aguardar `APROVO O PROJETO B; INICIAR O A`. Não usar aprovação de publicação como aprovação do A.

## Falhas encontradas e corrigidas durante a execução

- Docker Desktop falhou em sockets transitórios antes do app. Diretórios de sockets foram preservados com outro nome; motor voltou a funcionar. Não houve restauração de fábrica, exclusão de imagens/volumes de outros projetos nem desativação de segurança.
- TypeScript identificou estreitamento insuficiente de erro desconhecido e interoperabilidade de import CommonJS no teste; corrigidos sem retirar strict.
- Coverage tentou remover a raiz de um bind mount. Relatórios passaram a `coverage/report`, mantendo limpeza e thresholds, e a execução em contêiner passou.
- Auditoria encontrou minimatch transitivo vulnerável em ferramenta de lint. Override para 11.0.5 e verificações reexecutadas; resultado final zero vulnerabilidades. Sem npm audit fix --force e sem supressão de alerta.
- Resultados preliminares não substituem o ciclo canônico limpo. Testes repetidos em banco já migrado podem produzir cobertura diferente das linhas de primeira aplicação da migration; o percentual informado aqui é o ciclo limpo identificado.
