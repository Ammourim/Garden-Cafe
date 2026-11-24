/* ==========================================================================
   Garden Café · espiral infinita de fotos (cardápio)
   Recriação em JS puro do componente InfiniteSpiral (React) que o usuário
   enviou, com as mesmas opções. Os cards giram numa hélice 3D desenhada com
   transformações 2D (perspectiva calculada aqui), então cada quadro só mexe
   em transform, opacity e, quando muda, filter.
   - Só roda quando a espiral está na tela e a aba está visível
   - Fotos só são baixadas quando a seção se aproxima da tela
   - "Reduzir movimento": espiral parada
   ========================================================================== */
(function () {
  'use strict';

  // Opções do componente (as mesmas props do InfiniteSpiral)
  var DESKTOP = {
    speed: 0.55, radius: 170, cardWidth: 100, cardHeight: 100, verticalSpacing: 60,
    perspective: 1000, cardRadius: 10, centerScale: 1.2, edgeBlur: 6, cardsPerTurn: 7,
    pauseOnHover: true, direction: 'up', rotation: 0, cardTilt: 0, edgeFade: 0.3, grayscale: 1
  };
  // Celular: a mesma espiral, menor, acima da lista
  var MOBILE = { radius: 105, cardWidth: 72, cardHeight: 72, verticalSpacing: 40 };
  var MOBILE_MQ = '(max-width: 860px)';
  var TAU = Math.PI * 2;

  function extend(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function mod(a, n) { return ((a % n) + n) % n; }

  window.GardenSpiral = function (root, o) {
    o = o || {};
    var stage = root.querySelector('.spiral__stage');
    var empty = root.querySelector('.spiral__empty');
    var aside = root.parentNode;
    var cap = o.cap || null;
    var reduced = !!o.reduced;
    var gsap = o.gsap || null;
    var mq = window.matchMedia(MOBILE_MQ);

    var cfg, H = 0, slots = [], items = [], key = null;
    var offset = 0, vel = 0, hovering = false, visible = false, armed = false;
    var raf = 0, last = 0, capName = null, hoverCard = null;

    function readCfg() {
      cfg = mq.matches ? extend(DESKTOP, MOBILE) : DESKTOP;
      // Ajusta ao espaço: cards maiores e raio que preenche a largura da coluna
      var W = root.clientWidth;
      if (W) {
        var card = mq.matches ? Math.round(Math.min(96, Math.max(76, W * 0.22)))
          : Math.round(Math.min(160, Math.max(110, W * 0.3)));
        var R = Math.round(Math.max(90, W / 2 - card * cfg.centerScale / 2 - 6));
        cfg = extend(cfg, { cardWidth: card, cardHeight: card, radius: R, verticalSpacing: Math.round(card * 0.62) });
      }
      root.style.setProperty('--sp-w', cfg.cardWidth + 'px');
      root.style.setProperty('--sp-h', cfg.cardHeight + 'px');
      H = root.clientHeight || 600;
    }

    function slotCount() {
      var n = items.length;
      if (!n) return 0;
      var s = Math.ceil(H / cfg.verticalSpacing) + 4;
      // Múltiplo do nº de fotos: a sequência fecha sem emenda e cada foto aparece igual
      return Math.max(n, Math.ceil(s / n) * n);
    }

    function loadImg(slot) {
      if (!armed || slot.img.getAttribute('src') === slot.src) return;
      slot.img.classList.remove('is-in');
      slot.img.src = slot.src;
      if (slot.img.complete && slot.img.naturalWidth) slot.img.classList.add('is-in');
    }

    function build() {
      var n = slotCount();
      stage.innerHTML = '';
      slots = [];
      for (var k = 0; k < n; k++) {
        var it = items[k % items.length];
        var card = document.createElement('div');
        card.className = 'spiral__card';
        card.style.borderRadius = cfg.cardRadius + 'px';
        var img = document.createElement('img');
        img.alt = '';
        img.decoding = 'async';
        img.draggable = false;
        img.width = cfg.cardWidth; img.height = cfg.cardHeight;
        img.onload = function () { this.classList.add('is-in'); };
        card.appendChild(img);
        stage.appendChild(card);
        var slot = { el: card, img: img, item: it.item, name: it.name, src: it.src, f: '' };
        card._slot = slot;
        slots.push(slot);
        loadImg(slot);
      }
      var none = !items.length;
      empty.hidden = !none;
      aside.classList.toggle('is-empty', none);
      if (cap) cap.hidden = none;
      capName = null;
      render();
    }

    function render() {
      var n = slots.length;
      if (!n) return;
      var sp = cfg.verticalSpacing, R = cfg.radius, P = cfg.perspective;
      var span = n * sp, half = H / 2, step = TAU / cfg.cardsPerTurn;
      var rot = cfg.rotation * Math.PI / 180;
      var best = -1, bestName = null;
      for (var k = 0; k < n; k++) {
        var s = slots[k];
        var y = mod(k * sp - offset, span) - span / 2;
        var v = Math.min(1, Math.abs(y) / half);
        var op = v >= 1 ? 0 : (cfg.edgeFade > 0 ? Math.min(1, (1 - v) / cfg.edgeFade) : 1);
        if (op <= 0.01) {
          if (!s.off) { s.el.style.visibility = 'hidden'; s.off = true; }
          continue;
        }
        if (s.off) { s.el.style.visibility = ''; s.off = false; }
        var th = (y / sp) * step + rot;
        var x = Math.sin(th) * R, z = Math.cos(th) * R;
        var depth = P / (P - z);
        var front = (z / R + 1) / 2;
        var center = front * (1 - v);
        var sc = depth * (1 + (cfg.centerScale - 1) * center);
        op *= 0.4 + 0.6 * front;
        var tilt = cfg.cardTilt ? ' rotate(' + (Math.sin(th) * cfg.cardTilt) + 'deg)' : '';
        s.el.style.transform = 'translate3d(' + (x * depth).toFixed(1) + 'px,' + (y * depth).toFixed(1) + 'px,0) scale(' + sc.toFixed(3) + ')' + tilt;
        s.el.style.opacity = op.toFixed(3);
        s.el.style.zIndex = Math.round(z + R);
        // Filtros arredondados: só repinta quando o valor muda de verdade
        var blur = Math.round(cfg.edgeBlur * (1 - front) * 2) / 2;
        var gray = Math.round(cfg.grayscale * (1 - center) * 10) / 10;
        var f = (blur ? 'blur(' + blur + 'px) ' : '') + (gray ? 'grayscale(' + gray + ')' : '');
        if (f !== s.f) { s.el.style.filter = f; s.f = f; }
        if (center > best) { best = center; bestName = s.name; }
      }
      if (hoverCard) bestName = hoverCard._slot.name;
      if (cap && bestName !== capName) { capName = bestName; cap.textContent = bestName || ''; }
    }

    function tick(t) {
      raf = 0;
      if (!running()) { last = 0; return; }
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      var target = (hovering && cfg.pauseOnHover) ? 0 : cfg.speed * cfg.verticalSpacing;
      vel += (target - vel) * Math.min(1, dt * 4);
      if (Math.abs(vel) > 0.05) {
        offset += vel * dt * (cfg.direction === 'down' ? -1 : 1);
        render();
      }
      raf = requestAnimationFrame(tick);
    }
    function running() { return !reduced && visible && !document.hidden && slots.length > 0; }
    function play() { if (!raf && running()) raf = requestAnimationFrame(tick); }

    // Visível e perto da tela: arma o download das fotos e liga a animação
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible && !armed) { armed = true; slots.forEach(loadImg); }
        play();
      }, { rootMargin: '250px 0px' }).observe(root);
    } else { armed = visible = true; }
    document.addEventListener('visibilitychange', play);

    var wasMobile = mq.matches;
    var resizeT;
    window.addEventListener('resize', function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () {
        var oldN = slots.length, oldH = H;
        readCfg();
        if (mq.matches !== wasMobile || slotCount() !== oldN) { wasMobile = mq.matches; build(); }
        else if (H !== oldH) render();
        play();
      }, 150);
    });

    // Pausa com o mouse em cima; o card sob o mouse ganha cor e dá nome à legenda
    root.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hovering = true; });
    root.addEventListener('pointerleave', function () { hovering = false; setHover(null); play(); });
    root.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse') return;
      setHover(e.target.closest ? e.target.closest('.spiral__card') : null);
    });
    function setHover(card) {
      if (hoverCard === card) return;
      if (hoverCard) hoverCard.classList.remove('is-hover');
      hoverCard = card;
      if (card) card.classList.add('is-hover');
      render();
    }
    root.addEventListener('click', function (e) {
      var card = e.target.closest && e.target.closest('.spiral__card');
      if (card && o.onPick) o.onPick(card._slot.item);
    });

    readCfg();

    return {
      // list: pratos da categoria com foto. Fotos repetidas entre pratos entram uma vez.
      setItems: function (list, animate) {
        var seen = {}, next = [];
        (list || []).forEach(function (it) {
          var src = o.url ? o.url(it.img) : it.img;
          if (!src || seen[src]) return;
          seen[src] = 1;
          next.push({ src: src, name: it.n, item: it });
        });
        var k = next.map(function (x) { return x.src; }).join('|');
        if (k === key) return;
        key = k;
        var apply = function () { items = next; hoverCard = null; readCfg(); build(); play(); };
        if (gsap && animate && !reduced && slots.length) {
          gsap.to(stage, {
            autoAlpha: 0, scale: 0.94, duration: 0.22, ease: 'power1.in', overwrite: true, onComplete: function () {
              apply();
              gsap.fromTo(stage, { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.7, ease: 'expo.out' });
            }
          });
        } else {
          apply();
        }
      }
    };
  };
})();
