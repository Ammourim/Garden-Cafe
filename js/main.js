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

  // Durante a rolagem por link o cabeçalho fica visível, para o destino
  // não parar com uma faixa vazia no topo
  var headerLockUntil = 0;
  function scrollToTarget(target) {
    if (!target) return;
    var extra = 0;
    headerLockUntil = Date.now() + 1700;
    var hd = document.querySelector('.header');
    if (hd) { hd.classList.remove('is-hidden'); document.body.classList.remove('header-hidden'); }
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
  // srcset/sizes para fotos do Drive: o celular baixa a largura que precisa
  function imgSrcset(src) {
    return Sheet && Sheet.imageSrcset ? Sheet.imageSrcset(src) : '';
  }
  function srcsetAttr(src, sizes) {
    var set = imgSrcset(src);
    return set ? ' srcset="' + escapeHtml(set) + '" sizes="' + sizes + '"' : '';
  }
  function setImg(img, src, w, sizes) {
    var set = imgSrcset(src);
    if (set) { img.sizes = sizes; img.srcset = set; } else img.removeAttribute('srcset');
    img.src = imgUrl(src, w);
  }
  var SIZES = {
    dish: '(max-width: 860px) 70vw, 300px',
    event: '(max-width: 860px) 92vw, 420px',
    daily: '180px',
    photo: '(max-width: 860px) 92vw, 480px',
    fixed: '(max-width: 860px) 60vw, 380px',
    dialog: '(max-width: 640px) 100vw, 340px'
  };

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
      setImg(photoImg, img, 900, SIZES.photo);
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
      var preSet = imgSrcset(img);
      if (preSet) { pre.sizes = SIZES.photo; pre.srcset = preSet; }
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
      var rf = $('.form-card');
      if (rf && rf.setTipo) rf.setTipo(reserveType);
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
  var menuEl = $('#cardapio');
  var footerEl = $('.footer');

  // Posição das seções que escondem a barra do celular: lida por
  // IntersectionObserver (sem medir o layout a cada quadro da rolagem)
  var zone = { reserve: false, footer: false, menu: false };
  var heroLimit = heroEl ? heroEl.offsetHeight * 0.6 : 400;
  window.addEventListener('resize', function () { heroLimit = heroEl ? heroEl.offsetHeight * 0.6 : 400; }, { passive: true });
  if (mobileCta && 'IntersectionObserver' in window) {
    var watchZone = function (el, key, margin) {
      if (!el) return;
      new IntersectionObserver(function (entries) {
        zone[key] = entries[entries.length - 1].isIntersecting;
        if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
      }, { rootMargin: margin }).observe(el);
    };
    watchZone(reserveEl, 'reserve', '-30% 0px -30% 0px');
    watchZone(footerEl, 'footer', '0px');
    watchZone(menuEl, 'menu', '-40% 0px -40% 0px');
  }
  var ctaShown = null;

  function onScroll() {
    var y = window.pageYOffset;
    var down = y > lastY;
    var past = y > heroLimit;
    if (!drawer.classList.contains('is-open') && Date.now() > headerLockUntil) {
      var hide = down && y > 160 && Math.abs(y - lastY) > 2;
      if (hide !== header.classList.contains('is-hidden') && Math.abs(y - lastY) > 2) {
        header.classList.toggle('is-hidden', hide);
        document.body.classList.toggle('header-hidden', hide);
      }
      if (y < 160) { header.classList.remove('is-hidden'); document.body.classList.remove('header-hidden'); }
    }
    if (mobileCta) {
      // Dentro do cardápio a barra sairia da frente dos itens e repetiria o botão "Cardápio"
      var show = past && !zone.reserve && !zone.footer && !zone.menu;
      if (show !== ctaShown) {
        ctaShown = show;
        mobileCta.classList.toggle('is-visible', show);
        Array.prototype.forEach.call(mobileCta.querySelectorAll('a'), function (el) { el.tabIndex = show ? 0 : -1; });
        mobileCta.setAttribute('aria-hidden', String(!show));
      }
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
    ['sugestao', 'cardapio', 'eventos', 'reservas', 'onde'].forEach(function (id) {
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
    setImg($('.dialog__img img', dialog), data.img, 720, SIZES.dialog);
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
    var WA_NUMBER = INFO.whatsapp || '5581979003779';
    var WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    var TIPO_FRASE = {
      'Mesa': 'reservar uma mesa',
      'Aniversário': 'reservar para comemorar um aniversário',
      'Confraternização': 'reservar para uma confraternização',
      'Evento': 'reservar para um evento'
    };
    var dateRow = $('[data-date-row]', form);
    var dateInput = $('.date-input', form);
    var nome = $('#f-nome');
    var pessoas = $('#f-pessoas');
    var obs = $('#f-obs');
    var bdayCheck = $('input[name="aniversario"]', form);

    var dd = function (d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
    var addDays = function (d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
    var nextWeekday = function (d, wd) { return addDays(d, (wd - d.getDay() + 7) % 7); };

    // Datas reais embaixo de cada opção de dia. Sábado e domingo somem quando
    // já são "hoje" ou "amanhã", para não ter duas opções iguais.
    var dayDates = {};
    function refreshDays() {
      var now = recifeNow();
      var today = addDays(now, 0);
      dayDates = { hoje: today, amanha: addDays(today, 1), sabado: nextWeekday(today, 6), domingo: nextWeekday(today, 0) };
      Object.keys(dayDates).forEach(function (k) {
        var radio = $('input[name="dia"][value="' + k + '"]', form);
        var chip = radio.closest('.chip');
        $('small', chip).textContent = (k === 'hoje' || k === 'amanha' ? WEEKDAYS[dayDates[k].getDay()].replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' : '') + dd(dayDates[k]);
        var dup = (k === 'sabado' || k === 'domingo') && (isoDate(dayDates[k]) === isoDate(dayDates.hoje) || isoDate(dayDates[k]) === isoDate(dayDates.amanha));
        chip.hidden = dup;
        if (dup && radio.checked) radio.checked = false;
      });
      // Depois das 21h não dá mais para reservar para hoje
      var hojeRadio = $('input[name="dia"][value="hoje"]', form);
      var closedToday = now.getHours() >= 21;
      hojeRadio.closest('.chip').hidden = closedToday;
      if (closedToday && hojeRadio.checked) hojeRadio.checked = false;
      refreshHours();
    }

    // Para hoje, horários que já passaram ficam indisponíveis
    function refreshHours() {
      var isToday = (selectedDate() || {}).iso === isoDate(recifeNow());
      var h = recifeNow().getHours();
      $$('input[name="hora"]', form).forEach(function (r) {
        var past = isToday && parseInt(r.value, 10) <= h;
        r.disabled = past;
        if (past && r.checked) r.checked = false;
      });
    }

    function selectedDate() {
      var dia = (form.querySelector('input[name="dia"]:checked') || {}).value;
      if (!dia) return null;
      if (dia === 'outra') {
        var m = dateInput.value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!m) return { key: 'outra', bad: !!dateInput.value };
        var d = new Date(+m[3], +m[2] - 1, +m[1]);
        if (d.getDate() !== +m[1] || d.getMonth() !== +m[2] - 1) return { key: 'outra', bad: true };
        return { key: 'outra', date: d, iso: isoDate(d) };
      }
      return { key: dia, date: dayDates[dia], iso: isoDate(dayDates[dia]) };
    }

    function dayText(sel) {
      if (!sel || !sel.date) return '';
      var wd = WEEKDAYS[sel.date.getDay()];
      var base = wd + (sel.date.getDay() > 0 && sel.date.getDay() < 6 ? '-feira' : '') + ', ' + dd(sel.date);
      if (sel.key === 'hoje') return 'hoje, ' + base;
      if (sel.key === 'amanha') return 'amanhã, ' + base;
      return base;
    }

    function readForm() {
      var n = nome.value.trim().replace(/\s+/g, ' ');
      var q = Math.max(1, parseInt(pessoas.value, 10) || 1);
      return {
        nome: n,
        primeiro: n.split(' ')[0],
        tipo: (form.querySelector('input[name="tipo"]:checked') || {}).value || 'Mesa',
        pessoas: q,
        dia: dayText(selectedDate()),
        hora: (form.querySelector('input[name="hora"]:checked') || {}).value || '',
        aniversario: bdayCheck.checked,
        obs: obs.value.trim()
      };
    }

    // Mensagem com a cara do Garden. *negrito* e _itálico_ são do WhatsApp.
    function buildLines(f) {
      var lines = [];
      var quem = f.nome ? 'Aqui é *' + f.nome + '* e eu' : 'Eu';
      lines.push('Olá, Garden! 🌿');
      lines.push(quem + ' gostaria de ' + TIPO_FRASE[f.tipo] + '.');
      lines.push('');
      lines.push('👥 *Pessoas:* ' + f.pessoas + (f.pessoas === 1 ? ' pessoa' : ' pessoas'));
      lines.push('📅 *Dia:* ' + (f.dia || 'a combinar'));
      lines.push('🕖 *Horário:* ' + (f.hora || 'a combinar'));
      if (f.aniversario || f.tipo === 'Aniversário') lines.push('🎂 *Tem aniversariante na mesa!*');
      if (f.obs) lines.push('📝 *Observações:* ' + f.obs.replace(/\s*\n\s*/g, ' '));
      lines.push('');
      lines.push('Pode confirmar pra mim? Até já! ☕');
      lines.push('_Enviado pelo site do Garden Café_');
      return lines;
    }

    function updateSteps() {
      var f = readForm();
      var steps = $$('.form-step', form);
      steps[0].classList.toggle('is-done', !!f.nome);
      steps[1].classList.toggle('is-done', !!(f.dia && f.hora));
    }

    function onTyping(input) {
      var ctrl = input.closest('.control');
      if (ctrl) ctrl.classList.toggle('is-filled', !!input.value.trim());
      updateSteps();
    }

    function autoGrow(t) {
      t.style.height = 'auto';
      t.style.height = Math.max(76, t.scrollHeight + 3) + 'px';
    }

    nome.addEventListener('input', function () {
      nome.closest('.field').classList.remove('has-error');
      $('#f-nome-err').textContent = '';
      nome.removeAttribute('aria-invalid');
      nome.closest('.control').classList.toggle('is-valid', nome.value.trim().length >= 2);
      onTyping(nome);
    });
    obs.addEventListener('input', function () {
      autoGrow(obs);
      var c = $('[data-count]', form);
      c.textContent = obs.value.length;
      c.parentNode.classList.toggle('is-on', obs.value.length > 0);
      onTyping(obs);
    });

    // Quantidade de pessoas
    function setPessoas(v, bump) {
      var min = +pessoas.getAttribute('data-min'), max = +pessoas.getAttribute('data-max');
      v = Math.min(max, Math.max(min, parseInt(v, 10) || min));
      pessoas.value = v;
      $('[data-step="-1"]', form).disabled = v <= min;
      $('[data-step="1"]', form).disabled = v >= max;
      if (bump && !reduced) { pessoas.classList.remove('is-bump'); void pessoas.offsetWidth; pessoas.classList.add('is-bump'); }
      var pr = pessoas.closest('[data-caret]');
      if (pr && pr.caretUpdate) pr.caretUpdate();
      updateSteps();
    }
    $$('.stepper__btn', form).forEach(function (b) {
      b.addEventListener('click', function () { setPessoas((parseInt(pessoas.value, 10) || 1) + +b.getAttribute('data-step'), true); });
    });
    pessoas.addEventListener('input', function () { pessoas.value = pessoas.value.replace(/\D+/g, '').slice(0, 2); });
    pessoas.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setPessoas((parseInt(pessoas.value, 10) || 1) + (e.key === 'ArrowUp' ? 1 : -1), true); }
    });
    pessoas.addEventListener('blur', function () { setPessoas(pessoas.value); });

    // Data digitada: só números, com as barras entrando sozinhas
    dateInput.addEventListener('input', function () {
      var dgt = dateInput.value.replace(/\D+/g, '').slice(0, 8);
      var out = dgt.slice(0, 2);
      if (dgt.length > 2) out += '/' + dgt.slice(2, 4);
      if (dgt.length > 4) out += '/' + dgt.slice(4);
      if (out !== dateInput.value) dateInput.value = out;
      setErr('f-dia-err', '');
      refreshHours();
    });

    var setErr = function (id, msg) {
      var el = $('#' + id);
      if (!el) return;
      el.textContent = msg || '';
      el.closest('.field').classList.toggle('has-error', !!msg);
    };
    form.addEventListener('change', function (e) {
      var n = e.target.name;
      if (n === 'dia') {
        var outra = e.target.value === 'outra';
        dateRow.hidden = !outra;
        if (outra) dateInput.focus();
      }
      if (n === 'dia' || n === 'data') { setErr('f-dia-err', ''); refreshHours(); }
      if (n === 'hora') setErr('f-hora-err', '');
      if (n === 'tipo' && e.target.value === 'Aniversário') bdayCheck.checked = true;
      updateSteps();
    });

    // Atalhos do site ("Faça sua reserva" do evento, cards de aniversário…)
    form.setTipo = function (tipo) {
      var r = $('input[name="tipo"][value="' + tipo + '"]', form);
      if (!r) return;
      r.checked = true;
      if (tipo === 'Aniversário') bdayCheck.checked = true;
      updateSteps();
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      refreshHours();
      var f = readForm();
      if (!f.nome) {
        nome.closest('.field').classList.add('has-error');
        nome.setAttribute('aria-invalid', 'true');
        $('#f-nome-err').textContent = 'Como devemos te chamar?';
        nome.focus();
        return;
      }
      var sel = selectedDate();
      var firstBad = null;
      if (!sel || !sel.date) {
        setErr('f-dia-err', !sel ? 'Escolha o dia da reserva.' : (sel.bad ? 'Data inválida. Use dd/mm/aaaa.' : 'Digite a data no formato dd/mm/aaaa.'));
        firstBad = sel ? dateInput : $('input[name="dia"]:not([disabled])', form);
      } else if (sel.iso < isoDate(recifeNow())) {
        setErr('f-dia-err', 'Essa data já passou. Escolha outra.');
        firstBad = dateInput;
      }
      if (!f.hora) {
        setErr('f-hora-err', 'Escolha o horário.');
        firstBad = firstBad || $('input[name="hora"]:not([disabled])', form);
      }
      if (firstBad) {
        firstBad.focus();
        firstBad.closest('fieldset').scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        return;
      }
      var msg = buildLines(f).join('\n');
      var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg);
      showToast('Reserva pronta, ' + f.primeiro + '!', 'Abrindo o WhatsApp do Garden…');
      setTimeout(function () { window.open(url, '_blank', 'noopener'); }, 450);
    });

    refreshDays();
    setPessoas(pessoas.value);
    $$('.field-caret', form).forEach(initCaret);
  }

  /* ------------------------------------------------------------------------
     Caret suave (adaptado de movin.design/components/inputs/caret)
     O caret nativo fica transparente e um caret desenhado segue o cursor.
     A posição vem de um "espelho" invisível com o mesmo estilo do campo: o
     texto antes do cursor + um marcador. Funciona em campo de uma linha e em
     textarea (várias linhas). Ao saltar, um rastro de 1px esticado entre o
     ponto antigo e o novo encolhe até ele. Só pisca quando está parado.
     ------------------------------------------------------------------------ */
  var CARET_PROPS = ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'lineHeight', 'fontFamily',
    'letterSpacing', 'wordSpacing', 'textTransform', 'textIndent', 'textAlign', 'tabSize', 'fontFeatureSettings'];
  var caretMirror = null;

  function caretPoint(el) {
    var multi = el.tagName === 'TEXTAREA';
    var cs = getComputedStyle(el);
    if (!caretMirror) {
      caretMirror = document.createElement('div');
      caretMirror.setAttribute('aria-hidden', 'true');
      caretMirror.style.cssText = 'position:absolute;top:0;left:-9999px;visibility:hidden;overflow:hidden;pointer-events:none';
      document.body.appendChild(caretMirror);
    }
    CARET_PROPS.forEach(function (k) { caretMirror.style[k] = cs[k]; });
    caretMirror.style.whiteSpace = multi ? 'pre-wrap' : 'pre';
    caretMirror.style.overflowWrap = multi ? 'break-word' : 'normal';
    caretMirror.style.height = 'auto';
    var pos = el.selectionEnd == null ? el.value.length : el.selectionEnd;
    caretMirror.textContent = el.value.slice(0, pos);
    var mark = document.createElement('span');
    mark.textContent = '​';
    caretMirror.appendChild(mark);
    caretMirror.appendChild(document.createTextNode(el.value.slice(pos) || ''));
    var x = mark.offsetLeft - el.scrollLeft;
    var bl = parseFloat(cs.borderLeftWidth), pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight);
    x = Math.max(bl + pl - 1, Math.min(el.offsetWidth - parseFloat(cs.borderRightWidth) - pr, x));
    var lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
    var h = Math.round(Math.min(lh, parseFloat(cs.fontSize) * 1.4));
    var y;
    if (multi) {
      y = mark.offsetTop - el.scrollTop + (lh - h) / 2;
      var top = parseFloat(cs.borderTopWidth), bottom = el.offsetHeight - parseFloat(cs.borderBottomWidth) - h;
      y = Math.max(top, Math.min(bottom, y));
    } else {
      y = (el.offsetHeight - h) / 2; // o navegador centraliza a linha no campo
    }
    return { x: el.offsetLeft + x, y: el.offsetTop + y, h: h };
  }

  function initCaret(root) {
    var input = $('.field-caret__input', root);
    var box = $('.field-caret__box', root);
    var tail = $('.field-caret__tail', root);
    if (!input || !box) return;
    var last = null;
    var timer = 0;

    function update() {
      var on = document.activeElement === input && input.selectionStart === input.selectionEnd;
      root.classList.toggle('field-caret--on', on);
      if (!on) return;
      var pt = caretPoint(input);
      if (last && pt.x === last.x && pt.y === last.y) return;
      var sameLine = last && Math.abs(pt.y - last.y) < 2;
      if (sameLine && tail && !reduced && tail.animate && Math.abs(pt.x - last.x) > 3) {
        tail.classList.toggle('field-caret__tail--left', pt.x < last.x);
        var ty = pt.y + pt.h / 2 - 8;
        tail.animate([
          { opacity: 1, transform: 'translate(' + Math.min(last.x, pt.x) + 'px,' + ty + 'px) scaleX(' + Math.abs(pt.x - last.x) + ')' },
          { opacity: 0, transform: 'translate(' + pt.x + 'px,' + ty + 'px) scaleX(1)' }
        ], { duration: 260, easing: 'cubic-bezier(0.2, 0, 0, 1)' });
      }
      // Ao mudar de linha o caret vai direto, sem deslizar na diagonal
      root.classList.toggle('field-caret--jump', !!last && !sameLine);
      last = pt;
      box.style.setProperty('--field-caret-x', pt.x.toFixed(1) + 'px');
      box.style.setProperty('--field-caret-y', pt.y.toFixed(1) + 'px');
      box.style.setProperty('--field-caret-h', pt.h + 'px');
      root.classList.add('field-caret--moving');
      clearTimeout(timer);
      timer = setTimeout(function () { root.classList.remove('field-caret--moving'); }, 500);
    }
    // Depois de redimensionar (textarea que cresce) mede no próximo quadro
    var later = function () { requestAnimationFrame(update); };
    input.addEventListener('input', function () { update(); later(); });
    input.addEventListener('focus', update);
    input.addEventListener('blur', function () { last = null; update(); });
    input.addEventListener('scroll', update);
    input.addEventListener('transitionend', update);
    document.addEventListener('selectionchange', function () { if (document.activeElement === input) update(); });
    window.addEventListener('resize', function () { last = null; if (document.activeElement === input) update(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { last = null; update(); });
    // Atualizações feitas por código (botões − e +)
    root.caretUpdate = later;
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
        '<span class="dish__img"><img src="' + escapeHtml(imgUrl(data.img, 700)) + '"' + srcsetAttr(data.img, SIZES.dish) + ' alt="' + escapeHtml(d.name) + '" width="600" height="600" loading="lazy"></span>' +
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
        (ev.img ? '<div class="event__img"' + (initial ? ' data-clip' : '') + '><img src="' + escapeHtml(imgUrl(ev.img, 900)) + '"' + srcsetAttr(ev.img, SIZES.event) + ' alt="' + escapeHtml(ev.title) + '" width="600" height="600" loading="lazy"></div>' : '') +
        '<div class="event__body">' +
        (ev.type ? '<span class="badge badge--novidade">' + escapeHtml(ev.type) + '</span>' : '') +
        '<h3>' + escapeHtml(ev.title) + '</h3>' +
        (ev.desc ? '<p>' + escapeHtml(ev.desc) + '</p>' : '') +
        (meta ? '<ul class="event__meta">' + meta + '</ul>' : '') +
        '<div class="event__ctas">' +
        '<a class="btn btn--accent" href="#reservas" data-reserve="Evento"><svg class="ic"><use href="#i-calendar"/></svg>Faça sua reserva</a>' +
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
    if (img && d.img) { img.removeAttribute('data-photo'); setImg(img, d.img, 360, SIZES.daily); img.alt = d.name; }
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

  // Fotos fixas da página (abertura, sobre nós, sugestão padrão) marcadas com
  // data-photo="Nome do prato": usam a mesma foto do prato na aba Cardápio.
  function applyPhotos(photos) {
    if (!photos || !Sheet || !Sheet.norm) return;
    $$('img[data-photo]').forEach(function (img) {
      var src = photos[Sheet.norm(img.getAttribute('data-photo'))];
      if (!src) return;
      var url = imgUrl(src, 720);
      if (img.getAttribute('src') !== url) setImg(img, src, 720, SIZES.fixed);
    });
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
    applyPhotos(c.photos);
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
      .fromTo('[data-plate="main"]', { autoAlpha: 0.01, scale: 0.82, rotate: -18 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.6, ease: EASE }, 0.05)
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
    itl.fromTo('.intro__flower', { scale: 0.4, rotate: -120, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 0.8, ease: EASE })
      .fromTo('.intro__word', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: EASE }, 0.2)
      .to('.intro__inner', { autoAlpha: 0, y: -20, duration: 0.35, ease: 'power2.in' }, 0.85)
      .to(intro, { clipPath: 'inset(0 0 100% 0)', duration: 0.7, ease: 'expo.inOut' }, 1.0)
      .add(heroIn(), 1.15);
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
    gsap.fromTo($$('.word', manifesto), { opacity: 0.35 }, {
      opacity: 1, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: manifesto, start: 'top 85%', end: 'bottom 60%', scrub: 0.6 }
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
    hero.to('[data-plate="main"]', { yPercent: 18, rotate: 10, ease: 'none' }, 0)
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
