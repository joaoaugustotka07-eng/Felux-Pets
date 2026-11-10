// Servidor do site FELUX (sem dependências).
// - Serve o site e as imagens.
// - /admin: painel para editar produtos, preços, descontos e informações da loja.
// - Os dados ficam em DATA_DIR (no Railway, monte um Volume em /data).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/data') ? '/data' : path.join(ROOT, 'data', 'local'));
const DATA_FILE = path.join(DATA_DIR, 'site.json');
const UPLOADS = path.join(DATA_DIR, 'uploads');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('felux:' + ADMIN_PASSWORD).digest('hex');
const SESSION_HOURS = 12;

fs.mkdirSync(UPLOADS, { recursive: true });

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'
};
const PUBLIC = new Set(['index.html', 'robots.txt', 'sitemap.xml']);

// ---------- dados ----------
const DEFAULTS = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'default.json'), 'utf8'));
function readData() {
  let d; try { d = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return DEFAULTS(); }
  // dados salvos antes das páginas de produto: completa com os textos padrão
  const def = DEFAULTS(), byId = Object.fromEntries(def.products.map(p => [p.id, p]));
  if (!d.products.some(p => Array.isArray(p.variants))) {
    // formato antigo (Milho, Mista, Mandioca como produtos): vira Finos/Mistos/Grossos com versões,
    // levando preço, promoção, link e estoque de cada matéria-prima para as três granulações
    const old = Object.fromEntries(d.products.map(p => [p.id, p]));
    d.products = def.products.map(p => ({ ...p, variants: p.variants.map(v => {
      const o = old[v.id]; return o ? { ...v, price: o.price ?? null, salePrice: o.salePrice ?? null, buyUrl: o.buyUrl || '', inStock: o.inStock !== false } : v;
    }) }));
  }
  // Grãos Grossos virou Grãos Médios (embalagens novas): leva preços, links, estoque e fotos extras
  const gi = d.products.findIndex(p => p.id === 'grossos');
  if (gi >= 0 && !d.products.some(p => p.id === 'medios') && byId.medios) {
    const old = d.products[gi], m = JSON.parse(JSON.stringify(byId.medios));
    m.badge = old.badge || ''; m.active = old.active !== false;
    m.variants.forEach(v => { const o = (old.variants || []).find(x => x.id === v.id); if (o) Object.assign(v, { price: o.price ?? null, salePrice: o.salePrice ?? null, buyUrl: o.buyUrl || '', inStock: o.inStock !== false, gallery: o.gallery || [] }); });
    d.products[gi] = m;
    const order = def.products.map(p => p.id); d.products.sort((a, b) => (order.indexOf(a.id) + 1 || 99) - (order.indexOf(b.id) + 1 || 99));
  }
  d.products.forEach(p => {
    const dp = byId[p.id];
    if (!p.color && dp) p.color = dp.color;
    // embalagens geradas antigas viram as fotos oficiais
    const OLDV = { '#1F3F86': 'milho', '#8E3B22': 'mandioca', '#2B6144': 'mista' }; // cores antigas das versões
    (p.variants || []).forEach(v => { if (OLDV[(v.color || '').toUpperCase()] === v.id && dp) { const dv = dp.variants.find(x => x.id === v.id); if (dv) v.color = dv.color; } });
    (p.variants || []).forEach(v => { const m = /^assets\/packs\/felux-(finos|mistos|grossos)-[a-z]+\.webp$/.exec(v.image || ''); if (m) v.image = `assets/packs/felux-${m[1] === 'grossos' ? 'medios' : m[1]}.webp`; });
  });
  d.products.forEach(p => { if (!p.page) p.page = (byId[p.id] && byId[p.id].page) || null; });
  // versões salvas antes das fotos extras recebem as fotos padrão (ex.: foto real do grão)
  d.products.forEach(p => (p.variants || []).forEach(v => { if (!Array.isArray(v.gallery)) v.gallery = []; }));
  // fotos padrão novas entram uma vez nos dados salvos; se forem removidas no painel, não voltam
  const applied = new Set(d.appliedDefaults || []);
  def.products.forEach(dp => (dp.variants || []).forEach(dv => (dv.gallery || []).forEach(g => {
    const key = `${dp.id}/${dv.id}/${g}`; if (applied.has(key)) return;
    const sp = d.products.find(x => x.id === dp.id), sv = sp && (sp.variants || []).find(x => x.id === dv.id);
    if (sv && !sv.gallery.includes(g)) sv.gallery.push(g);
    applied.add(key);
  })));
  d.appliedDefaults = [...applied];
  // textos e imagens padrão antigos (nunca editados no painel) viram os novos; a dica do tapete sai
  let up = {}; try { up = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'updates.json'), 'utf8')); } catch {}
  const T = up.text || {}, I = up.img || {}, fix = v => (typeof v === 'string' && T[v]) || v;
  d.products.forEach(p => {
    p.bullets = (p.bullets || []).map(fix);
    const pg = p.page; if (!pg) return;
    pg.chip = fix(pg.chip); pg.description = fix(pg.description);
    if (/tapete anti-rastro/i.test(pg.tip || '')) pg.tip = '';
    (pg.sections || []).forEach(x => { x.title = fix(x.title); x.text = fix(x.text); if (I[x.image]) [x.image, x.round] = I[x.image]; });
  });
  // imagem gerada antiga do bloco dos Grãos Mistos vira a foto real, se ninguém trocou
  d.products.forEach(p => ((p.page && p.page.sections) || []).forEach(s => { if (s.image === 'assets/scenes/torrao-mistos.webp') s.image = 'assets/photos/mistos-milho-grao-wide.webp'; }));
  if (!d.settings.cycle) d.settings.cycle = def.settings.cycle;
  return d;
}
function writeData(data) {
  if (fs.existsSync(DATA_FILE)) fs.copyFileSync(DATA_FILE, DATA_FILE + '.bak');
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}
const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const money = v => { if (v === '' || v === null || v === undefined) return null; const n = Math.round(Number(String(v).replace(',', '.')) * 100) / 100; return Number.isFinite(n) && n >= 0 && n < 100000 ? n : null; };
const url = v => { const s = str(v, 500); return /^(https?:\/\/|#|\/|assets\/|uploads\/)/i.test(s) || s === '' ? s : ''; };
const color = v => (/^#[0-9a-f]{6}$/i.test(v) ? v : '#242424');
function cleanPage(pg) {
  pg = pg && typeof pg === 'object' ? pg : {};
  return {
    chip: str(pg.chip, 40), statement: str(pg.statement, 160), description: str(pg.description, 800),
    sections: (Array.isArray(pg.sections) ? pg.sections : []).slice(0, 8).map(x => ({ title: str(x.title, 120), text: str(x.text, 800), image: url(x.image), round: !!x.round })).filter(x => x.title || x.text),
    tip: str(pg.tip, 300), quote: str(pg.quote, 400),
    specs: (Array.isArray(pg.specs) ? pg.specs : []).slice(0, 16).map(x => ({ label: str(x.label, 40), value: str(x.value, 120) })).filter(x => x.label && x.value)
  };
}
function clean(input) {
  const s = input.settings || {};
  const products = (Array.isArray(input.products) ? input.products : []).slice(0, 40).map((p, i) => {
    let id = str(p.id, 40).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '') || 'produto-' + (i + 1);
    const vseen = new Set();
    const variants = (Array.isArray(p.variants) ? p.variants : []).slice(0, 12).map((v, j) => {
      let vid = str(v.id, 30).toLowerCase().replace(/[^a-z0-9]/g, '') || 'v' + (j + 1);
      while (vseen.has(vid)) vid += '2'; vseen.add(vid);
      let price = money(v.price), salePrice = money(v.salePrice);
      if (salePrice !== null && (price === null || salePrice >= price)) salePrice = null; // promoção só se for menor que o preço
      return { id: vid, label: str(v.label, 40) || 'Versão', color: color(v.color), image: url(v.image), composition: str(v.composition, 80),
               price, salePrice, buyUrl: url(v.buyUrl), inStock: v.inStock !== false,
               gallery: (Array.isArray(v.gallery) ? v.gallery : []).map(url).filter(Boolean).slice(0, 8) };
    });
    return {
      id, name: str(p.name, 80) || 'Produto', tag: str(p.tag, 80), color: color(p.color), weight: str(p.weight, 20),
      bullets: (Array.isArray(p.bullets) ? p.bullets : []).map(b => str(b, 160)).filter(Boolean).slice(0, 6),
      badge: str(p.badge, 30), active: p.active !== false, variants, page: cleanPage(p.page)
    };
  });
  const seen = new Set(); products.forEach(p => { while (seen.has(p.id)) p.id += '-2'; seen.add(p.id); });
  return {
    appliedDefaults: (Array.isArray(input.appliedDefaults) ? input.appliedDefaults : []).filter(x => typeof x === 'string').slice(0, 200),
    settings: {
      whatsapp: str(s.whatsapp, 20).replace(/\D/g, ''),
      whatsappMessage: str(s.whatsappMessage, 200),
      instagram: str(s.instagram, 60),
      cnpj: str(s.cnpj, 30),
      announcement: { active: !!(s.announcement && s.announcement.active), text: str(s.announcement && s.announcement.text, 140), link: url(s.announcement && s.announcement.link) },
      stores: (Array.isArray(s.stores) ? s.stores : []).slice(0, 8).map(x => ({ name: str(x.name, 40), url: url(x.url) })).filter(x => x.name),
      cycle: { title: str(s.cycle && s.cycle.title, 80), text: str(s.cycle && s.cycle.text, 1500) },
      coupons: (Array.isArray(s.coupons) ? s.coupons : []).slice(0, 10).map(c => ({ code: str(c.code, 30).toUpperCase(), text: str(c.text, 100), active: !!c.active })).filter(c => c.code)
    },
    products
  };
}
function publicData() {
  const d = readData();
  return { settings: d.settings, products: d.products.filter(p => p.active) };
}

// ---------- sessão ----------
const sign = v => crypto.createHmac('sha256', SECRET).update(v).digest('hex');
function makeSession() { const exp = Date.now() + SESSION_HOURS * 3600e3; const v = 'admin.' + exp; return v + '.' + sign(v); }
function isAdmin(req) {
  const m = /(?:^|;\s*)felux_admin=([^;]+)/.exec(req.headers.cookie || ''); if (!m || !ADMIN_PASSWORD) return false;
  const [who, exp, sig] = decodeURIComponent(m[1]).split('.');
  const expect = sign(who + '.' + exp);
  return who === 'admin' && Number(exp) > Date.now() && sig && sig.length === expect.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect));
}
const attempts = new Map(); // limite de tentativas de login por IP
function tooMany(ip) {
  const now = Date.now(), a = (attempts.get(ip) || []).filter(t => now - t < 15 * 60e3);
  attempts.set(ip, a); return a.length >= 8;
}

