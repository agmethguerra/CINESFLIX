/* ================================================================
   CINEFLIX — main.js
   Punto de entrada de la aplicación.
   Orquesta las vistas, conecta el navbar y arranca todo.
   ================================================================ */

import {
  obtenerTendencias,
  obtenerPeliculasPopulares,
  obtenerSeriesPopulares,
  obtenerPeliculasMejorValoradas,
  obtenerSeriesMejorValoradas,
  obtenerEnCartelera,
  obtenerPeliculasPorGenero,
  obtenerSeriesPorGenero,
  obtenerGenerosPeliculas,
  obtenerGenerosSeries,
  buscarContenido,
  MAPA_GENEROS,
} from "./api.js";

import {
  inicializarHero,
  crearSeccion,
  renderizarSidebar,
  renderizarChipsDeGenero,
  renderizarDropdownGeneros,
  inicializarBuscador,
  mostrarPantallaDeCarga,
  mostrarPantallaDeError,
} from "./ui.js";

/* Contenedor principal donde se montan las secciones de cards */
const contenedorPrincipal = document.getElementById("mainContent");

/* Lista de géneros combinados (películas + series, sin repetidos) */
let listaDeGeneros = [];

/* ================================================================
   VISTAS — cada función renderiza una pantalla completa
   ================================================================ */

/* Pantalla de inicio: tendencias, populares, cartelera */
async function mostrarPantallaInicio() {
  mostrarPantallaDeCarga(contenedorPrincipal);
  try {
    const [
      tendencias,
      peliculasPopulares,
      seriesPopulares,
      peliculasMejorValoradas,
      enCartelera,
    ] = await Promise.all([
      obtenerTendencias(),
      obtenerPeliculasPopulares(),
      obtenerSeriesPopulares(),
      obtenerPeliculasMejorValoradas(),
      obtenerEnCartelera(),
    ]);

    /* Hero con las 6 tendencias más populares que tengan backdrop */
    inicializarHero(tendencias.filter((c) => c.backdrop));

    /* Montar las secciones de cards */
    contenedorPrincipal.innerHTML = "";
    contenedorPrincipal.appendChild(
      crearSeccion("Top 10 en Tendencia", tendencias.slice(0, 10), "top"),
    );
    contenedorPrincipal.appendChild(
      crearSeccion("Películas Populares", peliculasPopulares),
    );
    contenedorPrincipal.appendChild(
      crearSeccion("Series Populares", seriesPopulares),
    );
    contenedorPrincipal.appendChild(
      crearSeccion("Las Mejor Valoradas", peliculasMejorValoradas),
    );
    contenedorPrincipal.appendChild(
      crearSeccion("Ahora en Cines", enCartelera),
    );

    /* Sidebar con los más populares de todas las categorías */
    renderizarSidebar([
      ...tendencias,
      ...peliculasPopulares,
      ...seriesPopulares,
    ]);
  } catch (error) {
    console.error("Error cargando el inicio:", error);
    mostrarPantallaDeError(contenedorPrincipal, mostrarPantallaInicio);
  }
}

/* Pantalla solo de películas */
async function mostrarPantallaPeliculas() {
  mostrarPantallaDeCarga(contenedorPrincipal);
  try {
    const [populares, mejorValoradas, enCartelera] = await Promise.all([
      obtenerPeliculasPopulares(),
      obtenerPeliculasMejorValoradas(),
      obtenerEnCartelera(),
    ]);
    contenedorPrincipal.innerHTML = "";
    contenedorPrincipal.appendChild(
      crearSeccion("Películas Populares", populares),
    );
    contenedorPrincipal.appendChild(
      crearSeccion("Mejor Valoradas", mejorValoradas),
    );
    contenedorPrincipal.appendChild(
      crearSeccion("Ahora en Cines (MX)", enCartelera),
    );
  } catch (error) {
    mostrarPantallaDeError(contenedorPrincipal, mostrarPantallaPeliculas);
  }
}

/* Pantalla solo de series */
async function mostrarPantallaSeries() {
  mostrarPantallaDeCarga(contenedorPrincipal);
  try {
    const [populares, mejorValoradas] = await Promise.all([
      obtenerSeriesPopulares(),
      obtenerSeriesMejorValoradas(),
    ]);
    contenedorPrincipal.innerHTML = "";
    contenedorPrincipal.appendChild(
      crearSeccion("Series Populares", populares),
    );
    contenedorPrincipal.appendChild(
      crearSeccion("Series Mejor Valoradas", mejorValoradas),
    );
  } catch (error) {
    mostrarPantallaDeError(contenedorPrincipal, mostrarPantallaSeries);
  }
}

/* Pantalla filtrada por género (películas + series del género) */
async function mostrarPantallaDeGenero(genero) {
  const nombreGenero = genero.name || genero;
  const idGenero = genero.id || null;
  if (!idGenero) return;

  mostrarPantallaDeCarga(contenedorPrincipal);
  try {
    const [peliculas, series] = await Promise.all([
      obtenerPeliculasPorGenero(idGenero),
      obtenerSeriesPorGenero(idGenero),
    ]);

    contenedorPrincipal.innerHTML = "";

    if (peliculas.length) {
      contenedorPrincipal.appendChild(
        crearSeccion(`${nombreGenero} — Películas`, peliculas),
      );
    }
    if (series.length) {
      contenedorPrincipal.appendChild(
        crearSeccion(`${nombreGenero} — Series`, series),
      );
    }
    if (!peliculas.length && !series.length) {
      contenedorPrincipal.innerHTML = `
        <p style="padding:2rem;font-family:var(--f-ui);color:var(--c-text-muted)">
          Sin resultados para "${nombreGenero}".
        </p>`;
    }

    contenedorPrincipal.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    mostrarPantallaDeError(contenedorPrincipal, () =>
      mostrarPantallaDeGenero(genero),
    );
  }
}

