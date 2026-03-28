/* ================================================================
   CINEFLIX — api.js
   Comunicación con la API de TMDB.
   Idioma fijo: es-MX (español latino). Región fija: MX.
   ================================================================ */

const TMDB_API_KEY  = '8265bd1679663a7ea12ac168da84d2e8';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_LANGUAGE = 'es-MX';
const TMDB_REGION   = 'MX';

/* Prefijos de URL para imágenes de TMDB */
export const TMDB_IMG = {
  poster:   'https://image.tmdb.org/t/p/w342',
  backdrop: 'https://image.tmdb.org/t/p/w1280',
};

/* Mapa de ID de género TMDB → nombre en español */
export const MAPA_GENEROS = {
  28:'Acción', 12:'Aventura', 16:'Animación', 35:'Comedia', 80:'Crimen',
  99:'Documental', 18:'Drama', 10751:'Familia', 14:'Fantasía', 36:'Historia',
  27:'Terror', 10402:'Musical', 9648:'Misterio', 10749:'Romance',
  878:'Ciencia Ficción', 53:'Suspenso', 10752:'Bélica', 37:'Western',
  10759:'Acción & Aventura', 10765:'Sci-Fi & Fantasía', 10766:'Telenovela',
};

/* ── Petición HTTP a TMDB ──────────────────────────────────── */
async function peticionTMDB(endpoint, parametrosExtra = {}) {
  const parametros = new URLSearchParams({
    api_key:  TMDB_API_KEY,
    language: TMDB_LANGUAGE,
    region:   TMDB_REGION,
    ...parametrosExtra,
  });
  const respuesta = await fetch(`${TMDB_BASE_URL}${endpoint}?${parametros}`);
  if (!respuesta.ok) throw new Error(`TMDB error ${respuesta.status}`);
  return respuesta.json();
}

/* ── Convierte un resultado crudo de TMDB a objeto CineFlix ── */
function normalizarResultado(resultadoCrudo, tipo) {
  const esPelicula = tipo === 'movie';
  return {
    tmdb:        resultadoCrudo.id,
    imdb:        resultadoCrudo.imdb_id || null,
    tipo,
    titulo:      esPelicula
                   ? (resultadoCrudo.title || resultadoCrudo.original_title)
                   : (resultadoCrudo.name  || resultadoCrudo.original_name),
    anio:        parseInt((esPelicula ? resultadoCrudo.release_date : resultadoCrudo.first_air_date) || '0'),
    nota:        Math.round(resultadoCrudo.vote_average * 10) / 10,
    sinopsis:    resultadoCrudo.overview || 'Sin descripción disponible.',
    poster:      resultadoCrudo.poster_path
                   ? TMDB_IMG.poster   + resultadoCrudo.poster_path
                   : null,
    backdrop:    resultadoCrudo.backdrop_path
                   ? TMDB_IMG.backdrop + resultadoCrudo.backdrop_path
                   : null,
    generos:     (resultadoCrudo.genre_ids || [])
                   .map(idGenero => MAPA_GENEROS[idGenero])
                   .filter(Boolean),
    popularidad: resultadoCrudo.popularity || 0,
    duracion:    null,
  };
}

/* ── Convierte el detalle completo de TMDB (incluye duración e IMDB ID) */
function normalizarDetalle(detalleCrudo, tipo) {
  const base = normalizarResultado(
    { ...detalleCrudo, genre_ids: (detalleCrudo.genres || []).map(g => g.id) },
    tipo
  );
  base.generos  = (detalleCrudo.genres || []).map(g => g.name);
  base.imdb     = detalleCrudo.imdb_id || detalleCrudo.external_ids?.imdb_id || null;
  base.duracion = tipo === 'movie'
    ? (detalleCrudo.runtime
        ? `${Math.floor(detalleCrudo.runtime / 60)}h ${detalleCrudo.runtime % 60}m`
        : null)
    : (detalleCrudo.number_of_seasons
        ? `${detalleCrudo.number_of_seasons} Temporada${detalleCrudo.number_of_seasons > 1 ? 's' : ''}`
        : null);
  return base;
}

