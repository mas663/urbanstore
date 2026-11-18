// Generate docs/PRD_UrbanStore.html dari docs/PRD_UrbanStore.md. Jalankan: npm run docs:prd
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const docs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../docs');
const md = fs.readFileSync(path.join(docs, 'PRD_UrbanStore.md'), 'utf8');
const body = marked.parse(md);

const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PRD UrbanStore</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet" />
<style>
  :root { --ink:#0a0a0a; --paper:#fff; --soft:#f4f4f1; --line:#e4e4e0; --mute:#6b6b66; --lemon:#d9f24a; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.65 Inter, system-ui, sans-serif; }
  main { max-width: 860px; margin: 0 auto; padding: 56px 16px 96px; }
  h1 { font-size: clamp(2rem, 6vw, 3.2rem); line-height: 1.05; letter-spacing: -.03em; margin: 0 0 24px; }
  h1::after { content:''; display:inline-block; width:.3em; height:.3em; background:var(--lemon); margin-left:.15em; }
  h2 { font-size: 1.5rem; letter-spacing: -.02em; margin: 56px 0 16px; padding-top: 16px; border-top: 2px solid var(--ink); }
  h3 { font-size: 1.05rem; margin: 32px 0 8px; }
  blockquote { margin: 16px 0; padding: 12px 16px; background: var(--soft); border-left: 4px solid var(--lemon); }
  blockquote p { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; display: block; overflow-x: auto; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { border-bottom: 2px solid var(--ink); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
  code { background: var(--soft); padding: 1px 6px; font-size: .9em; }
  pre { background: var(--ink); color: #f4f4f1; padding: 20px; overflow-x: auto; font-size: 13px; line-height: 1.6; }
  pre code { background: none; padding: 0; }
  hr { border: 0; border-top: 1px solid var(--line); margin: 40px 0; }
  li { margin: 4px 0; }
  a { color: inherit; }
</style>
</head>
<body><main>
${body}
</main></body>
</html>
`;
fs.writeFileSync(path.join(docs, 'PRD_UrbanStore.html'), html);
console.log('✓ docs/PRD_UrbanStore.html dibuat');
