/* ================================================================
   CINEFLIX — ui.js
   Componentes visuales de la interfaz.
   Cada función construye y devuelve un elemento del DOM,
   o monta directamente en un nodo existente de index.html.
   ================================================================ */

import { abrirReproductor } from './player.js';

/* Imágenes de reemplazo cuando TMDB no devuelve poster/backdrop */
const PLACEHOLDER_POSTER   = 'https://placehold.co/150x225/141414/9b111e?text=CF';
const PLACEHOLDER_BACKDROP = 'https://placehold.co/300x169/141414/9b111e?text=CineFlix';

/* ── Toast de notificación ─────────────────────────────────── */
export function mostrarToast(mensaje) {
  const elementoToast = document.getElementById('cfToast');
  if (!elementoToast) return;
  elementoToast.textContent = mensaje;
  elementoToast.classList.add('is-show');
  clearTimeout(elementoToast._temporizador);
  elementoToast._temporizador = setTimeout(
    () => elementoToast.classList.remove('is-show'),
    2800
  );
}

/* ── Fila de skeletons (animación de carga) ────────────────── */
export function crearFilaDeSkeleton(cantidad = 8, variante = 'card') {
  const fila = document.createElement('div');
  fila.className = 'cf-row';
  for (let i = 0; i < cantidad; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = variante === 'top'
      ? 'cf-skeleton cf-skeleton-wide'
      : 'cf-skeleton';
    fila.appendChild(skeleton);
  }
  return fila;
}

/* ── Card estándar de película o serie ─────────────────────── */
export function crearCard(contenido) {
  const card = document.createElement('div');
  card.className = 'cf-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', contenido.titulo);

  const subtitulo = contenido.tipo === 'tv'
    ? 'Serie'
    : (contenido.generos?.[0] || '');

  card.innerHTML = `
    <img
      class="cf-card-poster"
      src="${contenido.poster || PLACEHOLDER_POSTER}"
      alt="${contenido.titulo}"
      loading="lazy"
      onerror="this.src='${PLACEHOLDER_POSTER}'"
    />
    <span class="cf-card-badge">★ ${contenido.nota || '–'}</span>
    <div class="cf-card-play"><i class="bi bi-play-circle-fill"></i></div>
    <div class="cf-card-info">
      <div class="cf-card-name">${contenido.titulo}</div>
      <div class="cf-card-sub">${contenido.anio || ''} · ${subtitulo}</div>
    </div>`;

  const abrir = () => abrirReproductor(contenido);
  card.addEventListener('click', abrir);
  card.addEventListener('keydown', evento => { if (evento.key === 'Enter') abrir(); });
  return card;
}

/* ── Card de Top-10 (formato horizontal con número grande) ─── */
export function crearCardTop10(contenido, posicion) {
  const card = document.createElement('div');
  card.className = 'cf-card-top';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  card.innerHTML = `
    <span class="cf-card-top-num">${posicion}</span>
    <img
      class="cf-card-top-img"
      src="${contenido.backdrop || PLACEHOLDER_BACKDROP}"
      alt="${contenido.titulo}"
      loading="lazy"
      onerror="this.src='${PLACEHOLDER_BACKDROP}'"
    />
    <div class="cf-card-top-info">
      <div class="cf-card-top-name">${contenido.titulo}</div>
      <div class="cf-card-top-sub">${contenido.generos?.[0] || ''} · ${contenido.anio || ''}</div>
    </div>`;

  const abrir = () => abrirReproductor(contenido);
  card.addEventListener('click', abrir);
  card.addEventListener('keydown', evento => { if (evento.key === 'Enter') abrir(); });
  return card;
}

/* ── Sección con título y fila horizontal de cards ─────────── */
export function crearSeccion(tituloSeccion, listaDeContenidos, variante = 'card') {
  const seccion = document.createElement('section');
  seccion.className = 'cf-row-wrap cf-section';
  seccion.innerHTML = `
    <div class="cf-row-head">
      <h2 class="cf-row-title">${tituloSeccion}</h2>
    </div>`;

  const filaDeCards = document.createElement('div');
  filaDeCards.className = 'cf-row';

  listaDeContenidos.slice(0, 20).forEach((contenido, indice) => {
    const card = variante === 'top'
      ? crearCardTop10(contenido, indice + 1)
      : crearCard(contenido);
    filaDeCards.appendChild(card);
  });

  seccion.appendChild(filaDeCards);
  return seccion;
}

