/* ================================================================
   CINEFLIX — player.js
   Controla el modal del reproductor.

   Flujo:
   1. El usuario hace clic en una card → se llama abrirReproductor()
   2. Se muestra el modal con la info básica y el spinner de carga
   3. Se construyen los botones de servidor y se carga el primero
   4. En segundo plano se pide el detalle completo a TMDB
      (para mostrar duración real y habilitar más fuentes)
   5. El usuario puede cambiar de servidor si el actual falla

   Servidores ordenados por estabilidad histórica:
   - Servidor 1: vidsrc.cc  — 5+ años, acepta TMDB ID, color personalizable
   - Servidor 2: vidsrc.me  — base de datos masiva, muy estable
   - Servidor 3: 2embed.cc  — respaldo confiable
   - Servidor 4: embed.su   — respaldo adicional
   ================================================================ */

import { obtenerDetallePelicula, obtenerDetalleSerie } from './api.js';

/* ── Referencias al DOM del modal ─────────────────────────── */
const modalOverlay         = document.getElementById('playerOverlay');
const barraDeServidores    = document.getElementById('sourceBar');
const contenedorDelPlayer  = document.getElementById('cf-jwplayer-wrap');
const spinnerDeCarga       = document.getElementById('cfSpinner');
const mensajeDeError       = document.getElementById('cfPlayerError');
const tituloEnModal        = document.getElementById('infoTitulo');
const metadatosEnModal     = document.getElementById('infoMeta');
const notaEnModal          = document.getElementById('infoNota');
const sinopsisEnModal      = document.getElementById('infoSinopsis');
const botonCerrarModal     = document.getElementById('playerCerrar');

/* ── Estado interno del reproductor ───────────────────────── */
let iframeActual      = null;   // iframe del stream activo
let contenidoActual   = null;   // objeto película/serie que se está reproduciendo

/* Color carmesí de la marca para personalizar los embeds */
const COLOR_MARCA = '9b111e';

/* ── Construye la lista de servidores para un contenido ────── */
function construirListaDeServidores(contenido) {
  const idTMDB    = contenido.tmdb;
  const tipoMedia = contenido.tipo === 'tv' ? 'tv' : 'movie';

  return [
    {
      nombre: 'Servidor 1',
      url:    `https://vidsrc.cc/v2/embed/${tipoMedia}/${idTMDB}?autoPlay=true&color=${COLOR_MARCA}`,
    },
    {
      nombre: 'Servidor 2',
      url:    `https://vidsrc.me/embed/${tipoMedia}?tmdb=${idTMDB}`,
    },
    {
      nombre: 'Servidor 3',
      url:    tipoMedia === 'movie'
                ? `https://www.2embed.cc/embed/${idTMDB}`
                : `https://www.2embed.cc/embedtv/${idTMDB}`,
    },
    {
      nombre: 'Servidor 4',
      url:    `https://embed.su/embed/${tipoMedia}/${idTMDB}`,
    },
  ];
}

/* ── Abre el modal y empieza la reproducción ───────────────── */
export async function abrirReproductor(contenido) {
  contenidoActual = { ...contenido };

  /* Mostrar modal */
  modalOverlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  /* Pintar info básica y arrancar el primer servidor */
  actualizarInfoEnModal(contenidoActual);
  activarSpinner(true);
  ocultarMensajeDeError();

  const servidores = construirListaDeServidores(contenidoActual);
  renderizarBarraDeServidores(servidores);
  cargarServidor(servidores[0]);

  /* Pedir el detalle completo en segundo plano para obtener
     duración real, IMDB ID y géneros completos */
  try {
    const detalle = contenidoActual.tipo === 'tv'
      ? await obtenerDetalleSerie(contenidoActual.tmdb)
      : await obtenerDetallePelicula(contenidoActual.tmdb);

    Object.assign(contenidoActual, detalle);
    actualizarInfoEnModal(contenidoActual);
  } catch (_) {
    /* Si el detalle falla, la info básica ya está pintada — no pasa nada */
  }
}

