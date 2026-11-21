# FlipBook Studio — Versión 1.3.2 / Fase 3 — ajuste de interacción y pantalla

## Qué incorpora esta versión

- Importación real de archivos PDF.
- Validación básica del documento.
- Lectura del número total de páginas mediante PDF.js.
- Vista previa renderizada de la primera página.
- Conservación del PDF original como Blob en IndexedDB.
- Visor FlipBook con efecto de pasar páginas mediante StPageFlip.
- Apertura de documentos guardados desde la sección Proyectos.
- Controles anterior/siguiente, indicador de página, zoom y pantalla completa.
- Navegación con flechas del teclado.
- Metadatos del documento: nombre, tamaño, fecha y número de páginas.
- Migración de la base de datos IndexedDB a versión 2, conservando los proyectos anteriores.

## Requisitos

- Windows 10/11.
- Google Chrome o Microsoft Edge actualizado.
- Conexión a Internet para cargar PDF.js desde CDN en esta versión.
- Python 3 para iniciar un servidor local sencillo.

## IMPORTANTE: ejecutar con servidor local

No abras `index.html` directamente con doble clic. Para evitar restricciones del navegador con módulos, workers y almacenamiento, ejecuta la aplicación mediante un servidor local:

1. Descomprime la carpeta.
2. Entra en `FlipBook_Studio_Fase3`.
3. Haz clic en la barra de direcciones del Explorador, escribe `cmd` y presiona Enter.
4. En la ventana negra escribe:

```bat
python -m http.server 8080
```

5. Abre Chrome o Edge y visita:

`http://localhost:8080`

6. Mantén abierta la ventana CMD mientras utilices la aplicación. Para detener el servidor, presiona `Ctrl + C`.

Si Windows indica que Python no está instalado, puedes instalar Python desde su sitio oficial o utilizar otro servidor HTTP local.

## Cómo probar la importación

1. En el menú lateral, selecciona **Importar PDF**.
2. Pulsa **Seleccionar PDF**.
3. Elige un PDF que tengas en tu computadora.
4. Espera a que termine el procesamiento.
5. Comprueba que aparezcan:
   - Nombre del documento.
   - Número de páginas.
   - Tamaño del archivo.
   - Vista previa de la primera página.
   - Mensaje de guardado local.
6. Entra en **Proyectos** y verifica que aparezca el documento.
7. Actualiza el navegador y confirma que el proyecto siga apareciendo.

## Almacenamiento y privacidad

El PDF original se guarda dentro de IndexedDB del navegador, en el perfil de Windows que estés utilizando. No se envía a un servidor. No borres los datos del sitio ni uses otro perfil de navegador si deseas conservar esos datos.

Esta fase todavía no incluye copias de seguridad/restauración. Conserva los PDF originales en una carpeta propia hasta que implementemos esa función.

## Dependencia PDF.js y funcionamiento sin conexión

En esta entrega PDF.js se carga desde cdnjs para facilitar la primera implementación. Por ello, la importación de PDF requiere conexión a Internet para descargar esa biblioteca. El documento sí se procesa localmente en el navegador.

El siguiente ajuste técnico será incorporar PDF.js dentro de la carpeta del proyecto (`vendor/`) para que la aplicación pueda procesar documentos completamente sin conexión.

## Fase 3.1: organización automática de páginas

La versión 1.2.4 organiza automáticamente la revista: primera página como portada, última como contraportada y páginas interiores en parejas. Si las páginas interiores son impares, se incorpora una hoja auxiliar en blanco antes de la contraportada. Esta hoja no modifica el PDF original ni su numeración.

## Fase 3: visor FlipBook

En esta versión puedes abrir una revista desde **Proyectos → Abrir revista**. El visor vuelve a leer el PDF original guardado localmente y renderiza sus páginas para el efecto de pasar hojas. La carga se realiza página por página y muestra el progreso. Incluye controles de navegación, zoom, pantalla completa y teclado.

El motor StPageFlip y PDF.js se cargan desde CDN, por lo que esta versión necesita Internet para iniciar el visor. El PDF permanece en IndexedDB y no se sube a ningún servidor.

## Limitaciones de esta versión

- Las páginas se renderizan en memoria al abrir el visor; documentos muy extensos pueden requerir más memoria.
- Todavía no se implementan miniaturas, búsqueda de texto, anotaciones ni edición de páginas.
- La biblioteca y la gestión avanzada de documentos siguen pendientes.
- No se exporta todavía HTML5/ZIP.
- Los PDF protegidos con contraseña no están soportados en esta versión.

## Próximo hito

Fase 4: editor visual de publicaciones y organización de páginas.


## Corrección 1.2.2: interacción del cursor

Se desactiva la previsualización de esquinas y se reduce la intensidad de las sombras del motor StPageFlip para minimizar la zona gris que podía aparecer al mover el cursor sobre las primeras páginas. Se debe comprobar que el arrastre de esquinas y la navegación anterior/siguiente sigan funcionando.


### Nota de la versión 1.3.2
La portada y la contraportada se muestran individualmente gracias a `showCover`, pero todas las páginas utilizan densidad flexible (`soft`) para que las tapas también puedan doblarse al pasar. No se insertan páginas en blanco ni se altera el número original de páginas del PDF.

### Versión 1.3.2
Se habilitó la respuesta visual de las esquinas al pasar el cursor (`showPageCorners`). Acerca el puntero a una esquina para comprobar si aparece el pequeño pliegue antes de arrastrar.


## Corrección 1.2.8
Se corrigió el centrado de las tapas eliminando el desplazamiento horizontal manual. El escenario centra el libro y el zoom se aplica sin añadir offsets laterales.


## Prueba de esquinas en la versión 1.3.2
En esta versión se desactiva el pliegue automático al pasar el cursor sobre las esquinas (`showPageCorners: false`). Para pasar páginas, arrastra manualmente una esquina o utiliza los botones Anterior/Siguiente. Esta es una prueba de aislamiento para identificar si el espacio gris se produce durante la previsualización automática del pliegue.


## Fase 4 — Publicar y exportar (versión 1.4.0)

- Exporta una revista como paquete ZIP HTML5 para alojamiento web.
- Exporta una revista como paquete ZIP offline: descomprime y abre `index.html` con doble clic.
- Las páginas del PDF se convierten a imágenes WebP optimizadas.
- El paquete incluye el motor StPageFlip local, sin depender de CDN durante la lectura de la revista exportada.
- Permite elegir publicación con marca FlipBook Studio o sin marca.
- Genera código iframe para WordPress, Elementor, Google Sites y otras plataformas que permitan contenido incorporado.
- La aplicación principal requiere conexión para cargar PDF.js, JSZip y descargar el motor de volteo durante la exportación.
- El ZIP exportado es autónomo y no requiere conexión para abrirse offline.
- El plugin nativo de WordPress queda previsto para una fase posterior.