// ---------- utilidades HTTP ----------
function send(res, code, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  res.writeHead(code, { 'Content-Type': isObj ? TYPES['.json'] : 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(isObj ? JSON.stringify(body) : body);
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too_big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new Error('bad_json')); } });
    req.on('error', reject);
  });
}
function serveFile(res, file, cache) {
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Página não encontrada');
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  });
}

// ---------- rotas ----------
async function api(req, res, route) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const json = /application\/json/.test(req.headers['content-type'] || '');
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';

  if (route === 'site' && req.method === 'GET') return send(res, 200, publicData(), { 'Cache-Control': 'no-cache' });

  if (route === 'admin/login' && req.method === 'POST') {
    if (!ADMIN_PASSWORD) return send(res, 503, { error: 'Painel desativado. Defina a variável ADMIN_PASSWORD no Railway.' });
    if (!json) return send(res, 415, { error: 'Formato inválido' });
    if (tooMany(ip)) return send(res, 429, { error: 'Muitas tentativas. Espere 15 minutos.' });
    const body = await readBody(req, 4e3).catch(() => ({}));
    const a = Buffer.from(String(body.password || '')), b = Buffer.from(ADMIN_PASSWORD);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { attempts.get(ip).push(Date.now()); return send(res, 401, { error: 'Senha incorreta.' }); }
    attempts.delete(ip);
    return send(res, 200, { ok: true }, { 'Set-Cookie': `felux_admin=${makeSession()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}${secure}` });
  }
  if (route === 'admin/logout' && req.method === 'POST') return send(res, 200, { ok: true }, { 'Set-Cookie': `felux_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}` });
  if (route === 'admin/me') return send(res, 200, { admin: isAdmin(req), enabled: !!ADMIN_PASSWORD });

  if (!route.startsWith('admin/')) return send(res, 404, { error: 'Rota não encontrada' });
  if (!isAdmin(req)) return send(res, 401, { error: 'Entre com a senha do painel.' });
  if (req.method !== 'GET' && !json) return send(res, 415, { error: 'Formato inválido' });

  if (route === 'admin/data' && req.method === 'GET') return send(res, 200, readData(), { 'Cache-Control': 'no-store' });
  if (route === 'admin/data' && req.method === 'PUT') {
    const body = await readBody(req, 300e3).catch(e => e);
    if (body instanceof Error) return send(res, 400, { error: 'Não foi possível ler os dados enviados.' });
    const data = clean(body); writeData(data); return send(res, 200, data);
  }
  if (route === 'admin/upload' && req.method === 'POST') {
    const body = await readBody(req, 6e6).catch(e => e);
    if (body instanceof Error) return send(res, 413, { error: 'Imagem muito grande. Envie até 4 MB.' });
    const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(body.data || ''));
    if (!m) return send(res, 400, { error: 'Use uma imagem PNG, JPG ou WEBP.' });
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 4 * 1024 * 1024) return send(res, 413, { error: 'Imagem muito grande. Envie até 4 MB.' });
    const name = Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
    fs.writeFileSync(path.join(UPLOADS, name), buf);
    return send(res, 200, { url: 'uploads/' + name });
  }
  return send(res, 404, { error: 'Rota não encontrada' });
}

