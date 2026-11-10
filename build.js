// Monta src/content.html (prévia) e index.html (site) a partir de src/template.html + data/default.json.
const fs = require('fs');
const path = require('path');
const R = p => path.join(__dirname, p);
const tpl = fs.readFileSync(R('src/template.html'), 'utf8');
const data = JSON.parse(fs.readFileSync(R('data/default.json'), 'utf8'));
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// mesmo HTML que o cartão gerado no navegador (sem preço: "Consulte o preço")
const card = p => { const v = p.variants[0], link = `#${esc(p.id)}`; return `<article class="prod" data-card="${esc(p.id)}" style="--v:${esc(p.color || v.color)}">
      <a class="pack" href="${link}" aria-label="Conhecer ${esc(p.name)}"><img src="${esc(v.image)}" alt="Embalagem FELUX ${esc(p.name)}" width="675" height="900"></a>
      <div class="prod-body">
        <h3><a href="${link}">${esc(p.name)}</a></h3>
        <ul class="feats">${p.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
        <div class="price"><span class="ask">Consulte o preço</span></div>
        <div class="actions"><a class="btn btn-ghost" href="${link}">Quero conhecer</a><a class="btn btn-gold btn-white js-wa" href="#comprar">Comprar</a></div>
        <p class="net"><b>${esc(p.weight)}</b> | peso líquido</p>
      </div>
    </article>`; };

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
<meta name="description" content="FELUX: areia higiênica feita de planta, sem mineral. Grãos finos, médios ou mistos.">
<meta name="theme-color" content="#3B193A">
<link rel="canonical" href="https://feluxpet.com.br/">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:url" content="https://feluxpet.com.br/">
<meta property="og:title" content="FELUX | Areia feita de planta">
<meta property="og:description" content="Areia feita de planta: Grãos finos, médios e mistos. Sem mineral, 100% de origem vegetal.">
<link rel="icon" href="assets/felux-favicon.svg" type="image/svg+xml">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: 'FELUX', url: 'https://feluxpet.com.br/', description: 'Areia higiênica feita de planta para gatos.' })}</script>
<style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
`;
const site = page.replace('<title>FELUX Areia Biodegradável</title>', '<title>FELUX | Areia feita de planta</title>')
                 .replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n/, '')
                 .replace('<!-- body -->', '</head>\n<body>');
fs.writeFileSync(R('index.html'), head + site + '</body>\n</html>\n');
console.log('ok: src/content.html e index.html');
