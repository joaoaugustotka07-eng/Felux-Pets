#!/bin/sh
# Gera index.html (site) e src/content.html (prévia) a partir de src/template.html
cd "$(dirname "$0")" && node build.js
