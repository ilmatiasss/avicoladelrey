(() => {
  'use strict';

  /* ------------------------------------------------------------------
     Configuración
     ------------------------------------------------------------------ */

  // Número de WhatsApp en formato internacional, sin "+" ni espacios.
  // Ejemplo: '56912345678'. Si queda vacío, WhatsApp pedirá elegir el contacto.
  const WHATSAPP_NUMBER = '';

  // Pago con tarjeta vía Klap. Por ahora es solo una maqueta: no está conectado
  // a Klap, simula el pago y luego envía el pedido por WhatsApp.
  const KLAP_PAYMENT = 'Tarjeta vía Klap';

  const FREE_SHIPPING_TRAYS = 3;
  const WHOLESALE_MIN_BOXES = 2;

  const CALIBRES = {
    tercera: { name: 'Tercera', range: '40–46 g', weight: 43,
      use: 'Repostería, masas y preparaciones. La opción más económica.' },
    segunda: { name: 'Segunda', range: '47–53 g', weight: 50,
      use: 'Cocina diaria, amasanderías y almacenes.' },
    primera: { name: 'Primera', range: '54–60 g', weight: 57,
      use: 'El tamaño estándar para la casa.' },
    extra:   { name: 'Extra',   range: '61–67 g', weight: 64,
      use: 'Desayunos, huevos a la vista y platos de restorán.' },
    super:   { name: 'Súper',   range: '68–73 g', weight: 70.5,
      use: 'Más rendimiento por unidad.' },
    jumbo:   { name: 'Jumbo',   range: '73 g o más', weight: 77,
      use: 'El más grande de nuestra selección.' },
  };

  const TRAYS = [
    { id: 'b-tercera', cal: 'tercera', eggs: 30, price: 3900, promo: true },
    { id: 'b-segunda', cal: 'segunda', eggs: 30, price: 5490 },
    { id: 'b-primera', cal: 'primera', eggs: 30, price: 6490 },
    { id: 'b-extra',   cal: 'extra',   eggs: 20, price: 5990 },
    { id: 'b-super',   cal: 'super',   eggs: 20, price: 6990 },
    { id: 'b-jumbo',   cal: 'jumbo',   eggs: 20, price: 9990 },
  ];

  const BOXES = [
    { id: 'c-super',   cal: 'super',   eggs: 100, wholesale: 26990, retail: 32990 },
    { id: 'c-extra',   cal: 'extra',   eggs: 100, wholesale: 23990, retail: 29990 },
    { id: 'c-segunda', cal: 'segunda', eggs: 180, wholesale: 28990, retail: 32990 },
    { id: 'c-primera', cal: 'primera', eggs: 180, wholesale: 32990, retail: 37990 },
  ];

  // Comunas completamente dentro del Anillo Américo Vespucio
  const COMUNAS_IN = [
    'Cerrillos', 'Estación Central', 'Independencia', 'La Cisterna', 'La Granja',
    'Lo Espejo', 'Lo Prado', 'Macul', 'Ñuñoa', 'Pedro Aguirre Cerda', 'Providencia',
    'Quinta Normal', 'Recoleta', 'San Joaquín', 'San Miguel', 'San Ramón', 'Santiago',
  ];
  // Comunas que el anillo atraviesa: depende de la dirección
  const COMUNAS_PARTIAL = [
    'Cerro Navia', 'Conchalí', 'Huechuraba', 'La Florida', 'La Reina', 'Las Condes',
    'Maipú', 'Peñalolén', 'Pudahuel', 'Quilicura', 'Renca', 'Vitacura',
  ];
  const OTHER = '__otra';

  const PRODUCTS = Object.fromEntries(
    [...TRAYS.map(p => ({ ...p, type: 'tray' })), ...BOXES.map(p => ({ ...p, type: 'box' }))]
      .map(p => [p.id, p])
  );

  /* ------------------------------------------------------------------
     Utilidades
     ------------------------------------------------------------------ */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clp = n => '$' + Math.round(n).toLocaleString('es-CL');

  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento */ }
    },
  };

  const EGG_PATH = 'M50 4C76 4 94 50 94 82c0 27-19 44-44 44S6 109 6 82C6 50 24 4 50 4Z';
  // Tamaño relativo al Jumbo. Se acentúa levemente la diferencia para que sea legible.
  const eggScale = cal => Math.pow(CALIBRES[cal].weight / CALIBRES.jumbo.weight, 0.6);
  const eggSVG = (cal, maxWidth) => {
    const w = (maxWidth * eggScale(cal)).toFixed(1);
    return `<svg viewBox="0 0 100 130" width="${w}" aria-hidden="true">
      <path d="${EGG_PATH}" fill="url(#g-shell)"/>
      <ellipse cx="36" cy="44" rx="10" ry="15" fill="#fff" opacity=".25" transform="rotate(18 36 44)"/>
    </svg>`;
  };

  const productName = p => `${p.type === 'tray' ? 'Bandeja' : 'Caja'} ${CALIBRES[p.cal].name}`;

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Estado del pedido
     ------------------------------------------------------------------ */

  let cart = store.get('adr-cart', {});
  for (const id of Object.keys(cart)) {
    if (!PRODUCTS[id] || !(cart[id] > 0)) delete cart[id];
  }

  function setQty(id, qty) {
    qty = Math.max(0, Math.min(99, qty));
    if (qty === 0) delete cart[id]; else cart[id] = qty;
    store.set('adr-cart', cart);
    render();
  }

  function summary() {
    let trays = 0, boxes = 0;
    for (const [id, qty] of Object.entries(cart)) {
      if (PRODUCTS[id].type === 'tray') trays += qty; else boxes += qty;
    }
    const wholesale = boxes >= WHOLESALE_MIN_BOXES;
    let subtotal = 0, savings = 0;
    const lines = Object.entries(cart).map(([id, qty]) => {
      const p = PRODUCTS[id];
      let unit;
      if (p.type === 'tray') unit = p.price;
      else {
        unit = wholesale ? p.wholesale : p.retail;
        if (wholesale) savings += (p.retail - p.wholesale) * qty;
      }
      subtotal += unit * qty;
      return { p, qty, unit, total: unit * qty };
    });
    const items = trays + boxes;
    const freeShipping = boxes >= 1 || trays >= FREE_SHIPPING_TRAYS;
    return { lines, trays, boxes, items, wholesale, subtotal, savings, freeShipping };
  }

  function comunaZone(comuna) {
    if (!comuna) return null;
    if (COMUNAS_IN.includes(comuna)) return 'in';
    if (COMUNAS_PARTIAL.includes(comuna)) return 'partial';
    return 'out';
  }

  /* ------------------------------------------------------------------
     Productos
     ------------------------------------------------------------------ */

  const TRAY_IMG = { tercera: 'segunda', segunda: 'segunda', primera: 'primera', extra: 'extra', super: 'super', jumbo: 'jumbo' };

  function trayCard(p) {
    const c = CALIBRES[p.cal];
    return `
      <article class="tray product" data-id="${p.id}">
        ${p.promo ? '<span class="badge">Promoción</span>' : ''}
        <img class="tray__img" src="assets/img/bandeja-${TRAY_IMG[p.cal]}.jpg" alt="Bandeja de huevos ${c.name}" width="336" height="234" loading="lazy">
        <h3 class="p-name">${c.name}</h3>
        <p class="p-qty">${p.eggs} huevos</p>
        <p class="p-grams">(${c.range})</p>
        <div class="tray__price">${clp(p.price)}<span class="tray__unit">${clp(p.price / p.eggs)} por huevo</span></div>
        <div class="tray__action" data-foot></div>
      </article>`;
  }

  function boxCard(p) {
    const c = CALIBRES[p.cal];
    return `
      <article class="box-row product" data-id="${p.id}">
        <img class="box-row__img" src="assets/img/caja-${p.eggs}.jpg" alt="Caja Avícola del Rey de ${p.eggs} huevos" width="356" height="238" loading="lazy">
        <div class="box-row__info">
          <h3 class="p-name">${c.name}</h3>
          <p class="p-qty">${p.eggs} huevos</p>
          <p class="p-grams">(${c.range})</p>
        </div>
        <div class="price-box price-box--wh" data-tier="wholesale">
          <span class="price-box__label">Mayorista · 2+ cajas</span>
          <span class="price-box__amount">${clp(p.wholesale)}</span>
          <span class="price-box__unit">${clp(p.wholesale / p.eggs)} por huevo</span>
        </div>
        <div class="price-box price-box--rt" data-tier="retail">
          <span class="price-box__label">Detalle · 1 caja</span>
          <span class="price-box__amount">${clp(p.retail)}</span>
          <span class="price-box__unit">${clp(p.retail / p.eggs)} por huevo</span>
        </div>
        <div class="box-row__action" data-foot></div>
      </article>`;
  }

  $('[data-products="bandejas"]').innerHTML = TRAYS.map(trayCard).join('');
  $('[data-products="cajas"]').innerHTML = BOXES.map(boxCard).join('');

  function renderCards(s) {
    for (const card of $$('.product[data-id]')) {
      const id = card.dataset.id;
      const p = PRODUCTS[id];
      const qty = cart[id] || 0;
      const foot = $('[data-foot]', card);
      card.classList.toggle('is-in-cart', qty > 0);

      if (p.type === 'box') {
        const wh = $('[data-tier="wholesale"]', card);
        const rt = $('[data-tier="retail"]', card);
        // Marca el precio que se está cobrando, solo en las cajas que están en el pedido
        wh.classList.toggle('is-active', qty > 0 && s.wholesale);
        rt.classList.toggle('is-active', qty > 0 && !s.wholesale);
        rt.classList.toggle('is-dim', s.wholesale);
      }

      const state = qty > 0 ? 'qty' : 'add';
      if (foot.dataset.state !== state) {
        foot.dataset.state = state;
        foot.innerHTML = state === 'add'
          ? `<button class="btn btn--gold btn--sm" type="button" data-add>Agregar</button>`
          : `<div class="stepper" role="group" aria-label="Cantidad de ${productName(p)}">
               <button type="button" data-dec aria-label="Quitar uno">−</button>
               <output data-qty></output>
               <button type="button" data-inc aria-label="Agregar uno">+</button>
             </div>
             ${p.type === 'box' ? '<span class="box-row__line" data-line></span>' : ''}`;
      }
      if (state === 'qty') {
        $('[data-qty]', foot).textContent = qty;
        const line = $('[data-line]', foot);
        if (line) {
          const unit = s.wholesale ? p.wholesale : p.retail;
          line.innerHTML = `En tu pedido · <b>${clp(unit * qty)}</b>`;
        }
      }
    }
  }

  document.addEventListener('click', e => {
    const card = e.target.closest('.product[data-id]');
    if (!card) return;
    const id = card.dataset.id;
    if (e.target.closest('[data-add]')) {
      setQty(id, 1);
      $('[data-inc]', card)?.focus();
      layEgg();
    } else if (e.target.closest('[data-inc]')) {
      setQty(id, (cart[id] || 0) + 1);
      layEgg();
    } else if (e.target.closest('[data-dec]')) {
      setQty(id, (cart[id] || 0) - 1);
      if (!cart[id]) $('[data-add]', card)?.focus();
    }
  });

  /* ------------------------------------------------------------------
     Gallina animada
     ------------------------------------------------------------------ */

  const hen = $('[data-hen]');
  const henEggs = $('[data-hen-eggs]');
  const henBubble = $('[data-hen-bubble]');
  const HEN_SAYS = ['¡Pok!', '¡Cocorocó!', '¡Uno más!', '¡Fresquito!'];
  // Donde quedan los huevos dentro del nido (coordenadas del SVG)
  const EGG_SPOTS = [[158, 126], [176, 129], [141, 130]];
  let eggsLaid = 0;
  let laying = false;

  function layEgg() {
    if (!hen || laying) return;
    laying = true;
    hen.classList.add('is-laying');

    henBubble.textContent = HEN_SAYS[eggsLaid % HEN_SAYS.length];
    henBubble.classList.remove('is-visible');
    void henBubble.offsetWidth;
    henBubble.classList.add('is-visible');

    setTimeout(() => {
      const [x, y] = EGG_SPOTS[eggsLaid % EGG_SPOTS.length];
      const egg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      egg.setAttribute('class', 'hen__egg');
      egg.innerHTML = '<ellipse rx="10" ry="12.5" fill="url(#g-shell)"/><ellipse cx="-3.5" cy="-4.5" rx="2.8" ry="4" fill="#fff" opacity=".35"/>';
      henEggs.appendChild(egg);
      if (henEggs.children.length > EGG_SPOTS.length) {
        const old = henEggs.firstElementChild;
        old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).onfinish = () => old.remove();
      }
      eggsLaid++;
      if (reduceMotion) {
        egg.style.transform = `translate(${x}px, ${y}px)`;
        return;
      }
      egg.animate([
        { transform: 'translate(136px, 112px) scale(.3)', opacity: 0 },
        { transform: 'translate(140px, 120px) scale(1)', opacity: 1, offset: .25 },
        { transform: `translate(${(140 + x) / 2}px, ${y - 12}px) rotate(120deg)`, offset: .55 },
        { transform: `translate(${x}px, ${y}px) rotate(300deg)`, offset: .8 },
        { transform: `translate(${x}px, ${y - 3}px) rotate(330deg)`, offset: .9 },
        { transform: `translate(${x}px, ${y}px) rotate(360deg)` },
      ], { duration: 900, easing: 'ease-out', fill: 'forwards' });
    }, reduceMotion ? 0 : 600);

    setTimeout(() => {
      hen.classList.remove('is-laying');
      laying = false;
    }, reduceMotion ? 300 : 1300);
  }

  if (hen) {
    hen.addEventListener('click', layEgg);
    // Cuando la gallina está a la vista, pone un huevo de vez en cuando
    let henVisible = false;
    new IntersectionObserver(([entry]) => { henVisible = entry.isIntersecting; }).observe(hen);
    if (!reduceMotion) setInterval(() => { if (henVisible && !document.hidden) layEgg(); }, 9000);
  }

  /* ------------------------------------------------------------------
     Banner: mini huevitos que suben
     ------------------------------------------------------------------ */

  const dust = $('[data-dust]');
  if (dust && !reduceMotion) {
    const rnd = (min, max) => (min + Math.random() * (max - min)).toFixed(1);
    dust.innerHTML = Array.from({ length: 16 }, () => {
      const w = rnd(7, 15);
      const r0 = rnd(-40, 40);
      return `<i class="${Math.random() < .3 ? 'is-white' : ''}" style="left:${rnd(0, 100)}%;width:${w}px;height:${(w * 1.28).toFixed(1)}px;` +
        `--r0:${r0}deg;--r1:${(+r0 + +rnd(-160, 160)).toFixed(1)}deg;--sway:${rnd(-30, 30)}px;` +
        `animation-duration:${rnd(8, 15)}s;animation-delay:-${rnd(0, 14)}s"></i>`;
    }).join('');
  }

  /* ------------------------------------------------------------------
     Guía de calibres
     ------------------------------------------------------------------ */

  const FORMATS = {};
  for (const p of TRAYS) (FORMATS[p.cal] ||= []).push(`Bandeja ${p.eggs}`);
  for (const p of BOXES) (FORMATS[p.cal] ||= []).push(`Caja ${p.eggs}`);

  $('[data-scale]').innerHTML = Object.entries(CALIBRES).map(([key, c]) => `
    <div class="scale__item">
      <div class="scale__egg">${eggSVG(key, 84)}</div>
      <h3 class="scale__name">${c.name}</h3>
      <p class="scale__grams">${c.range}</p>
      <p class="scale__use">${c.use}</p>
      <div class="scale__formats">${(FORMATS[key] || []).map(f => `<span class="chip">${f}</span>`).join('')}</div>
    </div>`).join('');

  /* ------------------------------------------------------------------
     Comunas
     ------------------------------------------------------------------ */

  const comunaOptions = `
    <optgroup label="Dentro del Anillo Vespucio">
      ${COMUNAS_IN.map(c => `<option>${c}</option>`).join('')}
    </optgroup>
    <optgroup label="Parcialmente dentro del anillo">
      ${COMUNAS_PARTIAL.map(c => `<option>${c}</option>`).join('')}
    </optgroup>
    <option value="${OTHER}">Otra comuna</option>`;

  const checker = $('[data-comuna-checker]');
  const comunaSelect = $('[data-comuna-select]');
  checker.insertAdjacentHTML('beforeend', comunaOptions);
  comunaSelect.insertAdjacentHTML('beforeend', comunaOptions);

  const icon = name => `<svg class="icon"><use href="#i-${name}"/></svg>`;

  checker.addEventListener('change', () => {
    const zone = comunaZone(checker.value);
    const name = checker.value;
    const out = $('[data-checker-result]');
    if (!zone) { out.innerHTML = ''; return; }
    out.innerHTML = {
      in: `<div class="result result--ok">${icon('check')}<div><strong>Sí, llegamos a ${name}.</strong>Envío gratis desde 3 bandejas o 1 caja.</div></div>`,
      partial: `<div class="result result--maybe">${icon('pin')}<div><strong>${name} está en el límite del anillo.</strong>Si tu dirección queda dentro de Américo Vespucio, el envío es gratis. Te lo confirmamos al recibir el pedido.</div></div>`,
      out: `<div class="result result--out">${icon('truck')}<div><strong>Tu comuna está fuera de la zona de envío gratis.</strong>Escríbenos y coordinamos el despacho o retiro.</div></div>`,
    }[zone];
  });

  /* ------------------------------------------------------------------
     Carrito
     ------------------------------------------------------------------ */

  const drawer = $('[data-drawer]');
  const panel = $('.drawer__panel', drawer);
  const form = $('[data-order-form]');
  let lastFocus = null;

  function openCart() {
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    panel.focus();
  }
  function closeCart() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    lastFocus?.focus?.();
  }
  $$('[data-open-cart]').forEach(b => b.addEventListener('click', openCart));
  // "Hacer mi pedido": abre el carrito si ya tiene productos; si no, baja a los precios
  $$('[data-open-cart-if-items]').forEach(a => a.addEventListener('click', e => {
    if (summary().items > 0) { e.preventDefault(); openCart(); }
  }));
  $$('[data-close-cart]').forEach(b => b.addEventListener('click', closeCart));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeCart();
  });

  $('[data-cart-list]').addEventListener('click', e => {
    const row = e.target.closest('[data-id]');
    if (!row) return;
    const id = row.dataset.id;
    if (e.target.closest('[data-inc]')) setQty(id, cart[id] + 1);
    else if (e.target.closest('[data-dec]')) setQty(id, cart[id] - 1);
    else if (e.target.closest('[data-remove]')) setQty(id, 0);
  });

  function shippingInfo(s) {
    const zone = comunaZone(comunaSelect.value);
    if (!s.freeShipping || zone === 'out') return { label: 'A coordinar', free: false, zone };
    return { label: zone === 'partial' ? 'Gratis*' : 'Gratis', free: true, zone };
  }

  function renderCart(s) {
    drawer.classList.toggle('is-empty', s.items === 0);

    $('[data-cart-list]').innerHTML = s.lines.map(({ p, qty, unit, total }) => {
      const c = CALIBRES[p.cal];
      const tier = p.type === 'box' ? (s.wholesale ? ' · mayorista' : ' · detalle') : '';
      return `
        <li class="cart-item" data-id="${p.id}">
          <div>
            <div class="cart-item__name">${productName(p)}</div>
            <div class="cart-item__meta">${p.eggs} huevos · ${c.range} · ${clp(unit)} c/u${tier}</div>
          </div>
          <div class="cart-item__price">${clp(total)}</div>
          <div class="cart-item__row">
            <div class="stepper stepper--sm" role="group" aria-label="Cantidad">
              <button type="button" data-dec aria-label="Quitar uno">−</button>
              <output>${qty}</output>
              <button type="button" data-inc aria-label="Agregar uno">+</button>
            </div>
            <button class="cart-item__remove" type="button" data-remove>Eliminar</button>
          </div>
        </li>`;
    }).join('');

    const ship = shippingInfo(s);
    const hints = [];
    if (s.boxes === 1) {
      const p = s.lines.find(l => l.p.type === 'box').p;
      hints.push(['box', `Con 1 caja más, todas pasan a <b>precio mayorista</b>: tu ${productName(p)} baja a ${clp(p.wholesale)}.`]);
    } else if (s.wholesale) {
      hints.push(['check', `Precio mayorista aplicado a tus ${s.boxes} cajas.`, true]);
    }
    if (!s.freeShipping) {
      const missing = FREE_SHIPPING_TRAYS - s.trays;
      hints.push(['truck', `Agrega ${missing} bandeja${missing > 1 ? 's' : ''} más o 1 caja y el <b>envío es gratis</b>.`]);
    } else if (ship.zone === 'partial') {
      hints.push(['pin', `${comunaSelect.value} está en el límite del anillo: confirmaremos el envío gratis según tu dirección.`]);
    } else if (ship.zone === 'out') {
      hints.push(['pin', 'Tu comuna está fuera de la zona de envío gratis. Coordinaremos el despacho por WhatsApp.']);
    } else {
      hints.push(['check', 'Tu pedido tiene <b>envío gratis</b> dentro del Anillo Vespucio.', true]);
    }
    $('[data-cart-hints]').innerHTML = hints
      .map(([ic, text, ok]) => `<div class="hint${ok ? ' hint--ok' : ''}">${icon(ic)}<span>${text}</span></div>`)
      .join('');

    $('[data-subtotal]').textContent = clp(s.subtotal + s.savings);
    $('[data-savings-row]').hidden = s.savings === 0;
    $('[data-savings]').textContent = '−' + clp(s.savings);
    $('[data-shipping]').textContent = ship.label;
    $('[data-total]').textContent = clp(s.subtotal);
    renderPayButton(s);
  }

  function render() {
    const s = summary();
    renderCards(s);
    renderCart(s);
    $$('[data-cart-count]').forEach(el => { el.textContent = s.items; });
    $('[data-cart-total]').textContent = clp(s.subtotal);
    $('[data-cart-items]').textContent = `${s.items} producto${s.items === 1 ? '' : 's'}`;
    $('.mobile-bar').hidden = s.items === 0;
    document.body.classList.toggle('has-cart', s.items > 0);
  }

  /* ------------------------------------------------------------------
     Formulario y envío por WhatsApp
     ------------------------------------------------------------------ */

  const saved = store.get('adr-customer', {});
  for (const name of ['nombre', 'direccion', 'comuna', 'pago']) {
    if (!saved[name]) continue;
    const el = form.elements[name];
    if (el) el.value = saved[name];
  }

  form.addEventListener('input', e => {
    e.target.closest('.field')?.classList.remove('is-invalid');
    if (e.target === comunaSelect) render();
  });
  form.addEventListener('change', e => { if (e.target === comunaSelect) render(); });

  const waLink = text =>
    `https://wa.me/${WHATSAPP_NUMBER}${text ? '?text=' + encodeURIComponent(text) : ''}`;

  $$('[data-whatsapp-link]').forEach(a => {
    a.href = waLink('Hola Avícola del Rey, tengo una consulta.');
  });

  const isKlap = () => form.elements.pago.value === KLAP_PAYMENT;

  function renderPayButton(s = summary()) {
    const klap = isKlap();
    $('[data-klap-note]').hidden = !klap;
    $('[data-send-label]').textContent = klap ? `Pagar con Klap · ${clp(s.subtotal)}` : 'Enviar pedido por WhatsApp';
    $('[data-send-icon] use').setAttribute('href', klap ? '#i-lock' : '#i-whatsapp');
    $('[data-send-order]').classList.toggle('btn--klap', klap);
  }
  form.addEventListener('change', e => { if (e.target.name === 'pago') renderPayButton(); });

  // Valida el formulario y devuelve los datos, o null si falta algo
  function readForm() {
    const errorEl = $('[data-form-error]');
    const data = Object.fromEntries(new FormData(form));
    const missing = ['nombre', 'direccion', 'comuna'].filter(k => !String(data[k] || '').trim());

    for (const k of ['nombre', 'direccion', 'comuna']) {
      form.elements[k].closest('.field').classList.toggle('is-invalid', missing.includes(k));
    }
    if (missing.length) {
      errorEl.textContent = 'Completa tu nombre, dirección y comuna para enviar el pedido.';
      form.elements[missing[0]].focus();
      return null;
    }
    errorEl.textContent = '';

    store.set('adr-customer', {
      nombre: data.nombre, direccion: data.direccion, comuna: data.comuna, pago: data.pago,
    });
    return data;
  }

  function sendOrder(data, payment) {
    const s = summary();
    const ship = shippingInfo(s);
    const comuna = data.comuna === OTHER ? 'Otra comuna (indicar)' : data.comuna;

    const lines = [
      'Hola Avícola del Rey, quiero hacer el siguiente pedido:',
      '',
      ...s.lines.map(({ p, qty, total }) => {
        const tier = p.type === 'box' ? (s.wholesale ? ', mayorista' : ', detalle') : '';
        return `• ${qty} × ${productName(p)} (${p.eggs} huevos${tier}): ${clp(total)}`;
      }),
      '',
      s.savings ? `Ahorro mayorista: −${clp(s.savings)}` : null,
      `Total productos: ${clp(s.subtotal)}`,
      `Envío: ${ship.free ? (ship.zone === 'partial' ? 'Gratis (confirmar dirección)' : 'Gratis') : 'A coordinar'}`,
      '',
      `Nombre: ${data.nombre.trim()}`,
      `Dirección: ${data.direccion.trim()}, ${comuna}`,
      `Pago: ${payment}`,
      data.notas.trim() ? `Comentarios: ${data.notas.trim()}` : null,
    ].filter(l => l !== null);

    window.open(waLink(lines.join('\n')), '_blank', 'noopener');
  }

  /* ---------- Klap (maqueta) ---------- */

  const klap = $('[data-klap]');
  let klapOrder = null;
  let klapTimer = null;

  function klapStep(name) {
    $$('[data-klap-step]', klap).forEach(el => { el.hidden = el.dataset.klapStep !== name; });
  }

  function openKlap(data) {
    const s = summary();
    klapOrder = data;
    klapStep('review');
    $$('[data-klap-total]', klap).forEach(el => { el.textContent = clp(s.subtotal); });
    $('[data-klap-items]', klap).textContent = `${s.items} producto${s.items === 1 ? '' : 's'}`;
    klap.showModal();
  }

  $('[data-klap-pay]').addEventListener('click', () => {
    klapStep('processing');
    klapTimer = setTimeout(() => {
      $('[data-klap-code]', klap).textContent = 'DEMO-' + String(Math.floor(100000 + Math.random() * 900000));
      klapStep('done');
      $('[data-klap-finish]', klap).focus();
    }, 1800);
  });

  $('[data-klap-finish]').addEventListener('click', () => {
    const method = klap.querySelector('[name="klap-method"]:checked').value.toLowerCase();
    sendOrder(klapOrder, `${KLAP_PAYMENT} (${method}) · pago simulado, sin cobro real`);
    klap.close();
  });

  $('[data-klap-close]').addEventListener('click', () => klap.close());
  klap.addEventListener('close', () => clearTimeout(klapTimer));
  klap.addEventListener('click', e => { if (e.target === klap) klap.close(); });

  $('[data-send-order]').addEventListener('click', () => {
    const data = readForm();
    if (!data) return;
    if (data.pago === KLAP_PAYMENT) openKlap(data);
    else sendOrder(data, data.pago);
  });

  $('[data-year]').textContent = new Date().getFullYear();

  render();
})();
