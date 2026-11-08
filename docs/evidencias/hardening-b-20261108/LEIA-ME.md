# Evidências do hardening B - 08/11/2026

O clone foi obtido diretamente do GitHub no SHA público indicado em clone.json. A execução completa usou esse código, banco novo, porta 3002 e projeto Compose fullcycle-b-hardening-20261108. Nenhum volume anterior foi removido. O validador foi executado SEM --clean, contra volume novo, preservando as evidências canônicas do repositório original.

Depois da falha real de HTTP 415 no exemplo PowerShell, README e OpenAPI candidatos foram copiados para a reprodução. qualidade-candidata.txt registra nova execução de lint, tipos, build, OpenAPI e 58 testes com essa especificação, mantendo src/test/scripts/dependências. coverage-candidata.json é o resultado desse segundo controle. verificar-readme.ps1 é o verificador efetivamente executado, preservado como evidência; para executar em outro local, adaptar caminhos e confirmar que é ambiente isolado. Ele cria pedidos, reinicia app e grava relatório fora do checkout.

readme-powershell-falha-415.json preserva a falha, sem substituí-la por sucesso. readme-powershell.json registra o procedimento corrigido. persistencia-encerramento.json comprova SQL, recriação somente de app e encerramento sem remoção do volume. Nenhum controle de qualidade foi reduzido. Segredo não é impresso.

Os TXT são saídas reais com comandos e horários. Ao versionar, somente espaços finais de linhas foram removidos para evitar erros de whitespace no diff; valores, resultados e horários foram preservados. Os arquivos originais completos continuam em tmp/hardening-20261108, ignorado pelo Git. Os arquivos de evidências mais antigos na pasta superior continuam identificando suas execuções históricas.
