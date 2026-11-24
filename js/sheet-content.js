/* ==========================================================================
   Garden Café · conteúdo vindo da planilha do Google
   O dono edita a planilha e o site lê as abas ao abrir a página.
   Se a planilha não carregar, o site usa o conteúdo padrão (menu-data.js
   e o HTML da página).
   ========================================================================== */

/* Link da planilha. Para trocar de planilha, cole aqui o link dela
   (a planilha precisa estar compartilhada como "Qualquer pessoa com o link: Leitor"). */
var GARDEN_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1baBXoCkya-1MZCMec2_G42kbgzMGsVDlxKAxtQQ2qRc/edit';

(function () {
  'use strict';

  var TABS = {
    menu: 'Cardápio',
    cats: 'Categorias',
    highlights: 'Destaques',
    events: 'Eventos',
    daily: 'Sugestão do dia',
    promos: 'Promoções'
  };
  var CACHE_KEY = 'garden-sheet-v3';
  var TIMEOUT = 8000;

  function sheetId(url) {
    var m = String(url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/);
    return m ? m[1] : null;
  }

  function tabUrl(id, tab) {
    return 'https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:csv&headers=1&sheet=' +
      encodeURIComponent(tab) + '&_=' + Math.floor(Date.now() / 60000); // muda a cada minuto, evita cache velho
  }

  /* ---------------------------------------------------------------- CSV */
  function parseCsv(text) {
    var rows = [], row = [], cell = '', q = false, i, c;
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
        } else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  // Lê as linhas como objetos, usando a primeira palavra do título da coluna
  // (ex.: "Imagem (link, opcional)" vira "imagem").
  function toObjects(rows) {
    if (!rows.length) return [];
    var keys = rows[0].map(function (h) {
      return norm(h).replace(/\(.*?\)/g, '').trim();
    });
    return rows.slice(1).map(function (r) {
      var o = {};
      keys.forEach(function (k, i) { o[k] = (r[i] || '').trim(); });
      return o;
    }).filter(function (o) {
      return Object.keys(o).some(function (k) { return o[k]; });
    });
  }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  }

  function pick(o, prefix) {
    for (var k in o) if (k.indexOf(prefix) === 0) return o[k];
    return '';
  }

  function visible(o) {
    var v = norm(pick(o, 'mostrar'));
    return !(v === 'nao' || v === 'n' || v === 'false' || v === '0');
  }

  function slug(s) {
    return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat';
  }

  // "25", "25,90", "R$ 25,90" → 25.9 ; texto livre → texto ; vazio → null
  function parsePrice(s) {
    s = String(s || '').trim();
    if (!s) return null;
    var clean = s.replace(/r\$\s*/i, '').replace(/\s/g, '');
    if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(clean) || /^\d+(,\d{1,2})?$/.test(clean)) {
      return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
    }
    if (/^\d+\.\d{1,2}$/.test(clean)) return parseFloat(clean);
    return s;
  }

  // "500 ml: 25 | Tiquinho: 18" → [['500 ml', 25], ['Tiquinho', 18]]
  function parseVars(s) {
    if (!s) return null;
    var out = String(s).split(/[|;]/).map(function (part) {
      var i = part.lastIndexOf(':');
      if (i < 0) return null;
      var p = parsePrice(part.slice(i + 1));
      return typeof p === 'number' ? [part.slice(0, i).trim(), p] : null;
    }).filter(Boolean);
    return out.length ? out : null;
  }

  // "28/11/2026", "28/11/26", "2026-11-28" → "2026-11-28"
  function parseDate(s) {
    s = String(s || '').trim();
    var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
    m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
    if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad(m[2]) + '-' + pad(m[1]);
    return null;
  }
  function pad(n) { return ('0' + n).slice(-2); }

  /* ------------------------------------------------------------ Conversão */

  // Foto de cada prato: vem SÓ da coluna Imagem da aba Cardápio (inclusive de
  // linhas escondidas com "Mostrar no site = NÃO"). Os outros lugares do site
  // (destaques, categorias, sugestão do dia, abertura) apontam para o prato
  // pelo nome e usam essa mesma foto.
  function dishPhotos(itemRows) {
    var photos = {};
    itemRows.forEach(function (r) {
      var k = norm(r.nome), img = pick(r, 'imagem');
      if (k && img && !photos[k]) photos[k] = img;
    });
    return photos;
  }

  // Valor de uma coluna de foto fora do Cardápio: nome de prato, nome de
  // categoria, ou link/arquivo de imagem. Nome que não existe = vazio.
  function looksLikeImage(v) {
    return /^https?:\/\//i.test(v) || /\.(webp|jpe?g|png|gif|avif)$/i.test(v) || /^[a-z0-9_-]+$/i.test(v);
  }
  function resolvePhoto(v, photos) {
    v = String(v || '').trim();
    if (!v) return '';
    var k = norm(v);
    if (photos[k]) return photos[k];
    return looksLikeImage(v) && v.indexOf(' ') < 0 ? v : '';
  }

  function buildMenu(itemRows, catRows, photos) {
    var cats = [], byName = {};
    var catInfo = {}, groupNotes = {};
    catRows.forEach(function (r) {
      var c = norm(r.categoria), g = norm(pick(r, 'grupo'));
      if (!c) return;
      if (g) groupNotes[c + '|' + g] = pick(r, 'observ');
      else catInfo[c] = { note: pick(r, 'observ'), img: pick(r, 'foto'), cap: pick(r, 'legenda') };
    });

    itemRows.forEach(function (r) {
      var cname = r.categoria, name = r.nome;
      if (!cname || !name || !visible(r)) return;
      var key = norm(cname);
      var cat = byName[key];
      if (!cat) {
        var info = catInfo[key] || {};
        cat = byName[key] = { id: slug(cname), key: key, label: cname, img: info.img || '', cap: info.cap || '', note: info.note || '', _groups: [], _gmap: {} };
        cats.push(cat);
      }
      var gname = pick(r, 'grupo');
      var gkey = norm(gname);
      var group = cat._gmap[gkey];
      if (!group) {
        group = cat._gmap[gkey] = { t: gname, note: groupNotes[key + '|' + gkey] || '', items: [] };
        cat._groups.push(group);
      }
      var item = { n: name, d: pick(r, 'descri') };
      var p = parsePrice(pick(r, 'preco'));
      if (p !== null) item.p = p;
      var v = parseVars(pick(r, 'variac'));
      if (v) item.v = v;
      var b = pick(r, 'selo');
      if (b) item.b = b;
      var img = pick(r, 'imagem');
      if (img) item.img = img;
      group.items.push(item);
    });

    // Foto da categoria: a coluna Foto da aba Categorias é opcional (nome de
    // prato, nome de outra categoria ou link). Vazia = foto do primeiro prato
    // da categoria que tenha foto.
    var out = cats.map(function (c) {
      var o = { id: c.id, label: c.label, img: '', cap: c.cap };
      if (c.note) o.note = c.note;
      var hasGroups = c._groups.some(function (g) { return g.t; });
      if (hasGroups) o.groups = c._groups.map(function (g) { return { t: g.t || 'Outros', note: g.note || undefined, items: g.items }; });
      else o.items = c._groups[0].items;
      var all = o.items || [].concat.apply([], o.groups.map(function (g) { return g.items; }));
      var first = all.filter(function (i) { return i.img; })[0];
      var k = norm(c.img);
      var isRef = !!(c.img && !photos[k] && byName[k] && k !== c.key);
      if (c.img && photos[k]) { o.img = photos[k]; if (!o.cap) o.cap = c.img; }
      else if (c.img && !byName[k]) o.img = resolvePhoto(c.img, photos);
      if (!o.img && first && !isRef) { o.img = first.img; if (!o.cap) o.cap = first.n; }
      o._ref = isRef ? k : '';
      return o;
    });
    // Categoria que aponta para outra categoria (ex.: Cafés → Croissants)
    var catImg = {};
    out.forEach(function (o) { if (o.img) catImg[norm(o.label)] = o.img; });
    out.forEach(function (o) {
      if (o._ref) o.img = catImg[o._ref] || '';
      delete o._ref;
      if (!o.img) o.img = 'fachada';
      if (!o.cap) o.cap = o.label;
      catImg[norm(o.label)] = o.img;
    });
    return {
      menu: out.filter(function (c) { return (c.items && c.items.length) || (c.groups && c.groups.length); }),
      catImg: catImg
    };
  }

  // Procura o prato pelo nome na aba Cardápio (sem ligar para acento/maiúscula)
  function findDish(menu, name) {
    var k = norm(name), hit = null;
    if (!k) return null;
    menu.some(function (c) {
      var all = c.items || [].concat.apply([], c.groups.map(function (g) { return g.items; }));
      hit = all.filter(function (i) { return norm(i.n) === k; })[0] || null;
      return !!hit;
    });
    return hit;
  }

  function build(raw) {
    var content = {};
    var items = raw.menu ? toObjects(raw.menu) : [];
    var photos = dishPhotos(items);
    var catImg = {};
    var menu = [];
    if (raw.menu) {
      var m = buildMenu(items, raw.cats ? toObjects(raw.cats) : [], photos);
      menu = m.menu; catImg = m.catImg;
      if (menu.length) content.menu = menu;
    }
    // Mapa nome → foto que o site usa em todos os lugares (pratos primeiro,
    // depois categorias). Também serve para as fotos fixas da abertura.
    var all = {};
    Object.keys(catImg).forEach(function (k) { all[k] = catImg[k]; });
    Object.keys(photos).forEach(function (k) { all[k] = photos[k]; });
    content.photos = all;

    // Foto de um destaque ou sugestão: 1) a do prato com o mesmo nome no
    // Cardápio; 2) a coluna Foto (nome de prato/categoria ou link).
    function photoFor(name, col) {
      return all[norm(name)] || resolvePhoto(col, all);
    }

    if (raw.highlights) {
      var hl = toObjects(raw.highlights).filter(function (r) { return r.nome && visible(r); }).map(function (r) {
        var dish = findDish(menu, r.nome) || {};
        var short = pick(r, 'descricao curta'), full = pick(r, 'descricao completa');
        var price = parsePrice(pick(r, 'preco'));
        return {
          name: r.nome,
          short: short || dish.d || '',
          desc: full || short || dish.d || '',
          price: price !== null ? price : (dish.p !== undefined ? dish.p : null),
          img: photoFor(r.nome, pick(r, 'foto') || pick(r, 'imagem'))
        };
      });
      if (hl.length) content.highlights = hl;
    }
    if (raw.events) {
      content.events = toObjects(raw.events).filter(function (r) { return pick(r, 'titulo') && visible(r); }).map(function (r) {
        return { title: pick(r, 'titulo'), type: pick(r, 'tipo'), date: parseDate(pick(r, 'data')), time: pick(r, 'horario'), desc: pick(r, 'descri'), price: parsePrice(pick(r, 'preco')), img: pick(r, 'imagem') };
      });
    }
    if (raw.daily) {
      content.daily = toObjects(raw.daily).filter(function (r) { return pick(r, 'nome') && visible(r); }).map(function (r) {
        var name = pick(r, 'nome');
        return { name: name, desc: pick(r, 'descri'), price: parsePrice(pick(r, 'preco')), img: photoFor(name, pick(r, 'foto') || pick(r, 'imagem')), date: parseDate(pick(r, 'data')) };
      });
    }
    if (raw.promos) {
      content.promos = {};
      toObjects(raw.promos).forEach(function (r) {
        var k = norm(pick(r, 'promoc'));
        if (k) content.promos[k] = { text: r.texto, show: visible(r) };
      });
    }
    return content;
  }

  /* -------------------------------------------------------------- Rede */
  function fetchTab(id, tab) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT);
    return fetch(tabUrl(id, tab), { signal: ctrl ? ctrl.signal : undefined, credentials: 'omit' })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (txt) {
        // Aba inexistente ou planilha privada devolvem HTML em vez de CSV
        if (/^\s*</.test(txt)) throw new Error('não é CSV');
        return parseCsv(txt);
      })
      .catch(function () { clearTimeout(timer); return null; });
  }

  function fetchAll() {
    var id = sheetId(GARDEN_SHEET_URL);
    if (!id || !window.fetch) return Promise.resolve(null);
    var keys = Object.keys(TABS);
    return Promise.all(keys.map(function (k) { return fetchTab(id, TABS[k]); })).then(function (results) {
      var raw = {}, any = false;
      keys.forEach(function (k, i) { if (results[i]) { raw[k] = results[i]; any = true; } });
      if (!any) return null;
      var content = build(raw);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), c: content })); } catch (e) {}
      return content;
    });
  }

  function cached() {
    try {
      var o = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return o && o.c ? o.c : null;
    } catch (e) { return null; }
  }

  /* --------------------------------------------------- Links de imagem */
  // Aceita: nome de arquivo da pasta assets/img ("cuscuz-doce"), link do
  // Google Drive (convertido para link direto) ou qualquer link de imagem.
  // Fotos do Drive: o Google devolve o arquivo original (muitas vezes PNG de
  // ~1 MB). O sufixo "-rj-l80" pede JPEG com qualidade 80 (~85 KB em 720 px).
  // As larguras são arredondadas para poucos tamanhos, assim a mesma foto
  // usada em lugares diferentes do site vem do cache do navegador.
  var DRIVE_WIDTHS = [160, 360, 720, 1080];
  function driveId(src) {
    var m = src.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=|thumbnail\?id=)([a-zA-Z0-9_-]{10,})/) ||
      src.match(/docs\.google\.com\/uc\?(?:export=\w+&)?id=([a-zA-Z0-9_-]{10,})/);
    return m ? m[1] : null;
  }
  function driveUrl(id, width) {
    var w = DRIVE_WIDTHS[DRIVE_WIDTHS.length - 1];
    for (var i = 0; i < DRIVE_WIDTHS.length; i++) if ((width || 720) <= DRIVE_WIDTHS[i]) { w = DRIVE_WIDTHS[i]; break; }
    return 'https://lh3.googleusercontent.com/d/' + id + '=w' + w + '-rj-l80';
  }

  function imageUrl(src, width) {
    src = String(src || '').trim();
    if (!src) return '';
    var id = driveId(src);
    if (id) return driveUrl(id, width);
    if (/^https?:\/\//i.test(src)) return src;
    if (/\.(webp|jpe?g|png|gif|avif)$/i.test(src)) return src.indexOf('/') >= 0 ? src : 'assets/img/' + src;
    return 'assets/img/' + src + '.webp';
  }

  // srcset para fotos do Drive (o Google redimensiona); vazio para as outras
  function imageSrcset(src) {
    var id = driveId(String(src || '').trim());
    if (!id) return '';
    return [360, 720, 1080].map(function (w) { return driveUrl(id, w) + ' ' + w + 'w'; }).join(', ');
  }

  window.GardenSheet = {
    url: GARDEN_SHEET_URL,
    cached: cached,
    fetch: fetchAll,
    imageUrl: imageUrl,
    imageSrcset: imageSrcset,
    _parseCsv: parseCsv,
    _build: build,
    norm: norm
  };
})();
