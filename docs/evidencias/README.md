# Evidências reais do B

Ciclo de referência: `validacao-local.json`, iniciado em 08/11/2026 às 11:43:28 e concluído às 11:45:00, fuso America/Sao_Paulo. Os timestamps ISO com Z nos arquivos estão em UTC (somar 3 horas ao horário local). Contexto: raiz do repositório, comando `npm run validate:local -- --clean`, sourceCommit `10caa5fd38b9c45f29e6737c52ed306d1ee0123f`.

O validador grava saídas reais; cada TXT canônico começa com horário e comando e termina com exitCode. Saída stdout e stderr são preservadas por canal e concatenadas; a posição das mensagens entre canais não indica necessariamente ordem cronológica. Espaços e tabelas do terminal foram preservados, inclusive whitespace que não se aplica ao estilo de código-fonte.

| Arquivos | O que comprovam |
| --- | --- |
| validacao-local.json | Contexto/host, comandos, início/fim, códigos de saída, resumo da cobertura, persistência e k6. |
| limpeza.txt, compose-config.txt, subida-limpa.txt, compose-status.txt | Remoção dos dados locais deste projeto, configuração válida e app/bancos saudáveis após subida. |
| qualidade.txt, coverage-summary.json | lint, tipos, build, OpenAPI e 58 testes/coverage, com o patamar obrigatório ativo. |
| demonstracao.txt, persistencia-sql.txt, persistencia-reinicio.json, reinicio-app.txt | Fluxo HTTP real, registro SQL e igualdade do pedido antes/depois de reiniciar app. |
| logs-json.txt, metrics.prom | Logs JSON reais e métrica consultável depois de chamadas reais. |
| node-container.txt, postgres-container.txt, docker-versao.txt, compose-versao.txt, k6-versao.txt | Versões efetivamente executadas. |
| k6-summary.json, k6-terminal.txt | Smoke final: 116 chamadas, zero falha, p95 criação 127,73 ms. |
| k6-summary-primeira.json, k6-primeira.txt | Execução exploratória anterior em 08/11, preservada com amostra máxima de 1,74 segundo. Não é benchmark antes/depois de otimização. |
| auditoria-dependencias.json | Resumo real da consulta npm audit após atualização transitiva: zero vulnerabilidades reportadas na data da coleta. |
| seguranca-versionamento.json | .env ignorado, ausência de padrões de credencial e links locais conferidos; alcance da revisão explicitado. |

O arquivo de interface TypeScript `order-repository.ts` não tem código executável. A linha 0% exibida para ele na tabela detalhada corresponde a zero instruções/linhas instrumentáveis; não foi excluído do coverage. Percentuais globais informados são os calculados pelo V8/Vitest para todo `src/`.

Tentativas preliminares e falhas corrigidas estão resumidas no gate de aceite. Logs redundantes das primeiras tentativas foram preservados localmente em `tmp/verificacoes-iniciais/`, fora do versionamento. Os resultados finais não são inventados nem selecionados pelo menor p95. Estes arquivos não comprovam CI remoto ou envio ao Moodle.