/* ── Pantalla de carga con skeletons ───────────────────────── */
export function mostrarPantallaDeCarga(contenedor, variante = 'card') {
  contenedor.innerHTML = '';
  const seccionDeCarga = document.createElement('section');
  seccionDeCarga.className = 'cf-row-wrap cf-section';
  seccionDeCarga.innerHTML = '<div class="cf-row-head"><h2 class="cf-row-title">Cargando…</h2></div>';
  seccionDeCarga.appendChild(crearFilaDeSkeleton(8, variante));
  contenedor.appendChild(seccionDeCarga);
}

/* ── Pantalla de error con botón de reintento ──────────────── */
export function mostrarPantallaDeError(contenedor, funcionReintento) {
  contenedor.innerHTML = `
    <div class="cf-state-msg">
      <i class="bi bi-wifi-off"></i>
      <p>No se pudo conectar con el servidor de datos.<br>Verifica tu conexión a internet.</p>
      <button id="botonReintentar">Reintentar</button>
    </div>`;
  contenedor.querySelector('#botonReintentar')
    ?.addEventListener('click', funcionReintento);
}

/* ── Hero: slideshow de contenidos destacados ──────────────── */
export function inicializarHero(listaDestacados) {
  const fondoHero         = document.getElementById('heroBg');
  const tituloHero        = document.getElementById('heroTitulo');
  const metadatosHero     = document.getElementById('heroMeta');
  const sinopsisHero      = document.getElementById('heroSinopsis');
  const contenedorDots    = document.getElementById('heroDots');
  const botonReproducir   = document.getElementById('heroPlay');
  const etiquetaTipo      = document.getElementById('heroTag');

  if (!fondoHero) return;

  /* Solo usar los que tienen imagen de fondo */
  const destacados = listaDestacados.filter(c => c.backdrop).slice(0, 6);
  let indiceActual = 0;
  let temporizadorSlideshow = null;

  /* Crear los puntos de navegación */
  contenedorDots.innerHTML = '';
  destacados.forEach((_, indice) => {
    const punto = document.createElement('div');
    punto.className = 'cf-hero-dot' + (indice === 0 ? ' is-active' : '');
    punto.addEventListener('click', () => {
      irASlide(indice);
      reiniciarTemporizador();
    });
    contenedorDots.appendChild(punto);
  });

  /* Cambia el contenido del hero al slide indicado */
  function irASlide(indice) {
    indiceActual = (indice + destacados.length) % destacados.length;
    const contenido = destacados[indiceActual];

    fondoHero.style.backgroundImage = `url('${contenido.backdrop}')`;
    tituloHero.textContent  = contenido.titulo;
    sinopsisHero.textContent = contenido.sinopsis || '';

    if (etiquetaTipo) {
      etiquetaTipo.textContent = contenido.tipo === 'tv' ? '⬤ Serie' : '⬤ Película';
    }

    metadatosHero.innerHTML = [
      contenido.anio  && `<span>${contenido.anio}</span>`,
      contenido.nota  && `<span>★ ${contenido.nota}</span>`,
      ...(contenido.generos || []).slice(0, 2).map(g => `<span>${g}</span>`),
    ].filter(Boolean).join('');

    document.querySelectorAll('.cf-hero-dot')
      .forEach((punto, j) => punto.classList.toggle('is-active', j === indiceActual));

    botonReproducir.onclick = () => abrirReproductor(contenido);
  }

  function reiniciarTemporizador() {
    clearInterval(temporizadorSlideshow);
    temporizadorSlideshow = setInterval(
      () => irASlide(indiceActual + 1),
      7000
    );
  }

  irASlide(0);
  reiniciarTemporizador();

  /* Pausar el slideshow mientras el cursor está sobre el hero */
  const seccionHero = document.getElementById('heroSection');
  if (seccionHero) {
    seccionHero.addEventListener('mouseenter', () => clearInterval(temporizadorSlideshow));
    seccionHero.addEventListener('mouseleave', reiniciarTemporizador);
  }
}

/* ── Sidebar: lista de contenidos más populares ────────────── */
export function renderizarSidebar(listaDeContenidos) {
  const contenedorLista = document.getElementById('masVistosList');
  if (!contenedorLista) return;
  contenedorLista.innerHTML = '';

  [...listaDeContenidos]
    .sort((a, b) => (b.popularidad || 0) - (a.popularidad || 0))
    .slice(0, 8)
    .forEach((contenido, indice) => {
      const fila = document.createElement('div');
      fila.className = 'cf-watched-item';
      fila.innerHTML = `
        <span class="cf-watched-rank">${indice + 1}</span>
        <img
          class="cf-watched-img"
          src="${contenido.poster || PLACEHOLDER_POSTER}"
          alt="${contenido.titulo}"
          loading="lazy"
          onerror="this.src='${PLACEHOLDER_POSTER}'"
        />
        <div class="cf-watched-body">
          <div class="cf-watched-name">${contenido.titulo}</div>
          <div class="cf-watched-meta">★ ${contenido.nota || '–'} · ${contenido.anio || ''}</div>
        </div>`;
      fila.addEventListener('click', () => abrirReproductor(contenido));
      contenedorLista.appendChild(fila);
    });
}

