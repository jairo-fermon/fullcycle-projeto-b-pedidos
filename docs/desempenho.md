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

Código validado: commit local `10caa5fd38b9c45f29e6737c52ed306d1ee0123f`. Commits posteriores de documentação/evidência não representam uma mudança de algoritmo de negócio ou otimização de desempenho. CI remoto ainda não foi executado nesta etapa.

## Limitações

Smoke verifica funcionamento e latência sob baixa carga; não comprova escalabilidade. A quantidade pequena de amostras torna o p95 sensível a inicialização, disco e outras tarefas do computador. Não há comparação antes/depois nem três estágios no B, pois são requisitos do A. Meta declarada não significa resultado atingido.
