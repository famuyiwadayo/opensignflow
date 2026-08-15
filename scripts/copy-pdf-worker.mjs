import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const candidates = [
  'apps/web/node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
  'apps/web/node_modules/pdfjs-dist/build/pdf.worker.mjs',
  'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
  'node_modules/pdfjs-dist/build/pdf.worker.mjs',
].map((path) => resolve(path));

const source = candidates.find(existsSync);

if (!source) {
  throw new Error(`PDF.js worker was not found. Checked:\n${candidates.join('\n')}`);
}

const destination = resolve('src/public/pdf.worker.min.mjs');
mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log(`Copied PDF.js worker from ${source} to ${destination}`);
