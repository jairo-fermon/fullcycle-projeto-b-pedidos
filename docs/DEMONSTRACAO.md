# Demonstração executável e preparação para defesa - B

Este é o roteiro técnico do gate B, não um PDF definitivo de apresentação ou ensaio cronometrado. O aluno informou apresentação em 13/11/2026.

## Preparação e execução

Abra PowerShell nesta pasta do projeto, separada dos outros trabalhos. A primeira linha do README declara inequivocamente Projeto B.

```powershell
npm run env:init
docker compose up --build -d --wait
docker compose ps
npm run demo
```

O script de demonstração faz POST/GET/confirm/GET, verifica total e status e demonstra 409 na segunda confirmação e 404 para UUID inexistente. Cada execução cria um novo pedido, imprime o ID real e encerra com PASSOU se os asserts forem cumpridos. Não reutilizar um ID de exemplo como se fosse resultado novo.

Para conferir SQL e observabilidade, executar os comandos do README. Mostrar o mesmo ID recém-criado no registro do banco, abrir `docs/openapi.yaml` e consultar `/metrics`. Os logs exibem reqId correlacionado com `x-request-id`, sem payload ou credenciais.

Para reproduzir o gate completo com banco inicialmente vazio:

```powershell
npm run validate:local -- --clean
```

**A opção --clean apaga pedidos locais deste B.** O script fixa o diretório do próprio projeto, registra início/fim, comando, exit code e resultado por etapa. Também prova que o pedido confirmado sobrevive ao reinício da aplicação e que o contador de requisições muda com chamada real.

## Resultados que já podem ser apontados

- 58 testes passaram no ciclo limpo: 41 unitários e 17 de integração.
- Cobertura de `src/`: 100% linhas, 96,47% branches, 100% funções; thresholds 80% e 70%.
- Teste concorrente exige exatamente um HTTP 200 e sete HTTP 409.
- Rollback real: restrição do banco rejeita item inválido e não sobra pedido parcial.
- Smoke final: 116 requisições, 29 iterações, zero erro; p95 POST /orders 127,73 ms, máximo 189,29 ms.
- Uma execução exploratória teve amostra máxima de 1,74 segundo; ela está registrada no relatório e não foi apagada para melhorar a narrativa.
- CI local validado. CI remoto permanece BLOQUEADO até envio autorizado e execução no GitHub; não dizer que está verde só porque existe workflow.

Fonte canônica: `docs/evidencias/validacao-local.json`; relatórios específicos de cada etapa na mesma pasta. A documentação de desempenho explica a pequena amostra e o alcance do SLO.

## Cinco arquivos/conceitos essenciais

| Arquivo | O que o aluno deve explicar com palavras próprias |
| --- | --- |
| src/domain/order.ts | A regra operacional: validar itens, calcular quantidade x preço em centavos e somar. É como conferir uma ordem de serviço antes de registrá-la. |
| src/application/order-service.ts | Coordena criar/consultar/confirmar e depende de uma interface. A regra não precisa conhecer a marca do banco; isso exemplifica inversão de dependência do SOLID. |
| src/infrastructure/postgres-order-repository.ts | É o registro durável: SQL parametrizado, transação com rollback e confirmação condicional. Repository separa acesso a dados do negócio; não é apenas um nome de pasta. |
| docker-compose.yml | Define os componentes, configurações e ordem por saúde. App, banco de demonstração e banco de teste são distintos; o banco de trabalho usa volume e o de teste tmpfs. |
| .github/workflows/ci.yml | Repetirá install, lint, tipos, build, OpenAPI e testes com banco real a cada push/PR. Uma execução local não é a execução remota; mostrar o link verde real quando existir. |

No ADR, apontar a alternativa descartada: SQL diretamente na rota era menor inicialmente, mas misturava HTTP, regra e persistência. Não afirmar que o projeto aplica todos os princípios de SOLID por ter interfaces; mostrar a dependência concreta do serviço.

## Duas perguntas para o aluno responder

1. Se duas pessoas confirmarem o mesmo pedido ao mesmo tempo, por que só uma consegue? Explique o UPDATE condicionado a PENDING e a resposta 409; somente verificar status antes de atualizar não impediria a corrida.
2. Qual a diferença entre teste aprovado, cobertura, CI verde e p95? Teste verifica um comportamento; cobertura mede código executado pelos testes; CI é a execução automática no remoto; p95 resume latências observadas naquele cenário. Nenhum isoladamente garante ausência de defeitos ou capacidade de produção.

## Plano B para falha na apresentação ao vivo

Se a aplicação não subir, mostrar `docs/evidencias/subida-limpa.txt`, `demonstracao.txt`, `persistencia-sql.txt`, `persistencia-reinicio.json`, `qualidade.txt` e `k6-terminal.txt`. Declarar que são evidências da execução em 08/11, com horário e comando, e que a execução ao vivo está falhando naquele momento. Não apresentar o arquivo como resposta nova do servidor.

Mostrar health e logs para localizar a falha; não reinicializar banco no meio da defesa sem explicar a perda dos dados de demonstração. Não usar restauração de fábrica como passo normal do projeto.

## Limites do que já foi feito

Não houve envio ao Moodle, apresentação, ensaio com o aluno, deploy em nuvem, aprovação do B ou início do A. Não há PDFs definitivos nesta etapa. As evidências permitem revisão do B; o aprendizado e a aprovação humana ainda precisam ocorrer.
