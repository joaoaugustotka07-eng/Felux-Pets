# Site FELUX · feluxpet.com.br

Site da FELUX, areia higiênica biodegradável de milho e mandioca.

## Estrutura
- `index.html`: o site pronto (gerado a partir de `src/content.html` por `build.sh`)
- `assets/`: logo em SVG e embalagens (Milho, Mista, Mandioca)
- `server.js`: servidor estático sem dependências, usado no Railway
- `assets/source/`: arquivos de origem das embalagens e script que gera os mockups

## Publicar no Railway
**Pelo GitHub (recomendado)**
1. Suba esta pasta para um repositório no GitHub.
2. No Railway: New Project → Deploy from GitHub repo → escolha o repositório.
3. O Railway detecta o `package.json` e roda `npm start`. Não precisa configurar nada.
4. Em Settings → Networking, clique em Generate Domain para ter um endereço `*.up.railway.app`.

**Pela linha de comando**
```
npm i -g @railway/cli
railway login
railway init        # cria o projeto
railway up          # envia esta pasta
railway domain      # gera o endereço público
```

## Ligar o domínio feluxpet.com.br
1. No serviço do Railway: Settings → Networking → Custom Domain → `feluxpet.com.br` (e depois `www.feluxpet.com.br`).
2. O Railway mostra um registro CNAME (e um TXT de verificação). Crie esses registros no painel onde o domínio está registrado (Registro.br, Cloudflare etc.).
3. Para o domínio raiz (sem www) o provedor de DNS precisa aceitar CNAME flattening/ALIAS, como a Cloudflare. No Registro.br, use o DNS da Cloudflare ou aponte apenas o `www` e redirecione a raiz.
4. O certificado HTTPS é emitido automaticamente pelo Railway.

## Editar o site
Edite `src/content.html` e rode `sh build.sh` para gerar o `index.html` de novo.
