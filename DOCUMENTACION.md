# CineFlix — Documentación

---

## Estructura de archivos

```
cineflix/
├── index.html
├── DOCUMENTACION.md
└── assets/
    ├── css/
    │   ├── variables.css   → colores, fuentes y medidas globales
    │   ├── base.css        → reset y estilos base del body
    │   ├── navbar.css      → barra de navegación y buscador
    │   ├── cards.css       → cards de películas, top-10 y skeletons
    │   ├── player.css      → modal del reproductor
    │   └── layout.css      → hero, sidebar, footer y grilla
    └── js/
        ├── api.js          → comunicación con TMDB
        ├── player.js       → lógica del reproductor
        ├── ui.js           → componentes visuales
        └── main.js         → punto de entrada, conecta todo
```

---

## Cómo ejecutar el proyecto

El proyecto usa ES Modules nativos del navegador, por lo que necesita un servidor HTTP local. No funciona abriendo `index.html` directamente con doble clic.

```bash
# Con Python (viene instalado en Mac y Linux)
python -m http.server 8080

# Con Node.js
npx serve .

# Con PHP
php -S localhost:8080
```

Luego abre el navegador en `http://localhost:8080`.

---

## Cómo funciona

### Fuente de datos: TMDB API

Toda la información (títulos, sinopsis, pósters, géneros) viene de [The Movie Database](https://www.themoviedb.org). El idioma está fijado en `es-MX` y la región en `MX` dentro de `api.js`. No se pueden cambiar desde fuera del archivo.

El objeto que devuelve la API para cada película o serie tiene esta forma:

```js
{
  tmdb:        123456,          // ID de TMDB (se usa para los embeds)
  imdb:        'tt1234567',     // ID de IMDB (si está disponible)
  tipo:        'movie',         // 'movie' o 'tv'
  titulo:      'Nombre en español',
  anio:        2024,
  nota:        8.5,             // calificación de 0 a 10
  sinopsis:    'Descripción...',
  poster:      'https://...',   // URL de imagen 342px de ancho
  backdrop:    'https://...',   // URL de imagen 1280px de ancho
  generos:     ['Acción', 'Drama'],
  popularidad: 1234.5,          // número de TMDB, mayor = más popular
  duracion:    '2h 15m',        // solo disponible en el detalle completo
}
```

### Fuente de video: servidores embed

Al abrir una película, `player.js` construye una lista de 4 servidores embed usando el ID de TMDB. Los servidores están ordenados por estabilidad:

| Servidor   | Proveedor    | URL base                              |
|------------|--------------|---------------------------------------|
| Servidor 1 | vidsrc.cc    | `vidsrc.cc/v2/embed/{tipo}/{tmdb_id}` |
| Servidor 2 | vidsrc.me    | `vidsrc.me/embed/{tipo}?tmdb={id}`    |
| Servidor 3 | 2embed.cc    | `2embed.cc/embed/{tmdb_id}`           |
| Servidor 4 | embed.su     | `embed.su/embed/{tipo}/{tmdb_id}`     |

Si el servidor activo no responde en 15 segundos, aparece un mensaje de error y el usuario puede cambiar al siguiente servidor manualmente.

---

## Módulos JavaScript

### `api.js`

Contiene todas las funciones que hablan con TMDB. Cada función corresponde a un endpoint.

| Función                            | Qué devuelve                                  |
|------------------------------------|-----------------------------------------------|
| `obtenerTendencias()`              | Mezcla de películas y series en tendencia     |
| `obtenerPeliculasPopulares(pag)`   | Películas populares en México                 |
| `obtenerSeriesPopulares(pag)`      | Series populares en México                    |
| `obtenerPeliculasMejorValoradas()` | Películas con mayor calificación              |
| `obtenerSeriesMejorValoradas()`    | Series con mayor calificación                 |
| `obtenerEnCartelera()`             | Películas en cines en México ahora            |
| `obtenerPeliculasPorGenero(id)`    | Películas filtradas por ID de género          |
| `obtenerSeriesPorGenero(id)`       | Series filtradas por ID de género             |
| `obtenerDetallePelicula(id)`       | Detalle completo con duración e IMDB ID       |
| `obtenerDetalleSerie(id)`          | Detalle completo con temporadas e IMDB ID     |
| `obtenerGenerosPeliculas()`        | Lista de géneros de películas en español      |
| `obtenerGenerosSeries()`           | Lista de géneros de series en español         |
| `buscarContenido(texto)`           | Búsqueda de películas y series por texto      |

---

### `player.js`

Controla el modal del reproductor.

**Función principal:** `abrirReproductor(contenido)`

Recibe el objeto de contenido, abre el modal, carga el primer servidor y en paralelo pide el detalle completo a TMDB para mostrar la duración real.

**Funciones internas:**

- `construirListaDeServidores(contenido)` → devuelve los 4 servidores con sus URLs
- `cargarServidor(servidor)` → crea el iframe y gestiona el spinner y el timeout de error
- `actualizarInfoEnModal(contenido)` → escribe título, nota, sinopsis y chips en el modal
- `renderizarBarraDeServidores(servidores)` → dibuja los botones de selección de servidor
- `cerrarReproductor()` → cierra el modal y destruye el iframe (detiene el stream)

---

### `ui.js`

Funciones que construyen o montan elementos visuales.

| Función                                    | Qué hace                                          |
|--------------------------------------------|---------------------------------------------------|
| `crearCard(contenido)`                     | Devuelve una card de película/serie               |
| `crearCardTop10(contenido, posicion)`      | Devuelve una card horizontal con número grande    |
| `crearSeccion(titulo, lista, variante)`    | Devuelve una sección con título y fila de cards   |
| `crearFilaDeSkeleton(cantidad, variante)`  | Devuelve una fila de placeholders animados        |
| `mostrarPantallaDeCarga(contenedor)`       | Monta skeletons en el contenedor dado             |
| `mostrarPantallaDeError(contenedor, fn)`   | Monta el mensaje de error con botón de reintento  |
| `inicializarHero(lista)`                   | Monta el slideshow del banner principal           |
| `renderizarSidebar(lista)`                 | Monta la lista de más populares en el sidebar     |
| `renderizarChipsDeGenero(lista, fn)`       | Monta los botones de filtro por género            |
| `renderizarDropdownGeneros(lista, fn)`     | Monta el menú desplegable del navbar              |
| `inicializarBuscador(fnBusqueda)`          | Conecta el input del buscador con la función dada |

---

### `main.js`

Punto de entrada. No construye elementos directamente — llama a las funciones de `api.js` y `ui.js` y las conecta.

**Vistas disponibles:**

- `mostrarPantallaInicio()` → tendencias, populares, cartelera
- `mostrarPantallaPeliculas()` → solo películas
- `mostrarPantallaSeries()` → solo series
- `mostrarPantallaDeGenero(genero)` → películas y series del género seleccionado

**Al arrancar** (`iniciarAplicacion`):
1. Pide la lista de géneros a TMDB
2. Monta el dropdown del navbar y los chips del sidebar
3. Conecta el buscador
4. Conecta los enlaces del navbar con sus vistas
5. Llama a `mostrarPantallaInicio()`

---

## Agregar una nueva sección en la pantalla de inicio

En `main.js`, dentro de `mostrarPantallaInicio()`, añade una línea después del último `appendChild`:

```js
// Ejemplo: agregar una sección de próximos estrenos
const proximosEstrenos = await obtenerProximosEstrenos(); // función que debes crear en api.js
contenedorPrincipal.appendChild(crearSeccion('Próximos Estrenos', proximosEstrenos));
```

---

## Personalizar colores

Los colores están en `assets/css/variables.css`. Los principales:

```css
--c-crimson:   #9b111e;   /* color de acento principal */
--c-bg:        #0d0d0d;   /* fondo de la página */
--c-surface:   #141414;   /* fondo de cards y navbar */
--c-text:      #e8e4df;   /* texto principal */
```

El color del embed de vídeo (`COLOR_MARCA` en `player.js`) debe coincidir con `--c-crimson` sin el `#`:

```js
const COLOR_MARCA = '9b111e';
```

---

## Agregar más servidores de video

En `player.js`, en la función `construirListaDeServidores`, agrega un objeto al array:

```js
{
  nombre: 'Servidor 5',
  url:    `https://otro-proveedor.com/embed/${tipoMedia}/${idTMDB}`,
},
```

Los servidores deben aceptar el TMDB ID directamente en la URL.
