# FlipBook Studio — 1.4.0

## Uso local en Windows
1. Abre CMD en la carpeta que contiene `index.html`.
2. Ejecuta `python -m http.server 8081`.
3. Abre `http://localhost:8081`.

## GitHub
Crea un repositorio **Private** llamado `FlipBook-Studio`, sube el contenido de esta carpeta a la rama `main` y conserva la estructura.
En **Settings → Pages → Build and deployment**, selecciona **GitHub Actions**. El workflow incluido publica automáticamente con cada push a `main`.

## Aviso importante de privacidad
GitHub Pages sirve un sitio público incluso si el repositorio fuente es privado, salvo que tu organización tenga una modalidad de Pages privada compatible. No habilites Pages si no quieres que cualquier persona con el enlace pueda abrir la aplicación.

La aplicación guarda proyectos en IndexedDB del navegador; no sincroniza PDF ni proyectos entre dispositivos. No subas PDF privados, datos de estudiantes, credenciales ni tokens al repositorio.

## Dependencias
La aplicación principal carga PDF.js, StPageFlip y JSZip desde CDN, por lo que algunas funciones requieren Internet. Los paquetes exportados incluyen el motor StPageFlip dentro del ZIP.
