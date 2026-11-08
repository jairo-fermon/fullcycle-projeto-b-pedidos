# ADR 0001 - Separar pedidos da persistência com Repository e SQL explícito

Status: adotada na implementação; gate humano aprovado; domínio oral ainda depende de ensaio.
Data: 08/11/2026.

## Contexto

Uma API de pedidos precisa calcular totais, persistir itens e confirmar uma única vez. O projeto é pequeno, de um único domínio, e deve ser explicado por um aluno iniciante. São necessários testes unitários do negócio e uma integração real com PostgreSQL. Misturar SQL, HTTP e regra na mesma função dificulta testar essas partes e explicar falhas.

## Decisão

Manter `OrderService` dependente da interface `OrderRepository`, injetada em `buildApp`. Usar `PostgresOrderRepository` como implementação concreta por meio de `pg`, SQL parametrizado e transação para criar pedido/itens. A confirmação usa UPDATE condicional no banco; a validação do serviço sozinha não resolveria concorrência.

Migrations SQL pequenas são aplicadas antes de aceitar HTTP, com transação, lock de execução e checksum. Valores monetários são inteiros em centavos; o total tem limite de negócio e conversão segura do BIGINT.

## Alternativa descartada

Executar SQL diretamente nos handlers HTTP. Seria plausível para três endpoints e inicialmente reduziria arquivos. Foi descartada porque faria as regras dependerem do transporte e do driver, exigindo banco até para testar cálculo e transição. Não foi descartada por ser sempre errada; neste trabalho a separação ajuda testar e demonstrar SOLID.

## Motivação e consequências

- Inversão de dependência: serviço importa interface, não `pg`; persistência real é escolhida na montagem.
- Responsabilidade única: domínio valida/calcula; serviço coordena; repositório guarda/consulta; rota traduz HTTP.
- Repository é o padrão aplicado. Não atribuir o pattern ao simples uso de biblioteca ou banco.
- Custo: uma interface e uma implementação adicionais; pequenas consultas SQL precisam ser mantidas e testadas.
- Dois SELECTs para carregar pedido/itens são suficientes para o escopo, sem promessa de otimização para grande volume.
- Testes unitários usam doubles somente em `tests/`; a integração usa app HTTP e PostgreSQL reais. Isso não substitui o banco em produção.
- Não introduzir módulos de negócio, cache, fila ou microsserviços no B.

## Como verificar

1. Conferir imports de `src/application/order-service.ts` e interface `order-repository.ts`.
2. Conferir BEGIN/COMMIT/ROLLBACK e UPDATE com status em `src/infrastructure/postgres-order-repository.ts`.
3. Rodar `npm run test:unit` e a integração do Compose indicada no README.
4. Teste de rollback força restrição real do PostgreSQL; teste concorrente exige exatamente um HTTP 200 e sete HTTP 409.