/* ================================================================
   Funciones públicas
   ================================================================ */

/** Tendencias de la semana (mezcla de películas y series) */
export function obtenerTendencias() {
  return peticionTMDB('/trending/all/week').then(datos =>
    datos.results.map(item =>
      normalizarResultado(item, item.media_type === 'tv' ? 'tv' : 'movie')
    )
  );
}

/** Películas más populares en México */
export function obtenerPeliculasPopulares(pagina = 1) {
  return peticionTMDB('/movie/popular', { page: pagina }).then(datos =>
    datos.results.map(item => normalizarResultado(item, 'movie'))
  );
}

/** Series más populares en México */
export function obtenerSeriesPopulares(pagina = 1) {
  return peticionTMDB('/tv/popular', { page: pagina }).then(datos =>
    datos.results.map(item => normalizarResultado(item, 'tv'))
  );
}

/** Películas mejor valoradas */
export function obtenerPeliculasMejorValoradas(pagina = 1) {
  return peticionTMDB('/movie/top_rated', { page: pagina }).then(datos =>
    datos.results.map(item => normalizarResultado(item, 'movie'))
  );
}

/** Series mejor valoradas */
export function obtenerSeriesMejorValoradas(pagina = 1) {
  return peticionTMDB('/tv/top_rated', { page: pagina }).then(datos =>
    datos.results.map(item => normalizarResultado(item, 'tv'))
  );
}

/** Películas actualmente en cartelera en México */
export function obtenerEnCartelera(pagina = 1) {
  return peticionTMDB('/movie/now_playing', { page: pagina }).then(datos =>
    datos.results.map(item => normalizarResultado(item, 'movie'))
  );
}

/** Películas filtradas por ID de género */
export function obtenerPeliculasPorGenero(idGenero, pagina = 1) {
  return peticionTMDB('/discover/movie', {
    with_genres: idGenero,
    sort_by:     'popularity.desc',
    page:        pagina,
  }).then(datos => datos.results.map(item => normalizarResultado(item, 'movie')));
}

/** Series filtradas por ID de género */
export function obtenerSeriesPorGenero(idGenero, pagina = 1) {
  return peticionTMDB('/discover/tv', {
    with_genres: idGenero,
    sort_by:     'popularity.desc',
    page:        pagina,
  }).then(datos => datos.results.map(item => normalizarResultado(item, 'tv')));
}

/** Lista de géneros de películas en español */
export function obtenerGenerosPeliculas() {
  return peticionTMDB('/genre/movie/list').then(datos => datos.genres);
}

/** Lista de géneros de series en español */
export function obtenerGenerosSeries() {
  return peticionTMDB('/genre/tv/list').then(datos => datos.genres);
}

/** Detalle completo de una película (incluye duración e IMDB ID) */
export function obtenerDetallePelicula(idTMDB) {
  return peticionTMDB(`/movie/${idTMDB}`, { append_to_response: 'external_ids' })
    .then(datos => normalizarDetalle(datos, 'movie'));
}

/** Detalle completo de una serie (incluye temporadas e IMDB ID) */
export function obtenerDetalleSerie(idTMDB) {
  return peticionTMDB(`/tv/${idTMDB}`, { append_to_response: 'external_ids' })
    .then(datos => normalizarDetalle(datos, 'tv'));
}

/** Búsqueda de películas y series por texto */
export function buscarContenido(textoBusqueda) {
  if (!textoBusqueda || textoBusqueda.trim().length < 2) return Promise.resolve([]);
  return peticionTMDB('/search/multi', { query: textoBusqueda.trim() }).then(datos =>
    datos.results
      .filter(item => item.media_type !== 'person' && (item.poster_path || item.backdrop_path))
      .map(item => normalizarResultado(item, item.media_type === 'tv' ? 'tv' : 'movie'))
  );
}
