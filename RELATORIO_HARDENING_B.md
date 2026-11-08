# RELATORIO_HARDENING_B

Data: 08/11/2026, America/Sao_Paulo. Autorização literal: `APROVO O DIAGNÓSTICO; INICIAR HARDENING DO B`. O complemento Docker foi incorporado a esta etapa. Projeto A preservado.

## Parecer e identificação

**Validação local: PASSOU.** A candidata corrige a demonstração PowerShell e completa documentação de obtenção/persistência e identificação de evidências. Nenhuma mudança em src, tests, scripts de produção/validação, migrations, dependências, Docker, thresholds ou workflow.

Baseline pública preservada: `a105fb340e66609ea54f781b5fd639663759964c`, árvore `846f8c04bf4faf05eccf8f41059c98c01977511d`. [CI dessa baseline: success](https://github.com/jairo-fermon/fullcycle-projeto-b-pedidos/actions/runs/42499107175). Esse link não comprova uma candidata nova. O hash da candidata documental é obtido por `git rev-parse HEAD` após o commit e informado no fechamento ao aluno, evitando inserir o hash do próprio arquivo dentro dele.

**Publicação autorizada e CI do hardening: PASSOU.** O aluno respondeu literalmente “Autorizo publicar o hardening do B e executar o CI”. A candidata local `9f69ad526960aa689799627eb9f3a8c741b48702` foi publicada como `1a7e916c370910aac4649b77c66f260edec2a28b`, com a mesma árvore `4c1acac7d98019c0139391b26ad24d482bd09465`. [Execução verificada: success](https://github.com/jairo-fermon/fullcycle-projeto-b-pedidos/actions/runs/42511035479), com 58 testes e cobertura 100%/96,47%. Metadados em [ci-hardening.json](docs/evidencias/hardening-b-20261108/ci-hardening.json).

Este fechamento acrescenta apenas documentação/evidências aos ajustes já validados. A CI do commit que inclui este próprio registro deve ser verificada separadamente pelo SHA no [histórico de main](https://github.com/jairo-fermon/fullcycle-projeto-b-pedidos/actions/workflows/ci.yml?query=branch%3Amain); o certificado externo CI_FINAL_B.json, entregue ao aluno, registra seu hash e URL exatos após conclusão. A classificação definitiva exige essa verificação. Não houve Moodle, release, tag ou início do hardening A.

## Problemas, hipótese, correção, teste e risco residual

| Prioridade | Problema reproduzido | Hipótese | Correção mínima | Teste executado / resultado | Risco residual |
| --- | --- | --- | --- | --- | --- |
| P0 de demonstração/documentação | O comando de confirmação do README retornou HTTP 415 no PowerShell 7.6.9. | O cliente define Content-Type application/x-www-form-urlencoded no POST sem parâmetros explícitos. | Exemplo envia application/json e objeto vazio; OpenAPI documenta a resposta 415 real. API mantida. | Falha preservada; comando corrigido retornou CONFIRMED, repetição 409; PASSOU. | Windows PowerShell 5.1 não foi executado; runtime validado é o indicado. Usar cabeçalho/corpo explícitos. |
| P1 | README iniciava na pasta pronta, sem clone/cd explícitos. | Avaliador precisaria inferir como obter o projeto. | Adicionar git clone, Set-Location e preparo seguro com env:init. | Clone direto do GitHub, início limpo, build/up/fluxo/SQL/restart reais; PASSOU. | Primeiro download requer internet e Docker Linux ativo. |
| P1 | Link principal de CI apontava para c09d204, embora baseline atual seja a105fb3. | Mistura entre execução histórica e candidata pode induzir conclusão incorreta. | Identificar CI da baseline atual e pendência da nova revisão; link de histórico do workflow. | Identificação e links revisados; publicação autorizada e CI do hardening PASSOU. | Necessário verificar o SHA efetivamente publicado após autorização. |
| P1 | Persistência era demonstrada pelo validador, sem sequência manual completa no README. | Professor precisaria combinar instruções. | Incluir restart, espera de saúde e consulta do mesmo ID em PowerShell. | Pedido 5aa5ba51-dd22-4703-9520-4aef2646ae48 continuou CONFIRMED/3000 após restart e após trocar o contêiner app; PASSOU. | Remover volume apaga dados; isso não foi executado. |

## Arquivos alterados

- README.md: clone, configuração, confirmação JSON, persistência e estado de CI.
- docs/openapi.yaml: explicação da confirmação e 415 observado, usando schema de erro existente.
- docs/ACEITE_B.md e docs/DEMONSTRACAO.md: distinguir registros históricos da candidata e apontar procedimento atual.
- docs/desempenho.md: acrescentar nova medição real, preservando anteriores.
- docs/ia.md: registrar autorização e decisões desta etapa, sem presumir aprendizado/publicação.
- RELATORIO_HARDENING_B.md e docs/evidencias/hardening-b-20261108/: relatório e evidências reais.

## VALIDAÇÃO DOCKER E REPRODUTIBILIDADE DA ENTREGA

| Critério | Evidência | Status |
| --- | --- | --- |
| Arquivos Docker versionados | GitHub e local na baseline: 72 blobs iguais; Dockerfile, Compose, ignores, env.example, scripts, migrations e lockfile presentes. | PASSOU |
| Clone limpo | git clone do repositório público com helper desabilitado; HEAD a105fb340e66609ea54f781b5fd639663759964c; status inicialmente vazio. clone.json. | PASSOU |
| Docker Compose | env:init, PORT=3002 e COMPOSE_PROJECT_NAME isolados; docker compose up --build -d --wait. Sem --clean, exclusão de volumes ou configuração local copiada. | PASSOU |
| Serviços saudáveis | app e db healthy; health consulta PostgreSQL. subida-limpa.txt e compose-status.txt. | PASSOU |
| Migrations | Inicialização automática antes do HTTP; SQL confirmou uma migration aplicada; checksum/rollback exercitados na suíte. | PASSOU |
| Fluxo principal | Criação 201, GET, confirmação 200 e GET CONFIRMED; total 3000; 400/404/409 verificados. demonstracao.txt e readme-powershell.json. | PASSOU |
| Persistência | Mesmo pedido após restart e recriação do app; SQL confirmou id/status/total. | PASSOU |
| Encerramento | compose down sem -v/--volumes; volume nomeado ainda existe e contêineres auxiliares encerrados. | PASSOU |
| README reproduzível | Comandos executados em PowerShell; porta adaptada de 3000 para 3002 para isolar os sistemas existentes. | PASSOU |
| GitHub sincronizado | Candidata local 9f69ad5 = publicação 1a7e916, mesma árvore de arquivos; sem alterações de src/execução. Fechamento documental terá nova comparação e CI próprias. | PASSOU para ajustes publicados |

## Testes, qualidade, observabilidade e segurança

Ciclo completo no clone: **2026-11-08T17:14:20.466Z a 2026-11-08T17:15:28.136Z**, UTC, equivalente a 14:14:20-14:15:28 local. Comando: `node scripts/validate-local.mjs` SEM --clean. Todos os códigos de saída desse relatório foram zero. Depois do ajuste OpenAPI, nova sequência `npm run lint && npm run typecheck && npm run build && npm run openapi:lint && npm test` foi executada em contêiner de teste no clone com a documentação candidata; qualidade-candidata.txt registra comandos e timestamps.

Resultado da candidata: **58 testes, 41 unitários e 17 de integração, 100% linhas e 96,47% branches**. Mínimos 80% e 70% mantidos, src inteiro incluído. HTTP e PostgreSQL de teste reais. Testes incluem cálculo, entradas inválidas, rollback, oito confirmações concorrentes com um 200 e sete 409, logs sem dados sensíveis e schemas OpenAPI. Sem redução de controles ou alteração dos testes.

O verificador PowerShell confirmou que repetir env:init preserva byte a byte o .env existente, que a métrica muda após consulta real e que UUID não aparece como label. Logs usam reqId/rota/status/duração. Senha aleatória do clone não foi exibida ou copiada para os dados versionados. A aplicação acadêmica é local; nenhuma produção foi declarada.

## Quatro avisos Redocly investigados

Zero erros e quatro avisos mantidos: info-license (licença não definida pelo titular), no-server-example.com (servidor local verdadeiro) e operation-4xx-response em health/metrics (sem resposta de negócio 4xx específica nessa operação). Não inventar licença, URL de produção ou endpoints/respostas para silenciar estilo. As regras recomendadas continuam ativas. O 415 da confirmação foi documentado por ter sido realmente observado, não para reduzir avisos.

## Nova medição de desempenho

Smoke no ambiente de reprodução novo: **1 VU, 30 s configurados**, pausa de 1 s, mesmo script do B. Criação/consulta/confirmação/consulta, 30 iterações e **120 chamadas HTTP**, zero falhas e 100% dos checks. São **30 amostras de criação**, não 120.

| Indicador | Valor observado |
| --- | --- |
| p50 POST /orders | 10.494341 ms |
| p95 POST /orders | 28.970620 ms |
| Máximo POST /orders | 111.244488 ms |
| Média POST /orders | 15.164396 ms |
| Throughput do fluxo | 3.881853 requisições/s |
| p99 | Não disponível no summary padrão; não foi inferido de agregados. |
| Critério | p95 criação <500 ms, zero erros HTTP e checks 100%. |
| Resultado | PASSOU, exit code 0. |

Host/versões/horários estão em validacao-local.json e arquivos de versão. Os 127,73 ms e 14,89 ms anteriores permanecem históricos. Nenhuma otimização funcional foi feita: não atribuir a variação entre execuções a ganho causado pelo código. Host compartilhado, amostra pequena e sem reserva exclusiva de recursos; sem promessa de capacidade de produção.

## Alterações descartadas e riscos

MANTER SEM ALTERAÇÃO: arquitetura de domínio único, Repository, transações, validações, confirmações concorrentes, dependências, Docker e CI. NÃO APLICÁVEL ao B: C4, 100 mil pedidos, fila/cache e k6 em três estágios. P2 descartados: refatoração estética, troca de stack, atualizações sem necessidade e infraestrutura adicional.

Riscos remanescentes: disponibilidade de internet/engine na primeira preparação, porta ocupada, permissões locais de Docker, dados perdidos se o usuário remover volume, necessidade de conferir a CI de cada futura revisão e domínio oral não comprovado. Os PDFs existentes são apoio histórico; sua atualização consolidada pertence ao checkpoint de fechamento autorizado posteriormente. O exemplo manual corrigido deve ser usado com o README atual.

## Demonstração e versão recomendada

Na pasta do B: `npm run env:init`, `docker compose up --build -d --wait`, `npm run demo`. A demonstração manual e o restart ficam no README, com JSON explícito na confirmação. `docker compose down` encerra preservando dados.

Para a entrega final do B, preferir a revisão publicada com a correção PowerShell e a CI do SHA final conferida no certificado de fechamento entregue ao aluno. O GitHub já contém a correção. As versões anteriores continuam preservadas no histórico. O commit de fechamento documental exige sua própria CI; envio ao Moodle continua humano e sem comprovante.

Próximo gate de implementação, após fechamento do B: `APROVO O HARDENING DO B; INICIAR O A`. Este relatório não autoriza o A. A publicação deste hardening foi especificamente autorizada; isso não autoriza avançar para o A nem enviar ao Moodle.

Evidências: [índice](docs/evidencias/hardening-b-20261108/LEIA-ME.md), [resumo](docs/evidencias/hardening-b-20261108/resumo.json), [PowerShell corrigido](docs/evidencias/hardening-b-20261108/readme-powershell.json), [falha 415 preservada](docs/evidencias/hardening-b-20261108/readme-powershell-falha-415.json), [persistência e encerramento](docs/evidencias/hardening-b-20261108/persistencia-encerramento.json).
