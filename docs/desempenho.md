# Desempenho - Projeto B

Status em 08/11/2026: **PASSOU no smoke local declarado**. A validação completa com banco inicialmente vazio ocorreu de 11:43:28 a 11:45:00 (America/Sao_Paulo, UTC-03:00). O comando de k6 dessa validação começou às 11:44:26 e terminou às 11:45:00, incluindo preparação do contêiner. Fonte: `evidencias/validacao-local.json` e `evidencias/k6-terminal.txt`.

## Cenário e meta declarados antes da medição

- Fluxo: POST /orders -> GET -> POST confirm -> GET do estado atualizado.
- Smoke: 1 usuário virtual por 30 segundos, pausa de 1 segundo entre iterações, sem seed volumoso.
- SLI principal: p95 da duração HTTP de POST /orders, em ms, trend `create_order_duration` do k6.
- SLO para esta janela/ambiente controlado: p95 <500 ms; zero erros HTTP e 100% dos checks de criação, consulta e confirmação.
- Ambiente alvo: Compose local, app e PostgreSQL saudáveis. Não extrapolar para disponibilidade mensal ou capacidade de produção.
- Comando: `docker compose --profile tools run --rm k6`.
- Resultado resumido: `docs/evidencias/k6-summary.json`, gerado pelo k6, não preenchido manualmente.

## Ambiente físico observado

Windows build 26200, CPU Intel Core i5-1135G7 @2.40GHz, 8 processadores lógicos. Consulta real de memória retornou 16.893.386.752 bytes (aproximadamente 15,73 GiB). As versões efetivas, janela e condições de execução estão registradas abaixo. CPU/RAM do host não são uma reserva exclusiva para os contêineres.

Versões executadas na medição final: Docker Engine/CLI 29.1.3, Compose 2.40.3-desktop.1, Node no contêiner v24.22.2, PostgreSQL 17.11 e k6 v1.3.0+dirty (build reportado pela imagem oficial grafana/k6:1.3.0; o sufixo foi preservado, não ocultado). Node do host: v24.19.0. App e banco em contêineres Linux no Docker Desktop/WSL2; gerador k6 no mesmo host. Desktop com navegador e Codex abertos; não houve reserva exclusiva de CPU. A suíte e o build foram concluídos antes deste smoke final.

## Resultado final real

| Indicador | Valor observado |
| --- | --- |
| Usuários virtuais / duração configurada | 1 / 30 segundos |
| Duração efetiva do cenário | Aproximadamente 30,4 segundos, com iteração final concluída |
| Iterações completas | 29; uma criação e quatro chamadas HTTP por iteração |
| Requisições HTTP | 116 |
| Throughput observado | 3,8112 requisições/s, limitado deliberadamente pela pausa de 1 segundo |
| Checks de negócio | 116 aprovados, zero reprovados |
| Taxa de falhas HTTP | 0% |
| p95 POST /orders | **127,73 ms**, arredondado de 127.72999699999995 |
| Média / mediana POST /orders | 23,73 ms / 6,60 ms |
| Máximo POST /orders | 189,29 ms |
| p95 de todas as rotas HTTP | 64,02 ms; não confundir com o p95 da criação |
| Critério | p95 criação <500 ms, zero erro HTTP, 100% dos checks |
| Resultado | PASSOU; processo k6 terminou com código 0 |

São 29 amostras de criação (uma por iteração), não 116 amostras de POST /orders. Valores completos e thresholds estão em `evidencias/k6-summary.json`. No formato legado exportado pelo k6, o booleano false associado ao threshold indica ausência de falha; o terminal e o código de saída confirmam aprovação. Não confundir esses flags com resultado falso do SLO.

## Execução exploratória anterior e interpretação

A execução exploratória no mesmo dia gerou 112 requisições, 28 iterações, p95 de criação 19,10 ms e máximo de criação 1.739,57 ms. Resultado original preservado em `evidencias/k6-summary-primeira.json` e `evidencias/k6-primeira.txt`. Ela ocorreu durante outras verificações/builds no computador. Não houve instrumentação suficiente para atribuir a origem da amostra lenta a um componente específico.

Na validação final após limpeza do banco, o p95 foi maior, enquanto o máximo foi menor. Isso é variação de duas amostras pequenas, **não evidência de otimização**. Não foi escolhida a execução de menor p95 para representar o resultado final. O SLO de p95 foi atendido em ambas, e a amostra de 1,74 segundo da primeira mostra por que p95 não significa que toda requisição ficou abaixo de 500 ms.

## Reprodução

1. Dentro da raiz do projeto, executar `npm run env:init` uma vez.
2. Para repetir somente o smoke: `docker compose up --build -d --wait`, depois `docker compose --profile tools run --rm k6`.
3. Para repetir a validação completa desde banco vazio: `npm run validate:local -- --clean`. **Esse último comando apaga somente os dados locais do projeto B**, inclusive pedidos de demonstração; não usar se quiser conservá-los.
4. Consultar `docs/evidencias/validacao-local.json`, saídas datadas por etapa e `k6-summary.json`. Novas execuções substituem esses arquivos; preservar versões anteriores se precisar compará-las.

Código validado: commit local `10caa5fd38b9c45f29e6737c52ed306d1ee0123f`, correspondente ao commit remoto de testes `f457069e16b5bf733b1c62b2690db6caf0f20d33`. A candidata completa publicada em `c09d20489f1c6b77e1b74cbee833c3526ef9d95b` teve sua árvore comparada com a candidata local: conteúdo idêntico. [CI remoto concluído com sucesso](https://github.com/jairo-fermon/fullcycle-projeto-b-pedidos/actions/runs/42492067490). Commits de documentação/evidência não representam mudança do algoritmo de negócio ou otimização de desempenho.

## Limitações

Smoke verifica funcionamento e latência sob baixa carga; não comprova escalabilidade. A quantidade pequena de amostras torna o p95 sensível a inicialização, disco e outras tarefas do computador. Não há comparação antes/depois nem três estágios no B, pois são requisitos do A. Meta declarada não significa resultado atingido.

## Reprodução do hardening B em 08/11/2026

Nova execução em clone obtido diretamente do GitHub no SHA `a105fb340e66609ea54f781b5fd639663759964c`, com PostgreSQL/volume novos, porta 3002 e nome Compose próprio. Mesmo código e script do B; sem --clean ou exclusão de volumes. Janela do ciclo UTC 2026-11-08T17:14:20.466Z a 2026-11-08T17:15:28.136Z. Detalhes em [relatório do hardening](../RELATORIO_HARDENING_B.md) e [evidências identificadas](evidencias/hardening-b-20261108/LEIA-ME.md).

Smoke: 1 VU, 30 segundos configurados, 30 iterações/30 amostras de criação, 120 chamadas HTTP, zero erros e todos os checks. Mediana 10.494341 ms, p95 criação **28.970620 ms**, máximo 111.244488 ms e throughput 3.881853 requisições/s. p99 não foi exportado e não foi calculado artificialmente. Thresholds atendidos com exit code 0.

Os resultados anteriores permanecem preservados. Não houve alteração de algoritmo ou otimização: diferenças de latência são variações entre execuções locais de amostra pequena, não ganho causal. A correção da etapa é no comando PowerShell de confirmação e na documentação, validada separadamente. Publicação do hardening autorizada e executada: [CI success](https://github.com/jairo-fermon/fullcycle-projeto-b-pedidos/actions/runs/42511035479) no SHA `1a7e916c370910aac4649b77c66f260edec2a28b`. O commit posterior de fechamento documental tem CI própria, registrada no certificado externo final; as medições locais não foram executadas no runner GitHub.
