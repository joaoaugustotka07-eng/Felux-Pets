# Site FELUX · feluxpet.com.br

Site da FELUX, areia higiênica biodegradável de milho e mandioca.

## Estrutura
- `index.html`: o site pronto (gerado a partir de `src/content.html` por `build.sh`)
- `assets/`: logo em SVG e embalagens (Milho, Mista, Mandioca)
- `server.js`: servidor sem dependências (site + painel), usado no Railway
- `admin.html`: painel em `/admin` para editar produtos, preços, descontos, lojas, cupons e WhatsApp
- `data/default.json`: dados iniciais dos produtos (usados até o primeiro salvamento no painel)
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

## Painel administrativo (/admin)
Configure uma vez no Railway, no serviço do site:
1. **Variables** → crie `ADMIN_PASSWORD` com a senha do painel (use uma senha forte). Sem ela, o painel fica desativado.
2. **Volume** → clique com o botão direito no serviço → *Attach Volume* → caminho de montagem `/data`.
   Sem o volume, preços e fotos enviadas são apagados a cada novo deploy.
3. Acesse `https://SEU-SITE/admin`, entre com a senha e edite.

O que dá para fazer no painel:
- Produtos: nome, etiqueta, cor, peso, foto, benefícios, preço, preço promocional ou desconto em %, selo ("Mais vendido", "Oferta"...), link de compra, esgotado, visível ou oculto, ordem, duplicar e excluir.
- Loja: WhatsApp e mensagem inicial, Instagram, CNPJ, faixa de aviso no topo, lojas de "Onde comprar" e cupons.

Produto sem link de compra abre o WhatsApp com a mensagem "Quero comprar FELUX ...". Produto esgotado mostra "Avise-me".

## Ligar o domínio feluxpet.com.br
1. No serviço do Railway: Settings → Networking → Custom Domain → `feluxpet.com.br` (e depois `www.feluxpet.com.br`).
2. O Railway mostra um registro CNAME (e um TXT de verificação). Crie esses registros no painel onde o domínio está registrado (Registro.br, Cloudflare etc.).
3. Para o domínio raiz (sem www) o provedor de DNS precisa aceitar CNAME flattening/ALIAS, como a Cloudflare. No Registro.br, use o DNS da Cloudflare ou aponte apenas o `www` e redirecione a raiz.
4. O certificado HTTPS é emitido automaticamente pelo Railway.

## Editar o site
Edite `src/content.html` e rode `sh build.sh` para gerar o `index.html` de novo.
