import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

try {
  writeFileSync(new URL('../.env', import.meta.url),
    `POSTGRES_USER=orders\nPOSTGRES_DB=orders\nPOSTGRES_PASSWORD=${randomBytes(24).toString('hex')}\nPORT=3000\nLOG_LEVEL=info\n`,
    { flag: 'wx', mode: 0o600 });
  console.log('.env criado com senha aleatória local; conteúdo não exibido.');
} catch (error) {
  if (error.code === 'EEXIST') console.log('.env existente preservado.');
  else throw error;
}
