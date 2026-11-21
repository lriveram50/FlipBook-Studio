# CHANGELOG — FlipBook Studio

## Versión 1.4.0 — Fase 4: exportación y publicación
- Se incorpora el centro de publicación y exportación.
- Exportación ZIP HTML5 para alojamiento web.
- Exportación ZIP offline que abre con doble clic mediante `index.html`.
- Conversión de páginas PDF a imágenes WebP con calidad configurable.
- Se incluye el motor StPageFlip dentro del ZIP para lectura sin CDN.
- Selector de marca: con FlipBook Studio o publicación limpia.
- Generador de código iframe para WordPress, Elementor, Google Sites y otras plataformas compatibles.
- Historial de exportaciones guardado en IndexedDB.
- Se conservan importación PDF, proyectos, IndexedDB, visor, navegación, zoom y pantalla completa.

# CHANGELOG — FlipBook Studio

## Versión 1.3.2 — Pantalla completa estable
- Se elimina la reconstrucción/destrucción de StPageFlip al cambiar el tamaño de ventana o entrar/salir de pantalla completa.
- El libro conserva la misma instancia, las páginas renderizadas y el estado de navegación.
- El ajuste al espacio disponible se realiza mediante escala CSS centrada, recalculada al cambiar el viewport.
- En pantalla completa el escenario ocupa 100vw × 100vh y centra el libro.
- Se mantiene el número original de páginas del PDF, sin hoja auxiliar.

# CHANGELOG — FlipBook Studio

## Versión 1.3.1 — Centrado, pantalla completa y eliminación de hoja auxiliar
- Se elimina la inserción automática de una página auxiliar en blanco; se respeta el número y orden exactos de páginas del PDF.
- Se recalcula el tamaño de cada hoja usando el espacio real del escenario.
- Al entrar/salir de pantalla completa y al cambiar el tamaño de ventana, se reconstruye el motor con las nuevas dimensiones y se conserva la página actual.
- Se centra el libro horizontal y verticalmente en el escenario.
- Se mantiene el PDF ya renderizado en memoria al redimensionar; no se vuelve a renderizar cada página.
- Se actualiza el número visible de versión y los parámetros de caché.

# CHANGELOG — FlipBook Studio

## Versión 1.3.0 — Ajuste de geometría y densidad de tapas
- Se usa tamaño fijo por hoja (`size: fixed`) porque el tamaño se calcula previamente según el escenario; se evita el reestiramiento durante los giros.
- Se desactiva el cambio automático a modo retrato (`usePortrait: false`) para impedir la clonación/recolocación de hojas en medio de la navegación. El tamaño de hoja se adapta al ancho disponible.
- La primera y última página se declaran `hard`, coherentes con `showCover: true`; las páginas interiores siguen siendo `soft`.
- El contenedor raíz deja de usar Flexbox interno; el escenario externo es el único responsable del centrado.
- A zoom 100 %, se elimina el transform CSS en lugar de aplicar `scale(1)`.
- Se conserva la página auxiliar antes de la contraportada cuando la cantidad de páginas interiores es impar.
- Se conservan PDF, IndexedDB, navegación y controles.

# CHANGELOG — FlipBook Studio

## Versión 1.2.9
- Prueba controlada: se desactiva temporalmente el plegado automático al pasar el cursor por las esquinas (`showPageCorners: false`).
- Se conserva la navegación mediante botones y el giro manual.
- Se actualiza la identificación visible de versión a 1.2.9.
- Se añaden parámetros de versión a CSS y JavaScript para evitar reutilizar referencias antiguas en caché.

# FlipBook Studio — Versión 1.2.4 / Fase 3

## Organización editorial automática de páginas

- Portada: primera página del PDF, individual.
- Contraportada: última página del PDF, individual.
- Páginas interiores: agrupadas automáticamente en dobles páginas.
- Si el número de páginas interiores es impar, se agrega una página auxiliar en blanco, sin numeración ni modificación del PDF original.
- Portada y contraportada se alinean al centro cuando se muestran individualmente.
- El indicador conserva la numeración original del PDF y no cuenta la página auxiliar.
- Se mantiene IndexedDB versión 2; no se modifica ni elimina ningún documento guardado.
- Se conservan navegación, zoom, pantalla completa y motor StPageFlip.

## Importante para la prueba
La lógica se ha actualizado en el código, pero la transición visual debe validarse en el Chrome del usuario con su PDF real. Si el movimiento de la portada continúa desalineado, será necesario ajustar el comportamiento del motor tras observar la nueva versión.


## Versión 1.2.6 — Ajuste del volteo de las tapas
- Se elimina la hoja auxiliar en blanco.
- Se conserva el PDF con su cantidad y orden original de páginas.
- Portada y contraportada mantienen la presentación individual de `showCover`, pero ahora usan densidad `soft` para permitir el efecto de doblado durante el giro.
- Las páginas interiores mantienen su comportamiento flexible.
- Se conserva el centrado visual de las tapas sin alterar la densidad de las hojas.


## Versión 1.2.6
- Se activa la indicación visual de las esquinas (`showPageCorners: true`) para que al acercar el cursor a una esquina aparezca el pliegue previo al volteo.
- Se mantienen las páginas flexibles (`soft`), sin hojas auxiliares en blanco y con portada/contraportada individuales.


## Versión 1.2.7 — Corrección del centrado de portada y contraportada
- Se elimina el desplazamiento horizontal manual de media página.
- El visor conserva el centrado natural del escenario mediante Flexbox.
- El zoom continúa aplicándose sin alterar la geometría calculada por StPageFlip.
- Se conservan la importación PDF, IndexedDB, navegación, páginas flexibles, sombras y pantalla completa.


## Versión 1.2.8 — Corrección de pliegos y geometría del visor
- Se calcula la paridad de las páginas interiores cuando portada y contraportada se muestran individualmente.
- Si las páginas interiores son impares, se inserta una hoja auxiliar en blanco inmediatamente antes de la contraportada, no después de la portada.
- La primera doble página conserva el orden natural del PDF (páginas 2–3).
- El mapa de numeración excluye la hoja auxiliar.
- El montaje del visor utiliza dimensiones explícitas de doble página y deja el centrado al escenario.


## Versión 1.2.9 — Prueba controlada del pliegue automático de esquinas
- Se desactiva temporalmente `showPageCorners` para impedir que el motor pliegue automáticamente una esquina solo por pasar el cursor sobre ella.
- Se conserva el giro manual de páginas mediante arrastre y los controles Anterior/Siguiente.
- Esta versión permite aislar si la separación observada en la grabación proviene del estado `FOLD_CORNER` de StPageFlip.
- No se modifica el PDF original, IndexedDB ni la numeración de páginas.
