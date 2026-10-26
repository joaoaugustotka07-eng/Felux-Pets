#!/bin/sh
# Gera index.html (pronto para hospedar em feluxpet.com.br) a partir de src/content.html
cd "$(dirname "$0")"
{
cat <<'HEAD'
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="FELUX: areia higiênica biodegradável para gatos, feita de milho e mandioca. Torrão firme, baixa poeira e descarte na compostagem.">
<meta name="theme-color" content="#F7F4EE">
<link rel="canonical" href="https://feluxpet.com.br/">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:url" content="https://feluxpet.com.br/">
<meta property="og:title" content="FELUX | A areia que volta pra terra">
<meta property="og:description" content="Areia higiênica biodegradável de milho e mandioca para gatos.">
<link rel="icon" href="assets/felux-simbolo.svg" type="image/svg+xml">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"FELUX","url":"https://feluxpet.com.br/","description":"Areia higiênica biodegradável de milho e mandioca para gatos."}</script>
<style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
HEAD
sed 's#<title>FELUX Areia Biodegradável</title>#<title>FELUX | Areia higiênica biodegradável para gatos</title>#' src/content.html | sed '/claude:viewport-fit-sides/d' | awk '/<header class="top">/{print "</head>\n<body>"}1'
printf '</body>\n</html>\n'
} > index.html
