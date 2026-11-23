/* ==========================================================================
   Garden Café · interações e animações
   - GSAP + ScrollTrigger para as animações de rolagem
   - Lenis para rolagem suave no desktop (no celular a rolagem é a nativa)
   - Respeita "reduzir movimento" do sistema
   ========================================================================== */
(function () {
  'use strict';

  var doc = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var INFO = window.GARDEN_INFO || {};
  var MENU = window.GARDEN_MENU || [];
  // Conteúdo da planilha do Google (js/sheet-content.js). Se houver uma cópia
  // salva da última visita, ela já entra agora; a versão nova chega depois.
  var Sheet = window.GardenSheet || null;
  var sheetContent = Sheet ? Sheet.cached() : null;
  if (sheetContent && sheetContent.menu) MENU = sheetContent.menu;
  var animReady = false;
  var reduced = doc.classList.contains('reduced');
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var EASE = 'expo.out';
  var lenis = null;

  if (!hasGsap && !reduced) doc.classList.add('no-anim');

  /* ------------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------------ */
  function headerOffset() {
    var h = parseFloat(getComputedStyle(doc).getPropertyValue('--header-h')) || 72;
    return h;
  }

  function scrollToTarget(target) {
    if (!target) return;
    var extra = 0;
    if (lenis) {
      lenis.scrollTo(target, { offset: -headerOffset() + extra, duration: 1.4 });
    } else {
      var y = target.getBoundingClientRect().top + window.pageYOffset - headerOffset() + extra;
      window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  function fmt(p) {
    if (typeof p !== 'number') return String(p);
    return 'R$ ' + (p % 1 ? p.toFixed(2) : String(p)).replace('.', ',');
  }

  function priceText(p) {
    if (p === null || p === undefined || p === '') return '';
    return typeof p === 'number' ? fmt(p) : String(p);
  }

  // Nome de arquivo da pasta assets/img, link do Google Drive ou link de imagem
  function imgUrl(src, w) {
    if (Sheet) return Sheet.imageUrl(src, w);
    return /^https?:/.test(src) ? src : 'assets/img/' + src + '.webp';
  }

  function isoDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  var MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function longDate(iso) {
    var p = iso.split('-');
    return parseInt(p[2], 10) + ' de ' + MONTHS[parseInt(p[1], 10) - 1];
  }

  function recifeNow() {
    // Horário de Recife (UTC-3, sem horário de verão)
    var now = new Date();
    return new Date(now.getTime() + now.getTimezoneOffset() * 60000 - 3 * 3600000);
  }

  /* ------------------------------------------------------------------------
     Status "aberto agora"
     ------------------------------------------------------------------------ */
  (function openStatus() {
    var n = recifeNow();
    var mins = n.getHours() * 60 + n.getMinutes();
    var open = mins >= 15 * 60 && mins < 22 * 60;
    var short = $('.js-open-status');
    var long = $('.js-open-status-long');
    if (short) {
      short.innerHTML = open
        ? '<span class="is-open-dot" aria-hidden="true"></span>Aberto agora · até 22h'
        : (mins < 15 * 60 ? 'Abre hoje às 15h · fecha às 22h' : 'Fechado agora · abre amanhã às 15h');
    }
    if (long) long.textContent = open ? 'Estamos abertos agora, até as 22h.' : 'Abrimos todos os dias às 15h, inclusive fins de semana.';
  })();

  /* ------------------------------------------------------------------------
     Evento: esconde o card depois da data e mostra o aviso de próximos eventos
     ------------------------------------------------------------------------ */
  $$('[data-until]').forEach(function (el) {
    var until = new Date(el.getAttribute('data-until') + 'T03:00:00Z');
    if (new Date() > until) {
      el.hidden = true;
      var empty = $('.event--empty');
      if (empty) empty.hidden = false;
    }
  });

  /* ------------------------------------------------------------------------
     Contagem de itens do cardápio
     ------------------------------------------------------------------------ */
  function updateCount() {
    var totalItems = 0;
    MENU.forEach(function (c) {
      if (c.items) totalItems += c.items.length;
      (c.groups || []).forEach(function (g) { totalItems += g.items.length; });
    });
    var countEl = $('.js-count-items');
    if (countEl && totalItems >= 10) {
      var rounded = Math.floor(totalItems / 10) * 10;
      countEl.textContent = rounded + '+';
      countEl.setAttribute('data-count', rounded);
    }
  }
  updateCount();

  /* ------------------------------------------------------------------------
     Cardápio: abas, filtro e troca animada
     ------------------------------------------------------------------------ */
  var tabsEl = $('.tabs');
  var listEl = $('.menu-panel__list');
  var titleEl = $('.menu-panel__title');
  var noteEl = $('.menu-panel__note');
  var cheapEl = $('.js-cheap');
  var photoImg = $('.menu-photo__frame img');
  var photoCap = $('.menu-photo__cap');
  var currentCat = MENU[0] && MENU[0].id;

  function itemMinPrice(it) {
    if (typeof it.p === 'number') return it.p;
    if (it.v) return Math.min.apply(null, it.v.map(function (x) { return x[1]; }));
    return 999;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var menuItems = [];
  var currentCatObj = null;

  function itemHtml(it) {
    var price = '';
    if (typeof it.p === 'number') price = '<span class="menu-item__price">' + fmt(it.p) + '</span>';
    else if (it.p) price = '<span class="menu-item__price">' + escapeHtml(it.p) + '</span>';
    else if (!it.v) price = '<span class="menu-item__price menu-item__price--na">consulte</span>';
    var vars = it.v ? '<div class="menu-item__vars">' + it.v.map(function (x) {
      return '<span>' + escapeHtml(x[0]) + ' <b>' + fmt(x[1]) + '</b></span>';
    }).join('') + '</div>' : '';
    var badge = it.b ? '<span class="badge badge--novidade">' + escapeHtml(it.b) + '</span>' : '';
    var desc = it.d ? '<span class="menu-item__desc">' + escapeHtml(it.d) + '</span>' : '';
    menuItems.push(it);
    var thumb = it.img ? '<span class="menu-item__thumb" aria-hidden="true"><img src="' + escapeHtml(imgUrl(it.img, 160)) + '" alt="" width="52" height="52" loading="lazy"></span>' : '';
    return '<div class="menu-item' + (it.img ? ' has-photo' : '') + '" role="button" tabindex="0" data-i="' + (menuItems.length - 1) + '" aria-label="' + escapeHtml(it.n) + ': ver foto e detalhes">' +
      thumb + '<div class="menu-item__main"><div class="menu-item__row"><span class="menu-item__name">' + escapeHtml(it.n) + '</span>' +
      badge + '<span class="menu-item__fill"></span>' + price + '</div>' + desc + vars + '</div></div>';
  }

  function renderMenu(animate) {
    var cat = MENU.filter(function (c) { return c.id === currentCat; })[0];
    if (!cat || !listEl) return;
    var cheap = cheapEl && cheapEl.checked;
    menuItems = [];
    currentCatObj = cat;
    var filter = function (items) { return cheap ? items.filter(function (i) { return itemMinPrice(i) <= 25; }) : items; };

    var html = '';
    if (cat.groups) {
      cat.groups.forEach(function (g) {
        var items = filter(g.items);
        if (!items.length) return;
        html += '<div class="menu-group"><h4 class="menu-group__title">' + escapeHtml(g.t) + '</h4>' +
          (g.note ? '<p class="menu-group__note">' + escapeHtml(g.note) + '</p>' : '') +
          items.map(itemHtml).join('') + '</div>';
      });
    } else {
      html = filter(cat.items).map(itemHtml).join('');
    }
    if (!html) html = '<p class="menu-empty">Nenhum item até R$ 25 nesta categoria.</p>';

    var swap = function () {
      titleEl.textContent = cat.label;
      noteEl.hidden = !cat.note;
      noteEl.textContent = cat.note || '';
      listEl.innerHTML = html;
      if (hasGsap && !reduced && animate) {
        gsap.fromTo(listEl.querySelectorAll('.menu-item, .menu-group__title'),
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.025, overwrite: true });
      }
      if (hasGsap) ScrollTrigger.refresh();
    };

    if (hasGsap && !reduced && animate) {
      gsap.to(listEl, {
        autoAlpha: 0, duration: 0.18, ease: 'power1.in', onComplete: function () {
          gsap.set(listEl, { autoAlpha: 1 });
          swap();
        }
      });
    } else {
      swap();
    }

    // Foto lateral (desktop): volta para a foto da categoria
    setMenuPhoto(cat.img, cat.cap, animate ? 'reveal' : null);
  }

  // Troca a foto lateral. mode: 'reveal' (troca de categoria), 'fade' (item), null (sem animação)
  var photoToken = 0;
  function setMenuPhoto(img, cap, mode) {
    if (!photoImg || !img || photoImg.getAttribute('data-src') === img) {
      if (photoCap && cap) photoCap.textContent = cap;
      return;
    }
    var src = imgUrl(img, 900);
    var token = ++photoToken;
    photoImg.setAttribute('data-src', img);
    var frame = photoImg.parentNode;
    var swap = function () {
      if (token !== photoToken) return;
      photoImg.src = src;
      if (photoCap) photoCap.textContent = cap || '';
    };
    if (!hasGsap || reduced || !mode) { swap(); return; }
    if (mode === 'reveal') {
      gsap.to(frame, {
        clipPath: 'inset(0 0 100% 0)', duration: 0.35, ease: 'power2.in', overwrite: true, onComplete: function () {
          swap();
          gsap.fromTo(frame, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.8, ease: EASE });
          gsap.fromTo(photoImg, { scale: 1.15 }, { scale: 1, duration: 1.1, ease: EASE });
        }
      });
    } else {
      // Pré-carrega para a troca não piscar
      var pre = new Image();
      pre.onload = pre.onerror = function () {
        if (token !== photoToken) return;
        gsap.to(photoImg, {
          autoAlpha: 0, duration: 0.14, ease: 'power1.in', overwrite: true, onComplete: function () {
            swap();
            gsap.fromTo(photoImg, { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.55, ease: EASE });
          }
        });
      };
      pre.src = src;
    }
  }

  function itemPhoto(it) {
    return it.img || (currentCatObj && currentCatObj.img);
  }

  function buildTabs() {
    tabsEl.innerHTML = MENU.map(function (c) {
      var on = c.id === currentCat;
      return '<button class="tab" type="button" role="tab" id="tab-' + c.id + '" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-cat="' + c.id + '">' + escapeHtml(c.label) + '</button>';
    }).join('');
  }

  if (tabsEl && MENU.length) {
    buildTabs();

    var selectTab = function (btn, focus) {
      if (!btn || btn.getAttribute('data-cat') === currentCat) return;
      $$('.tab', tabsEl).forEach(function (t) { t.setAttribute('aria-selected', 'false'); t.tabIndex = -1; });
      btn.setAttribute('aria-selected', 'true');
      btn.tabIndex = 0;
      if (focus) btn.focus();
      currentCat = btn.getAttribute('data-cat');
      // Centraliza a aba ativa na barra rolável (celular)
      var left = btn.offsetLeft - (tabsEl.clientWidth - btn.offsetWidth) / 2;
      tabsEl.scrollTo({ left: left, behavior: reduced ? 'auto' : 'smooth' });
      renderMenu(true);
      // Se a lista estiver acima da tela, volta para o início do painel
      var panel = $('.menu-panel');
      var r = panel.getBoundingClientRect();
      if (r.top < 0) {
        var y = panel.getBoundingClientRect().top + window.pageYOffset - headerOffset() - tabsEl.offsetHeight - 16;
        if (lenis) lenis.scrollTo(y, { duration: 0.9 });
        else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      }
    };

    tabsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.tab');
      if (btn) selectTab(btn);
    });
    tabsEl.addEventListener('keydown', function (e) {
      var tabs = $$('.tab', tabsEl);
      var i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); selectTab(tabs[(i + 1) % tabs.length], true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); selectTab(tabs[(i - 1 + tabs.length) % tabs.length], true); }
    });
    if (cheapEl) cheapEl.addEventListener('change', function () { renderMenu(true); });
    if (photoImg && !sheetContent) photoImg.setAttribute('data-src', MENU[0].img);
    renderMenu(false);
    var hoverTimer, leaveTimer;
    var itemFrom = function (e) {
      var el = e.target.closest && e.target.closest('.menu-item');
      return el ? menuItems[+el.getAttribute('data-i')] : null;
    };
    var previewItem = function (it) {
      clearTimeout(hoverTimer); clearTimeout(leaveTimer);
      if (!it) return;
      hoverTimer = setTimeout(function () { setMenuPhoto(itemPhoto(it), it.n, 'fade'); }, 70);
    };
    var openItem = function (it) {
      if (!it) return;
      var pr = typeof it.p === 'number' ? fmt(it.p) : (it.v ? it.v.map(function (x) { return x[0] + ' ' + fmt(x[1]); }).join(' · ') : (it.p || ''));
      openDialog({ name: it.n, desc: it.d, price: pr, img: itemPhoto(it) });
    };
    if (!isTouch) {
      listEl.addEventListener('mouseover', function (e) { var it = itemFrom(e); if (it) previewItem(it); });
      listEl.addEventListener('mouseleave', function () {
        clearTimeout(hoverTimer);
        leaveTimer = setTimeout(function () {
          if (currentCatObj) setMenuPhoto(currentCatObj.img, currentCatObj.cap, 'fade');
        }, 350);
      });
    }
    listEl.addEventListener('focusin', function (e) { var it = itemFrom(e); if (it) previewItem(it); });
    listEl.addEventListener('click', function (e) { openItem(itemFrom(e)); });
    listEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var it = itemFrom(e);
      if (it) { e.preventDefault(); openItem(it); }
    });
  }

  /* ------------------------------------------------------------------------
     Menu mobile
     ------------------------------------------------------------------------ */
  var burger = $('.burger');
  var drawer = $('.drawer');
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    document.body.classList.toggle('is-locked', open);
    if (lenis) open ? lenis.stop() : lenis.start();
    $('.header').classList.remove('is-hidden');
    document.body.classList.remove('header-hidden');
  }
  if (burger) burger.addEventListener('click', function () { setDrawer(!drawer.classList.contains('is-open')); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (drawer.classList.contains('is-open')) setDrawer(false); closeDialog(); }
  });

  /* ------------------------------------------------------------------------
     Links internos (rolagem suave) e pré-seleção do tipo de reserva
     ------------------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    var reserveType = a.getAttribute('data-reserve');
    if (reserveType) {
      var sel = $('#f-tipo');
      if (sel) sel.value = reserveType;
    }
    if (drawer && drawer.classList.contains('is-open')) {
      setDrawer(false);
      setTimeout(function () { scrollToTarget(target); }, 350);
    } else {
      scrollToTarget(target);
    }
    if (history.replaceState) history.replaceState(null, '', id);
  });

  /* ------------------------------------------------------------------------
     Cabeçalho: esconde ao descer, mostra ao subir; link ativo; barra mobile
     ------------------------------------------------------------------------ */
  var header = $('.header');
  var mobileCta = $('.mobile-cta');
  var lastY = window.pageYOffset;
  var ticking = false;
  var heroEl = $('.hero');
  var reserveEl = $('#reservas');
  var footerEl = $('.footer');

  function onScroll() {
    var y = window.pageYOffset;
    var down = y > lastY;
    var past = y > (heroEl ? heroEl.offsetHeight * 0.6 : 400);
    if (!drawer.classList.contains('is-open')) {
      var hide = down && y > 160 && Math.abs(y - lastY) > 2;
      if (hide !== header.classList.contains('is-hidden') && Math.abs(y - lastY) > 2) {
        header.classList.toggle('is-hidden', hide);
        document.body.classList.toggle('header-hidden', hide);
      }
      if (y < 160) { header.classList.remove('is-hidden'); document.body.classList.remove('header-hidden'); }
    }
    if (mobileCta) {
      var vh = window.innerHeight;
      var rr = reserveEl.getBoundingClientRect();
      var fr = footerEl.getBoundingClientRect();
      var inReserve = rr.top < vh * 0.7 && rr.bottom > vh * 0.3;
      var inFooter = fr.top < vh;
      var show = past && !inReserve && !inFooter;
      mobileCta.classList.toggle('is-visible', show);
      $$('a', mobileCta).forEach(function (a) { a.tabIndex = show ? 0 : -1; });
      mobileCta.setAttribute('aria-hidden', String(!show));
    }
    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });

  // Link ativo no menu
  var navLinks = $$('.nav a');
  if ('IntersectionObserver' in window && navLinks.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['cardapio', 'sugestao', 'eventos', 'reservas', 'onde'].forEach(function (id) {
      var s = document.getElementById(id); if (s) io.observe(s);
    });
  }

  /* ------------------------------------------------------------------------
     Diálogo do prato
     ------------------------------------------------------------------------ */
  var dialog = $('.dialog');
  var lastFocus = null;
  function openDialog(data) {
    if (!dialog) return;
    lastFocus = document.activeElement;
    $('.dialog__img img', dialog).src = imgUrl(data.img, 1200);
    $('.dialog__img img', dialog).alt = data.name;
    $('#dialog-title').textContent = data.name;
    $('.dialog__desc', dialog).textContent = data.desc;
    $('.dialog__price', dialog).textContent = data.price || '';
    dialog.hidden = false;
    document.body.classList.add('is-locked');
    if (lenis) lenis.stop();
    requestAnimationFrame(function () { requestAnimationFrame(function () { dialog.classList.add('is-open'); }); });
    setTimeout(function () { $('.dialog__close', dialog).focus(); }, 60);
  }
  function closeDialog() {
    if (!dialog || dialog.hidden) return;
    dialog.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    if (lenis) lenis.start();
    setTimeout(function () { dialog.hidden = true; if (lastFocus) lastFocus.focus(); }, reduced ? 0 : 380);
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.dish__btn');
    if (!btn) return;
    var d = btn.closest('.dish');
    try { openDialog(JSON.parse(d.getAttribute('data-dish'))); } catch (err) {}
  });
  if (dialog) {
    dialog.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) closeDialog();
      if (e.target.closest('[data-close-go]')) { e.preventDefault(); closeDialog(); setTimeout(function () { scrollToTarget($('#reservas')); }, 300); }
    });
    // Mantém o foco dentro do diálogo
    dialog.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('button, a[href]', dialog);
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ------------------------------------------------------------------------
     Reserva → WhatsApp
     ------------------------------------------------------------------------ */
  var form = $('.form-card');
  var toast = $('.toast');
  var toastTimer;
  function showToast(title, msg) {
    if (!toast) return;
    $('.toast__title', toast).textContent = title;
    $('.toast__msg', toast).textContent = msg;
    toast.hidden = false;
    requestAnimationFrame(function () { toast.classList.add('is-visible'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () { toast.hidden = true; }, 450);
    }, 4200);
  }
  if (form) {
    var dateInput = $('.date-input', form);
    var today = recifeNow();
    dateInput.min = isoDate(today);
    $$('input[name="dia"]', form).forEach(function (r) {
      r.addEventListener('change', function () {
        dateInput.hidden = r.value !== 'outra' || !r.checked;
        if (!dateInput.hidden) dateInput.focus();
      });
    });
    var nome = $('#f-nome');
    nome.addEventListener('input', function () {
      nome.closest('.field').classList.remove('has-error');
      $('#f-nome-err').textContent = '';
      nome.removeAttribute('aria-invalid');
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var n = String(fd.get('nome') || '').trim();
      if (!n) {
        nome.closest('.field').classList.add('has-error');
        nome.setAttribute('aria-invalid', 'true');
        nome.setAttribute('aria-describedby', 'f-nome-err');
        $('#f-nome-err').textContent = 'Como devemos te chamar?';
        nome.focus();
        return;
      }
      var dia = fd.get('dia');
      if (dia === 'outra') {
        var dv = fd.get('data');
        if (dv) { var p = String(dv).split('-'); dia = 'dia ' + p[2] + '/' + p[1]; }
        else dia = 'data a combinar';
      } else {
        var dl = String(dia).toLowerCase();
        dia = (dl === 'hoje' || dl === 'amanhã') ? dl : 'no ' + dl;
      }
      var msg = 'Olá, Garden! Sou ' + n + '. Quero reservar: ' + fd.get('tipo') + ', ' + fd.get('pessoas') + ' pessoas, ' + dia + ' às ' + fd.get('hora') + '.';
      if (fd.get('aniversario')) msg += ' É aniversário!';
      var obs = String(fd.get('obs') || '').trim();
      if (obs) msg += ' Observações: ' + obs;
      var url = 'https://wa.me/' + (INFO.whatsapp || '5581979003779') + '?text=' + encodeURIComponent(msg);
      showToast('Reserva pronta', 'Abrindo o WhatsApp do Garden…');
      setTimeout(function () { window.open(url, '_blank', 'noopener'); }, 450);
    });
  }

  /* ------------------------------------------------------------------------
     Conteúdo da planilha: destaques, eventos, sugestão do dia e promoções
     ------------------------------------------------------------------------ */
  var appliedJson = sheetContent ? JSON.stringify(sheetContent) : null;
  var dailyCard = $('.daily-card');
  var dailyDefault = dailyCard ? dailyCard.innerHTML : '';
  var bdayDefault = {};
  $$('.js-bday').forEach(function (el, i) { bdayDefault[i] = el.textContent; });

  // Elementos criados depois que as animações já foram montadas
  function revealNew(els) {
    if (!els.length || !animReady || !hasGsap || reduced) return;
    gsap.fromTo(els, { autoAlpha: 0, y: 30 }, {
      autoAlpha: 1, y: 0, duration: 1, ease: EASE, stagger: 0.08,
      scrollTrigger: { trigger: els[0], start: 'top 92%', once: true }
    });
  }

  function renderHighlights(list, initial) {
    var rail = $('.delights__rail');
    if (!rail || !list || !list.length) return;
    rail.innerHTML = list.map(function (d) {
      var price = priceText(d.price);
      var data = { name: d.name, desc: d.desc || d.short || '', price: price, img: d.img || 'maria-bonita' };
      return '<article class="dish" role="listitem" data-dish="' + escapeHtml(JSON.stringify(data)) + '">' +
        '<button class="dish__btn" type="button" aria-label="Ver detalhes: ' + escapeHtml(d.name) + '">' +
        '<span class="dish__img"><img src="' + escapeHtml(imgUrl(data.img, 700)) + '" alt="' + escapeHtml(d.name) + '" width="600" height="600" loading="lazy"></span>' +
        '<span class="dish__body"><span class="badge badge--plate">' + escapeHtml(d.name) + '</span>' +
        (d.short ? '<span class="muted">' + escapeHtml(d.short) + '</span>' : '') +
        (price ? '<span class="dish__price">' + escapeHtml(price) + '</span>' : '') +
        '</span></button></article>';
    }).join('');
    if (!initial) revealNew($$('.dish', rail));
  }

  function renderEvents(list, initial) {
    var wrap = $('.events__list');
    if (!wrap || !list) return;
    var today = isoDate(recifeNow());
    var upcoming = list.filter(function (ev) { return !ev.date || ev.date >= today; })
      .sort(function (a, b) { return (a.date || '9999') < (b.date || '9999') ? -1 : 1; });
    var attrs = initial ? ' data-reveal' : '';
    var phone = INFO.eventsPhone || '5581986059740';
    var phoneLabel = INFO.eventsPhoneLabel || '(81) 98605-9740';
    var html = upcoming.map(function (ev) {
      var meta = '';
      if (ev.date) meta += '<li><svg class="ic"><use href="#i-calendar"/></svg>' + longDate(ev.date) + '</li>';
      if (ev.time) meta += '<li><svg class="ic"><use href="#i-clock"/></svg>' + escapeHtml(ev.time) + '</li>';
      if (priceText(ev.price)) {
        var ep = typeof ev.price === 'number' ? 'R$ ' + ev.price.toFixed(2).replace('.', ',') : ev.price;
        meta += '<li><svg class="ic"><use href="#i-ticket"/></svg>' + escapeHtml(ep) + '</li>';
      }
      return '<article class="event' + (ev.img ? '' : ' event--noimg') + '"' + attrs + '>' +
        (ev.img ? '<div class="event__img"' + (initial ? ' data-clip' : '') + '><img src="' + escapeHtml(imgUrl(ev.img, 900)) + '" alt="' + escapeHtml(ev.title) + '" width="600" height="600" loading="lazy"></div>' : '') +
        '<div class="event__body">' +
        (ev.type ? '<span class="badge badge--novidade">' + escapeHtml(ev.type) + '</span>' : '') +
        '<h3>' + escapeHtml(ev.title) + '</h3>' +
        (ev.desc ? '<p>' + escapeHtml(ev.desc) + '</p>' : '') +
        (meta ? '<ul class="event__meta">' + meta + '</ul>' : '') +
        '<div class="event__ctas">' +
        '<a class="btn btn--accent" href="#reservas" data-reserve="Evento"><svg class="ic"><use href="#i-whatsapp"/></svg>Faça sua reserva</a>' +
        '<a class="btn btn--outline-cream" href="tel:+' + escapeHtml(phone) + '"><svg class="ic"><use href="#i-phone"/></svg>' + escapeHtml(phoneLabel) + '</a>' +
        '</div></div></article>';
    }).join('');
    var empty = $('.event--empty');
    $$('.event:not(.event--empty)', wrap).forEach(function (el) { el.remove(); });
    if (empty) {
      empty.insertAdjacentHTML('beforebegin', html);
      empty.hidden = upcoming.length > 0;
    } else {
      wrap.insertAdjacentHTML('afterbegin', html);
    }
    if (!initial) revealNew($$('.event:not([hidden])', wrap));
  }

  function renderDaily(list) {
    if (!dailyCard || !list) return;
    var today = isoDate(recifeNow());
    var d = list.filter(function (x) { return !x.date || x.date === today; })[0];
    dailyCard.innerHTML = dailyDefault;
    if (!d) return;
    var img = $('.daily-card__img img', dailyCard);
    if (img && d.img) { img.src = imgUrl(d.img, 800); img.alt = d.name; }
    $('.eyebrow', dailyCard).textContent = 'Sugestão de hoje';
    $('.daily-card__title', dailyCard).textContent = d.name;
    var muted = $('.muted', dailyCard);
    muted.textContent = d.desc || 'Preço especial só hoje.';
    var price = priceText(d.price);
    if (price) muted.insertAdjacentHTML('afterend', '<span class="dish__price">' + escapeHtml(price) + '</span>');
    var arrow = $('.link-arrow', dailyCard);
    if (arrow) arrow.innerHTML = 'Ver nos stories <svg class="ic"><use href="#i-arrow-up-right"/></svg>';
  }

  function renderPromos(promos) {
    if (!promos) return;
    var b = promos['aniversario'];
    if (!b) return;
    var show = b.show && b.text;
    $$('.js-bday').forEach(function (el, i) {
      el.textContent = show ? b.text : (el.getAttribute('data-off') || bdayDefault[i]);
    });
    $$('.js-bday-off').forEach(function (el) { el.hidden = !show; });
  }

  function applyContent(c, initial) {
    if (!c) return;
    if (c.menu && c.menu.length && !initial) {
      MENU = c.menu;
      if (!MENU.some(function (x) { return x.id === currentCat; })) currentCat = MENU[0].id;
      if (tabsEl) { buildTabs(); renderMenu(false); }
      updateCount();
    }
    renderHighlights(c.highlights, initial);
    renderEvents(c.events, initial);
    renderDaily(c.daily);
    renderPromos(c.promos);
    if (!initial && hasGsap) ScrollTrigger.refresh();
  }

  // 1) Cópia salva da última visita entra antes das animações
  if (sheetContent) applyContent(sheetContent, true);
  // 2) Versão nova da planilha: só redesenha se algo mudou
  if (Sheet) {
    Sheet.fetch().then(function (fresh) {
      if (!fresh) return;
      var json = JSON.stringify(fresh);
      if (json === appliedJson) return;
      appliedJson = json;
      applyContent(fresh, false);
    });
  }

  /* ------------------------------------------------------------------------
     Sem GSAP ou com "reduzir movimento": encerra aqui (tudo já está visível)
     ------------------------------------------------------------------------ */
  if (!hasGsap || reduced) {
    try { sessionStorage.setItem('garden-intro', '1'); } catch (e) {}
    $$('[data-split]').forEach(function (el) { el.classList.add('is-split'); });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* Rolagem suave só em dispositivos com mouse */
  if (window.Lenis && !isTouch) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ------------------------------------------------------------------------
     Divisão de títulos em palavras com máscara
     ------------------------------------------------------------------------ */
  function split(el) {
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            var line = document.createElement('span'); line.className = 'split-line';
            var word = document.createElement('span'); word.className = 'split-word';
            word.textContent = p;
            line.appendChild(word);
            frag.appendChild(line);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    $$('.split-line', el).forEach(function (l) { l.setAttribute('aria-hidden', 'true'); });
    el.classList.add('is-split');
    return $$('.split-word', el);
  }

  var splitMap = new Map();
  $$('[data-split]').forEach(function (el) {
    var words = split(el);
    gsap.set(words, { yPercent: 110 });
    splitMap.set(el, words);
  });

  /* ------------------------------------------------------------------------
     Abertura + entrada do hero
     ------------------------------------------------------------------------ */
  function heroIn(delay) {
    var tl = gsap.timeline({ delay: delay || 0 });
    var title = $('.hero__title');
    tl.to(splitMap.get(title), { yPercent: 0, duration: 1.3, ease: EASE, stagger: 0.08 }, 0)
      .fromTo('[data-hero="fade"]', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: EASE, stagger: 0.09 }, 0.15)
      .fromTo('[data-plate="main"]', { autoAlpha: 0, scale: 0.82, rotate: -18 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.6, ease: EASE }, 0.05)
      .fromTo('[data-plate="side"]', { autoAlpha: 0, scale: 0.7, rotate: 14, y: 40 }, { autoAlpha: 1, scale: 1, rotate: 0, y: 0, duration: 1.5, ease: EASE }, 0.25)
      .fromTo('[data-plate="tiny"]', { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 1.3, ease: EASE }, 0.4)
      .fromTo('[data-plate="badge"]', { autoAlpha: 0, y: 16, rotate: -12 }, { autoAlpha: 1, y: 0, rotate: -4, duration: 1, ease: 'back.out(1.6)' }, 0.85)
      .fromTo('.hero__glow', { opacity: 0 }, { opacity: 1, duration: 1.8, ease: 'power2.out' }, 0)
      .fromTo('.sprig--hero', { autoAlpha: 0, rotate: -30 }, { autoAlpha: 1, rotate: isTouch ? 80 : -8, duration: 1.8, ease: EASE }, 0.3);
    return tl;
  }

  var intro = $('.intro');
  var showIntro = intro && getComputedStyle(intro).display !== 'none';
  try { sessionStorage.setItem('garden-intro', '1'); } catch (e) {}

  if (showIntro) {
    if (lenis) lenis.stop();
    document.body.classList.add('is-locked');
    var itl = gsap.timeline({
      onComplete: function () {
        intro.remove();
        document.body.classList.remove('is-locked');
        if (lenis) lenis.start();
      }
    });
    itl.fromTo('.intro__flower', { scale: 0.4, rotate: -120, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.1, ease: EASE })
      .fromTo('.intro__word', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: EASE }, 0.35)
      .to('.intro__inner', { autoAlpha: 0, y: -20, duration: 0.5, ease: 'power2.in' }, 1.35)
      .to(intro, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, 1.6)
      .add(heroIn(), 1.85);
  } else {
    heroIn(0.1);
  }

  /* ------------------------------------------------------------------------
     Animações por rolagem
     ------------------------------------------------------------------------ */
  var mm = gsap.matchMedia();

  // Títulos divididos fora do hero
  splitMap.forEach(function (words, el) {
    if (el.classList.contains('hero__title')) return;
    gsap.to(words, {
      yPercent: 0, duration: 1.2, ease: EASE, stagger: 0.07,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true }
    });
  });

  // Revelações suaves em lote
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    once: true,
    onEnter: function (batch) {
      gsap.fromTo(batch, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: EASE, stagger: 0.1, overwrite: true });
    }
  });

  // Imagens que se revelam de baixo para cima
  $$('[data-clip]').forEach(function (el) {
    var img = $('img', el);
    var tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    tl.to(el, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut' });
    if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: EASE }, 0);
  });

  // Cards de delícias: entrada escalonada
  gsap.fromTo('.dish', { autoAlpha: 0, y: 60 }, {
    autoAlpha: 1, y: 0, duration: 1.2, ease: EASE, stagger: 0.12,
    scrollTrigger: { trigger: '.delights__rail', start: 'top 85%', once: true }
  });

  // Painel do cardápio
  gsap.fromTo('.menu-panel, .menu-photo', { autoAlpha: 0, y: 40 }, {
    autoAlpha: 1, y: 0, duration: 1.1, ease: EASE, stagger: 0.12,
    scrollTrigger: { trigger: '.menu__grid', start: 'top 85%', once: true }
  });

  // Manifesto: palavras acendem conforme a rolagem
  var manifesto = $('[data-words]');
  if (manifesto) {
    var text = manifesto.textContent.trim();
    manifesto.setAttribute('aria-label', text);
    manifesto.innerHTML = text.split(/\s+/).map(function (w) {
      return '<span class="word" aria-hidden="true">' + escapeHtml(w) + '</span>';
    }).join(' ');
    gsap.fromTo($$('.word', manifesto), { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: manifesto, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 }
    });
  }

  // Faixa: anda conforme a rolagem (não fica em loop)
  gsap.fromTo('.ribbon__track', { xPercent: 0 }, {
    xPercent: -32, ease: 'none',
    scrollTrigger: { trigger: '.ribbon', start: 'top bottom', end: 'bottom top', scrub: 0.8 }
  });

  // Selo da flor gira levemente com a rolagem
  gsap.to('[data-spin]', {
    rotate: 140, ease: 'none',
    scrollTrigger: { trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: 1 }
  });

  // Floreio botânico
  gsap.fromTo('.sprig--about', { autoAlpha: 0, rotate: -20, scale: 0.85 }, {
    autoAlpha: 1, rotate: 0, scale: 1, duration: 1.6, ease: EASE,
    scrollTrigger: { trigger: '.about', start: 'top 75%', once: true }
  });

  // Rodapé: wordmark grande sobe e cresce
  gsap.fromTo('[data-big]', { yPercent: 40, scale: 0.92 }, {
    yPercent: 0, scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: 0.8 }
  });

  // Desktop: parallax mais rico
  mm.add('(min-width: 861px)', function () {
    var hero = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 } });
    hero.to('[data-plate="main"] img', { scale: 1.12, ease: 'none' }, 0)
      .to('[data-plate="main"]', { yPercent: 18, rotate: 10, ease: 'none' }, 0)
      .to('[data-plate="side"]', { yPercent: -40, rotate: -12, ease: 'none' }, 0)
      .to('[data-plate="tiny"]', { yPercent: -90, ease: 'none' }, 0)
      .to('.hero__copy', { yPercent: 14, autoAlpha: 0.2, ease: 'none' }, 0);

    $$('[data-speed]').forEach(function (img) {
      var s = parseFloat(img.getAttribute('data-speed')) || 0;
      gsap.fromTo(img, { yPercent: -s * 100 - 7 }, {
        yPercent: s * 100 - 7, ease: 'none',
        scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // Cards de delícias em velocidades levemente diferentes
    $$('.dish').forEach(function (d, i) {
      gsap.to(d, {
        y: i % 2 ? -22 : 10, ease: 'none',
        scrollTrigger: { trigger: '.delights', start: 'top bottom', end: 'bottom top', scrub: 1 }
      });
    });
  });

  // Celular: parallax leve, só transform, para manter a fluidez
  mm.add('(max-width: 860px)', function () {
    var hero = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.5 } });
    hero.to('[data-plate="main"]', { yPercent: 12, rotate: 8, ease: 'none' }, 0)
      .to('[data-plate="side"]', { yPercent: -18, ease: 'none' }, 0);
  });

  animReady = true;

  // Recalcula posições depois que as fontes carregam
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
