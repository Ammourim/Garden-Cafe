/* ==========================================================================
   Garden Café · conteúdo vindo da planilha do Google
   O dono edita a planilha e o site lê as abas ao abrir a página.
   Se a planilha não carregar, o site usa o conteúdo padrão (menu-data.js
   e o HTML da página).
   ========================================================================== */

/* Link da planilha. Para trocar de planilha, cole aqui o link dela
   (a planilha precisa estar compartilhada como "Qualquer pessoa com o link: Leitor"). */
var GARDEN_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1eW5U0vxoKb55iv8mbDSVy7ySJPkYn2rrH31pfQhzKd8/edit';

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
  var CACHE_KEY = 'garden-sheet-v1';
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
  function buildMenu(itemRows, catRows) {
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
        cat = byName[key] = { id: slug(cname), label: cname, img: info.img || '', cap: info.cap || cname, note: info.note || '', _groups: [], _gmap: {} };
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

    return cats.map(function (c) {
      var out = { id: c.id, label: c.label, img: c.img, cap: c.cap };
      if (c.note) out.note = c.note;
      var hasGroups = c._groups.some(function (g) { return g.t; });
      if (hasGroups) out.groups = c._groups.map(function (g) { return { t: g.t || 'Outros', note: g.note || undefined, items: g.items }; });
      else out.items = c._groups[0].items;
      if (!out.img) {
        // Sem foto da categoria: usa a primeira foto de item que houver
        var all = out.items || [].concat.apply([], out.groups.map(function (g) { return g.items; }));
        var withImg = all.filter(function (i) { return i.img; })[0];
        out.img = withImg ? withImg.img : 'fachada';
      }
      return out;
    }).filter(function (c) { return (c.items && c.items.length) || (c.groups && c.groups.length); });
  }

  function build(raw) {
    var content = {};
    if (raw.menu) {
      var menu = buildMenu(toObjects(raw.menu), raw.cats ? toObjects(raw.cats) : []);
      if (menu.length) content.menu = menu;
    }
    if (raw.highlights) {
      var hl = toObjects(raw.highlights).filter(function (r) { return r.nome && visible(r); }).map(function (r) {
        return { name: r.nome, short: pick(r, 'descricao curta'), desc: pick(r, 'descricao completa') || pick(r, 'descricao curta'), price: parsePrice(pick(r, 'preco')), img: pick(r, 'imagem') };
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
        return { name: pick(r, 'nome'), desc: pick(r, 'descri'), price: parsePrice(pick(r, 'preco')), img: pick(r, 'imagem'), date: parseDate(pick(r, 'data')) };
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
  function imageUrl(src, width) {
    src = String(src || '').trim();
    if (!src) return '';
    var m = src.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=|thumbnail\?id=)([a-zA-Z0-9_-]{10,})/) ||
      src.match(/docs\.google\.com\/uc\?(?:export=\w+&)?id=([a-zA-Z0-9_-]{10,})/);
    if (m) return 'https://lh3.googleusercontent.com/d/' + m[1] + '=w' + (width || 1200);
    if (/^https?:\/\//i.test(src)) return src;
    if (/\.(webp|jpe?g|png|gif|avif)$/i.test(src)) return src.indexOf('/') >= 0 ? src : 'assets/img/' + src;
    return 'assets/img/' + src + '.webp';
  }

  window.GardenSheet = {
    url: GARDEN_SHEET_URL,
    cached: cached,
    fetch: fetchAll,
    imageUrl: imageUrl,
    _parseCsv: parseCsv,
    _build: build
  };
})();
