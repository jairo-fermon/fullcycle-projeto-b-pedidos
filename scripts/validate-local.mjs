import { spawnSync } from 'node:child_process';
import { cpus, totalmem, platform, release } from 'node:os';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const evidence = new URL('../docs/evidencias/', import.meta.url);
mkdirSync(evidence, { recursive: true });
const report = {
  startedAt: new Date().toISOString(), timeZone: 'America/Sao_Paulo',
  host: { platform: platform(), release: release(), cpu: cpus()[0]?.model, logicalCpus: cpus().length, memoryBytes: totalmem(), node: process.version },
  sourceCommit: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
  cleanDatabaseRequested: process.argv.includes('--clean'), checks: []
};
function run(name, command, args) {
  console.log(`[${new Date().toISOString()}] ${name}`);
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 600000, maxBuffer: 20 * 1024 * 1024 });
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  writeFileSync(new URL(`${name}.txt`, evidence), `startedAt=${startedAt}\ncommand=${JSON.stringify([command, ...args])}\n${output}\nexitCode=${result.status}\n`);
  report.checks.push({ name, startedAt, finishedAt: new Date().toISOString(), command: [command, ...args], exitCode: result.status,
    status: result.status === 0 ? 'PASSOU' : 'FALHOU' });
  if (result.status !== 0) throw new Error(`${name} falhou; consulte docs/evidencias/${name}.txt`);
  console.log(`${name}: PASSOU`);
  return output;
}
const compose = (name, args) => run(name, 'docker', ['compose', ...args]);
const requireThat = (condition, message) => { if (!condition) throw new Error(message); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

try {
  run('ambiente-local', process.execPath, ['scripts/init-env.mjs']);
  run('docker-versao', 'docker', ['version', '--format', '{{.Client.Version}} / {{.Server.Version}}']);
  compose('compose-versao', ['version']);
  compose('compose-config', ['config', '--quiet']);
  if (report.cleanDatabaseRequested) {
    // Somente projeto nomeado no compose desta raiz. --clean apaga dados locais do B.
    compose('limpeza', ['--profile', 'test', '--profile', 'tools', 'down', '--volumes', '--remove-orphans']);
  }
  compose('subida-limpa', ['up', '--build', '-d', '--wait']);
  compose('qualidade', ['--profile', 'test', 'run', '--build', '--rm', 'tests', 'sh', '-c',
    'npm run lint && npm run typecheck && npm run build && npm run openapi:lint && npm test']);
  copyFileSync(new URL('../coverage/report/coverage-summary.json', import.meta.url), new URL('coverage-summary.json', evidence));
  const coverage = JSON.parse(readFileSync(new URL('coverage-summary.json', evidence), 'utf8')).total;
  requireThat(coverage.lines.pct >= 80 && coverage.branches.pct >= 70, 'Cobertura abaixo do patamar declarado.');
  report.coverage = { lines: coverage.lines.pct, branches: coverage.branches.pct, statements: coverage.statements.pct, functions: coverage.functions.pct };
  const demo = run('demonstracao', process.execPath, ['--env-file=.env', 'scripts/demo.mjs']);
  const last = demo.trim().split('\n').map(line => { try { return JSON.parse(line); } catch { return null; } }).findLast(item => item?.result === 'PASSOU');
  requireThat(last?.orderId, 'Demonstração não retornou identificador persistido.');
  // Lê somente a porta do .env; nunca imprime seu conteúdo/segredo.
  const port = readFileSync('.env', 'utf8').match(/^PORT=(\d+)$/m)?.[1] ?? '3000';
  const baseUrl = `http://127.0.0.1:${port}`;
  const before = await (await fetch(`${baseUrl}/orders/${last.orderId}`)).json();
  compose('reinicio-app', ['restart', 'app']);
  let after;
  for (let attempt = 0; attempt < 150; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/orders/${last.orderId}`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { after = await response.json(); break; }
    } catch { /* Aplicação pode estar temporariamente indisponível durante o reinício. */ }
    await sleep(200);
  }
  requireThat(JSON.stringify(before) === JSON.stringify(after), 'Pedido alterado/perdido após reinício.');
  requireThat(after.status === 'CONFIRMED' && after.totalCents === 3000, 'Estado persistido incorreto.');
  report.persistence = { orderId: last.orderId, status: after.status, totalCents: after.totalCents, preservedAfterRestart: true };
  writeFileSync(new URL('persistencia-reinicio.json', evidence), JSON.stringify({ before, after }, null, 2));
  compose('persistencia-sql', ['exec', '-T', 'db', 'sh', '-c',
    'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT id,status,total_cents FROM orders ORDER BY created_at DESC LIMIT 5;"']);
  const readMetric = async () => await (await fetch(`${baseUrl}/metrics`)).text();
  const metricBefore = await readMetric();
  await fetch(`${baseUrl}/orders/${last.orderId}`);
  const metricAfter = await readMetric();
  requireThat(metricBefore !== metricAfter && metricAfter.includes('route="/orders/:id",status="200"'), 'Métrica não refletiu requisição real.');
  requireThat(!metricAfter.includes(last.orderId), 'ID foi usado como label de métrica.');
  writeFileSync(new URL('metrics.prom', evidence), metricAfter);
  const log = compose('logs-json', ['logs', '--no-color', '--no-log-prefix', 'app']);
  const completed = log.trim().split('\n').map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(item => item?.msg === 'request_completed');
  requireThat(completed.some(item => item.reqId && item.method && item.route && item.status && typeof item.durationMs === 'number'), 'Campos de log ausentes.');
  compose('node-container', ['exec', '-T', 'app', 'node', '--version']);
  compose('postgres-container', ['exec', '-T', 'db', 'postgres', '--version']);
  compose('k6-versao', ['--profile', 'tools', 'run', '--rm', '--no-deps', 'k6', 'version']);
  compose('k6-terminal', ['--profile', 'tools', 'run', '--rm', 'k6']);
  const k6 = JSON.parse(readFileSync(new URL('k6-summary.json', evidence), 'utf8'));
  requireThat(k6.metrics.create_order_duration['p(95)'] < 500 && k6.metrics.http_req_failed.value === 0 && k6.metrics.checks.value === 1,
    'Resultado k6 não atende ao SLO/checks declarados.');
  report.performance = { createP95ms: k6.metrics.create_order_duration['p(95)'], createMaxMs: k6.metrics.create_order_duration.max,
    httpRequests: k6.metrics.http_reqs.count, iterations: k6.metrics.iterations.count, errorRate: k6.metrics.http_req_failed.value };
  compose('compose-status', ['ps', '--format', 'json']);
  report.status = 'PASSOU';
} catch (error) {
  report.status = 'FALHOU';
  report.failure = error.message;
  process.exitCode = 1;
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(new URL('validacao-local.json', evidence), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ status: report.status, failure: report.failure, evidence: 'docs/evidencias/validacao-local.json' }));
}