http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (pathname.startsWith('/api/')) return await api(req, res, pathname.slice(5).replace(/\/+$/, ''));
    const pm = /^\/produto\/([a-z0-9-]+)\/?$/.exec(pathname); // link bonito: /produto/milho
    if (pm) { res.writeHead(302, { Location: '/#' + pm[1] }); return res.end(); }
    if (pathname === '/admin' || pathname === '/admin/') return serveFile(res, path.join(ROOT, 'admin.html'), 'no-cache');
    if (pathname.startsWith('/uploads/')) {
      const f = path.normalize(path.join(UPLOADS, pathname.slice(9)));
      if (!f.startsWith(UPLOADS + path.sep)) return send(res, 404, 'Página não encontrada');
      return serveFile(res, f, 'public, max-age=31536000, immutable');
    }
    const rel = pathname.replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(ROOT, rel));
    const allowed = file.startsWith(path.join(ROOT, 'assets') + path.sep) || PUBLIC.has(rel);
    if (!allowed) return serveFile(res, path.join(ROOT, 'index.html'), 'no-cache');
    return serveFile(res, file, path.extname(file) === '.html' ? 'no-cache' : 'public, max-age=604800');
  } catch (e) {
    console.error(e); send(res, 500, 'Erro interno');
  }
}).listen(PORT, () => console.log(`FELUX no ar na porta ${PORT} · dados em ${DATA_DIR}${ADMIN_PASSWORD ? '' : ' · painel desativado (defina ADMIN_PASSWORD)'}`));