/* ================================================================
   INICIO DE LA APLICACIÓN
   ================================================================ */
(async function iniciarAplicacion() {
  /* Cargar géneros en es-MX para el dropdown y los chips del sidebar */
  try {
    const [generosDePeliculas, generosDeSeries] = await Promise.all([
      obtenerGenerosPeliculas(),
      obtenerGenerosSeries(),
    ]);

    /* Combinar géneros de películas y series eliminando duplicados por ID */
    const idYaAgregados = new Set();
    listaDeGeneros = [...generosDePeliculas, ...generosDeSeries].filter(
      (genero) => {
        if (idYaAgregados.has(genero.id)) return false;
        idYaAgregados.add(genero.id);
        return true;
      },
    );
  } catch (_) {
    /* Si TMDB falla, usar el mapa estático como fallback */
    listaDeGeneros = Object.entries(MAPA_GENEROS).map(([id, nombre]) => ({
      id: Number(id),
      name: nombre,
    }));
  }

  /* Montar géneros en el dropdown del navbar y en los chips del sidebar */
  renderizarDropdownGeneros(listaDeGeneros, mostrarPantallaDeGenero);
  renderizarChipsDeGenero(listaDeGeneros, mostrarPantallaDeGenero);

  /* Inicializar el buscador con la función de búsqueda de la API */
  inicializarBuscador(buscarContenido);

  /* Configurar el menú móvil */
  inicializarMenuMovil();
  
  /* Conectar los enlaces del navbar */
  ["navInicio", "navInicio2"].forEach((idElemento) => {
    document.getElementById(idElemento)?.addEventListener("click", (evento) => {
      evento.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      mostrarPantallaInicio();
    });
  });

  document
    .getElementById("navPeliculas")
    ?.addEventListener("click", (evento) => {
      evento.preventDefault();
      mostrarPantallaPeliculas();
    });

  document.getElementById("navSeries")?.addEventListener("click", (evento) => {
    evento.preventDefault();
    mostrarPantallaSeries();
  });

  /* Renderizar la pantalla de inicio al arrancar */
  await mostrarPantallaInicio();

  /* ── Menú móvil ── */
  function inicializarMenuMovil() {
    const botonAbrir =
      document.getElementById("navToggle") ||
      document.querySelector(".cf-nav-toggle");
    const botonCerrar = document.getElementById("mobileClose");
    const fondo = document.getElementById("mobileBackdrop");
    const menu = document.getElementById("mobileMenu");
    const botonCat = document.getElementById("mobileCatBtn");
    const subMenu = document.getElementById("mobileSubmenu");
    const flechaCat = document.getElementById("mobileCatArrow");
    const inputMovil = document.getElementById("mobileSearchInput");

    if (!menu) return;

    function abrirMenu() {
      menu.classList.add("is-open");
      fondo.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }

    function cerrarMenu() {
      menu.classList.remove("is-open");
      fondo.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    botonAbrir?.addEventListener("click", abrirMenu);
    botonCerrar?.addEventListener("click", cerrarMenu);
    fondo?.addEventListener("click", cerrarMenu);

    /* Toggle sub-menú de categorías */
    botonCat?.addEventListener("click", () => {
      subMenu.classList.toggle("is-open");
      flechaCat.style.transform = subMenu.classList.contains("is-open")
        ? "rotate(180deg)"
        : "rotate(0deg)";
    });

    /* Poblar sub-menú con los géneros (se llama después de cargar géneros) */
    window._poblarSubmenuMovil = function (listaDeGeneros, alSeleccionar) {
      if (!subMenu) return;
      subMenu.innerHTML = "";
      listaDeGeneros.forEach((genero) => {
        const enlace = document.createElement("a");
        enlace.href = "#";
        enlace.innerHTML = `<i class="bi bi-chevron-right"></i>${genero.name || genero}`;
        enlace.addEventListener("click", (evento) => {
          evento.preventDefault();
          cerrarMenu();
          alSeleccionar(genero);
        });
        subMenu.appendChild(enlace);
      });
    };
    window._poblarSubmenuMovil?.(listaDeGeneros, mostrarPantallaDeGenero);
    /* Links de navegación del menú móvil */
    document.getElementById("mobileInicio")?.addEventListener("click", (e) => {
      e.preventDefault();
      cerrarMenu();
      window.scrollTo({ top: 0, behavior: "smooth" });
      mostrarPantallaInicio();
    });
    document
      .getElementById("mobilePeliculas")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        cerrarMenu();
        mostrarPantallaPeliculas();
      });
    document.getElementById("mobileSeries")?.addEventListener("click", (e) => {
      e.preventDefault();
      cerrarMenu();
      mostrarPantallaSeries();
    });

    /* Buscador del menú móvil — reutiliza la misma lógica */
    let debounceMovil = null;
    inputMovil?.addEventListener("input", () => {
      clearTimeout(debounceMovil);
      const texto = inputMovil.value.trim();
      if (texto.length < 2) return;
      debounceMovil = setTimeout(async () => {
        const resultados = await buscarContenido(texto);
        if (resultados.length) {
          cerrarMenu();
          contenedorPrincipal.innerHTML = "";
          contenedorPrincipal.appendChild(
            crearSeccion(`Resultados: "${texto}"`, resultados),
          );
          inputMovil.value = "";
        }
      }, 380);
    });
  }
})();