/* ── Sidebar: chips de filtro por género ───────────────────── */
export function renderizarChipsDeGenero(listaDeGeneros, alSeleccionar) {
  const contenedorChips = document.getElementById('generoChips');
  if (!contenedorChips) return;
  contenedorChips.innerHTML = '';

  listaDeGeneros.forEach(genero => {
    const chip = document.createElement('button');
    chip.className   = 'cf-genre-chip';
    chip.textContent = genero.name || genero;
    chip.dataset.id  = genero.id  || '';

    chip.addEventListener('click', () => {
      contenedorChips.querySelectorAll('.cf-genre-chip')
        .forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      alSeleccionar(genero);
    });

    contenedorChips.appendChild(chip);
  });
}

/* ── Navbar: dropdown de categorías ────────────────────────── */
export function renderizarDropdownGeneros(listaDeGeneros, alSeleccionar) {
  const menuDropdown = document.getElementById('catDropdownMenu');
  if (!menuDropdown) return;
  menuDropdown.innerHTML = '';

  listaDeGeneros.forEach((genero, indice) => {
    /* Separador visual cada 6 géneros para mayor legibilidad */
    if (indice > 0 && indice % 6 === 0) {
      const separador = document.createElement('hr');
      separador.className = 'cf-dropdown-divider';
      menuDropdown.appendChild(separador);
    }

    const enlace = document.createElement('a');
    enlace.href      = '#';
    enlace.innerHTML = `<i class="bi bi-chevron-right"></i>${genero.name || genero}`;
    enlace.addEventListener('click', evento => {
      evento.preventDefault();
      alSeleccionar(genero);
    });
    menuDropdown.appendChild(enlace);
  });
}

/* ── Buscador en tiempo real con debounce ──────────────────── */
export function inicializarBuscador(funcionDeBusqueda) {
  const campoBusqueda    = document.getElementById('searchInput');
  const dropdownResultados = document.getElementById('searchDrop');
  if (!campoBusqueda || !dropdownResultados) return;

  let temporizadorDebounce = null;

  campoBusqueda.addEventListener('input', () => {
    const textoBusqueda = campoBusqueda.value.trim();
    dropdownResultados.innerHTML = '';
    clearTimeout(temporizadorDebounce);

    if (textoBusqueda.length < 2) {
      dropdownResultados.classList.remove('is-open');
      return;
    }

    /* Esperar 380ms desde que el usuario deja de escribir */
    temporizadorDebounce = setTimeout(async () => {
      try {
        const resultados = await funcionDeBusqueda(textoBusqueda);
        dropdownResultados.innerHTML = '';

        if (!resultados.length) {
          dropdownResultados.classList.remove('is-open');
          return;
        }

        resultados.slice(0, 10).forEach(contenido => {
          const fila = document.createElement('div');
          fila.className = 'cf-search-hit';
          fila.innerHTML = `
            <img
              src="${contenido.poster || PLACEHOLDER_POSTER}"
              alt="${contenido.titulo}"
              onerror="this.src='${PLACEHOLDER_POSTER}'"
            />
            <div>
              <div class="cf-search-hit-title">${contenido.titulo}</div>
              <div class="cf-search-hit-sub">
                ${contenido.anio || ''} · ${contenido.tipo === 'tv' ? 'Serie' : contenido.generos?.[0] || ''} · ★${contenido.nota || '–'}
              </div>
            </div>`;

          fila.addEventListener('click', () => {
            abrirReproductor(contenido);
            campoBusqueda.value = '';
            dropdownResultados.classList.remove('is-open');
          });

          dropdownResultados.appendChild(fila);
        });

        dropdownResultados.classList.add('is-open');
      } catch (_) {
        /* Fallo silencioso — la búsqueda simplemente no muestra resultados */
      }
    }, 380);
  });

  /* Cerrar el dropdown al hacer clic fuera del buscador */
  document.addEventListener('click', evento => {
    if (!evento.target.closest('.cf-search')) {
      dropdownResultados.classList.remove('is-open');
    }
  });
}
