// Monta src/content.html (prévia) e index.html (site) a partir de src/template.html + data/default.json.
const fs = require('fs');
const path = require('path');
const R = p => path.join(__dirname, p);
const tpl = fs.readFileSync(R('src/template.html'), 'utf8');
const data = JSON.parse(fs.readFileSync(R('data/default.json'), 'utf8'));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// mesmo HTML que o cartão gerado no navegador (sem preço: "Consulte o preço")
const card = p => `<article class="prod" style="--v:${esc(p.color)}">
      <a class="pack" href="#${esc(p.id)}" aria-label="Conhecer ${esc(p.name)}">${p.image ? `<img src="${esc(p.image)}" alt="Embalagem ${esc(p.name)}" width="530" height="896">` : ''}</a>
      <div><p class="tag"><i></i>${esc(p.tag)}</p><h3><a href="#${esc(p.id)}">${esc(p.name)}</a></h3></div>
      <div class="price"><span class="ask">Consulte o preço</span></div>
      <div class="actions"><a class="btn btn-ghost" href="#${esc(p.id)}">Quero conhecer</a><a class="btn btn-gold js-wa" href="#comprar">Comprar</a></div>
      <ul>${p.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      <div class="sizes">Embalagem <span>${esc(p.weight)}</span></div>
    </article>`;

const json = JSON.stringify(data).replace(/</g, '\\u003c');
const page = tpl.replace('{{STATIC_CARDS}}', data.products.filter(p => p.active !== false).map(card).join('\n      '))
                .replace('{{DATA}}', () => json);
if (/\{\{[A-Z_]+\}\}/.test(page)) throw new Error('marcador sem preencher no template');
fs.writeFileSync(R('src/content.html'), page);

const head = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="FELUX: areia higiênica vegetal para gatos, feita de milho e mandioca. Torrão firme, baixa poeira e descarte no lixo orgânico.">
<meta name="theme-color" content="#F7F4EE">
<link rel="canonical" href="https://feluxpet.com.br/">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:url" content="https://feluxpet.com.br/">
<meta property="og:title" content="FELUX | Areia higiênica vegetal para gatos">
<meta property="og:description" content="Três versões 100% vegetais: Milho, Mista e Mandioca.">
<link rel="icon" href="assets/felux-simbolo.svg" type="image/svg+xml">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'FELUX', url: 'https://feluxpet.com.br/', description: 'Areia higiênica vegetal de milho e mandioca para gatos.' })}</script>
<style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
`;
const site = page.replace('<title>FELUX Areia Biodegradável</title>', '<title>FELUX | Areia higiênica vegetal para gatos</title>')
                 .replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n/, '')
                 .replace('<!-- body -->', '</head>\n<body>');
fs.writeFileSync(R('index.html'), head + site + '</body>\n</html>\n');
console.log('ok: src/content.html e index.html');