/* ── Escribe la info del contenido en el modal ─────────────── */
function actualizarInfoEnModal(contenido) {
  tituloEnModal.textContent   = contenido.titulo   || '–';
  notaEnModal.textContent     = contenido.nota     ? `★ ${contenido.nota}` : '';
  sinopsisEnModal.textContent = contenido.sinopsis || '';

  const chipsDeMetadatos = [
    contenido.anio     && `<span class="chip">${contenido.anio}</span>`,
    contenido.duracion && `<span class="chip">${contenido.duracion}</span>`,
    contenido.tipo === 'tv' && `<span class="chip">Serie</span>`,
    ...(contenido.generos || []).slice(0, 4).map(genero => `<span class="chip">${genero}</span>`),
  ].filter(Boolean).join('');

  metadatosEnModal.innerHTML = chipsDeMetadatos;
}

/* ── Dibuja los botones de selección de servidor ───────────── */
function renderizarBarraDeServidores(servidores) {
  barraDeServidores.innerHTML = '<span class="cf-source-label"><i class="bi bi-broadcast"></i> Servidor:</span>';

  servidores.forEach((servidor, indice) => {
    const boton = document.createElement('button');
    boton.className   = 'cf-source-btn' + (indice === 0 ? ' is-active' : '');
    boton.textContent = servidor.nombre;

    boton.addEventListener('click', () => {
      barraDeServidores.querySelectorAll('.cf-source-btn')
        .forEach(btn => btn.classList.remove('is-active'));
      boton.classList.add('is-active');
      ocultarMensajeDeError();
      activarSpinner(true);
      cargarServidor(servidor);
    });

    barraDeServidores.appendChild(boton);
  });
}

/* ── Carga un servidor en el iframe ────────────────────────── */
function cargarServidor(servidor) {
  /* Eliminar el iframe anterior para cortar el stream previo */
  if (iframeActual) {
    iframeActual.remove();
    iframeActual = null;
  }

  /* Crear el iframe con la URL del servidor */
  iframeActual = document.createElement('iframe');
  iframeActual.src             = servidor.url;
  iframeActual.allowFullscreen = true;
  iframeActual.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture');
  iframeActual.setAttribute('referrerpolicy', 'no-referrer');
  iframeActual.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;z-index:1;';

  /* Ocultar spinner cuando el iframe termina de cargar */
  iframeActual.addEventListener('load', () => activarSpinner(false), { once: true });

  /* Si el iframe no carga en 15 segundos, mostrar error */
  const temporizadorDeError = setTimeout(() => {
    if (spinnerDeCarga.style.display !== 'none') {
      activarSpinner(false);
      mostrarMensajeDeError();
    }
  }, 15000);

  iframeActual.addEventListener('load', () => clearTimeout(temporizadorDeError), { once: true });

  contenedorDelPlayer.appendChild(iframeActual);
}

/* ── Muestra u oculta el spinner de carga ──────────────────── */
function activarSpinner(mostrar) {
  spinnerDeCarga.style.display = mostrar ? 'flex' : 'none';
}

function mostrarMensajeDeError() {
  mensajeDeError.classList.add('is-show');
}

function ocultarMensajeDeError() {
  mensajeDeError.classList.remove('is-show');
}

/* ── Cierra el modal y detiene la reproducción ─────────────── */
function cerrarReproductor() {
  modalOverlay.classList.remove('is-open');
  document.body.style.overflow = '';

  /* Eliminar el iframe detiene el stream inmediatamente */
  if (iframeActual) {
    iframeActual.remove();
    iframeActual = null;
  }

  activarSpinner(false);
  ocultarMensajeDeError();
  contenidoActual = null;
}

/* ── Eventos para cerrar el modal ──────────────────────────── */
botonCerrarModal.addEventListener('click', cerrarReproductor);
modalOverlay.addEventListener('click', evento => {
  if (evento.target === modalOverlay) cerrarReproductor();
});
document.addEventListener('keydown', evento => {
  if (evento.key === 'Escape') cerrarReproductor();
});
