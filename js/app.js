(function () {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const views = ["dashboard", "library", "projects", "import", "exports", "settings", "viewer"];
  let pageFlip = null;
  let activePdf = null;
  let activeProjectId = null;
  let readerZoom = 1;
  let toastTimer;

  function notify(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }
  function navigate(view) {
    if (!views.includes(view)) return;
    $$(".view").forEach(el => el.classList.toggle("active", el.id === `view-${view}`));
    $$(".nav-item[data-view]").forEach(el => el.classList.toggle("active", el.dataset.view === view));
    const labels = {dashboard:"Panel principal",library:"Mi biblioteca",projects:"Proyectos",import:"Importar PDF",exports:"Exportaciones",settings:"Configuración",viewer:"Visor FlipBook"};
    $("#breadcrumbCurrent").textContent = labels[view];
    $("#sidebar").classList.remove("open");
    if (view === "projects" || view === "dashboard") refreshProjects();
    if (view === "exports") { getExportProjects(); renderExportHistory(); }
  }
  function formatDate(value) {
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }
  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  async function refreshProjects() {
    try {
      const projects = await FlipBookDB.getProjects();
      projects.sort((a,b) => b.updatedAt - a.updatedAt);
      $("#statProjects").textContent = projects.length;
      $("#statPublications").textContent = projects.length;
      $("#statExports").textContent = (await FlipBookDB.getExports()).length;
      renderProjectList(projects.slice(0, 4), $("#recentList"));
      renderProjectList(projects, $("#allProjects"));
      $("#recentEmpty").hidden = projects.length > 0;
      $("#projectsEmpty").hidden = projects.length > 0;
    } catch (error) {
      console.error(error); notify("No se pudo consultar el almacenamiento local.");
    }
  }
  function renderProjectList(projects, container) {
    container.innerHTML = "";
    projects.forEach(project => {
      const row = document.createElement("article"); row.className = "project-row";
      const icon = document.createElement("div"); icon.className = "file-symbol"; icon.textContent = "PDF";
      const meta = document.createElement("div"); meta.className = "project-meta";
      const title = document.createElement("b"); title.textContent = project.title;
      const detail = document.createElement("small"); detail.textContent = `${project.pageCount || "Páginas pendientes"} páginas · ${formatBytes(project.fileSize)} · ${formatDate(project.updatedAt)}`;
      meta.append(title, detail);
      const actions = document.createElement("div"); actions.className = "project-actions";
      const open = document.createElement("button"); open.className = "open-project-btn"; open.textContent = "Abrir revista"; open.addEventListener("click", () => openViewer(project.id));
      actions.append(open);
      const tag = document.createElement("span"); tag.className = "project-tag"; tag.textContent = project.statusLabel || "En preparación";
      row.append(icon, meta, tag, actions); container.append(row);
    });
  }
  function setProcessing(active, message = "Leyendo estructura del PDF.") {
    $("#processing").hidden = !active;
    $("#processingMessage").textContent = message;
    $("#pdfInput").disabled = active;
    $("#importError").hidden = true;
  }
  function showError(message) {
    $("#importError").textContent = message;
    $("#importError").hidden = false;
    $("#pdfResult").hidden = true;
  }
  async function renderFirstPage(pdf) {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.15 });
    const canvas = $("#firstPageCanvas");
    const context = canvas.getContext("2d", { alpha: false });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
  }
  async function importPDF(file) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      showError("El archivo seleccionado no parece ser un PDF. Selecciona un documento con extensión .pdf.");
      return;
    }
    if (!window.pdfjsLib) {
      showError("No se pudo cargar PDF.js. Comprueba tu conexión a Internet y vuelve a abrir la aplicación. La versión actual carga esta biblioteca desde CDN.");
      return;
    }
    if (file.size === 0) { showError("El archivo está vacío."); return; }

    setProcessing(true, "Validando documento y contando sus páginas.");
    $("#pdfResult").hidden = true;
    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdf = await loadingTask.promise;
      $("#processingMessage").textContent = "Generando vista previa de la primera página.";
      await renderFirstPage(pdf);

      const now = Date.now();
      const project = {
        id: `project_${now}_${Math.random().toString(36).slice(2,8)}`,
        title: file.name.replace(/\.pdf$/i, ""),
        fileName: file.name,
        fileSize: file.size,
        mimeType: "application/pdf",
        pageCount: pdf.numPages,
        pdfBlob: file,
        status: "draft",
        statusLabel: "PDF importado",
        createdAt: now,
        updatedAt: now,
        phase: 2,
        pdfVersion: pdf.version || "PDF",
        note: "PDF original guardado localmente. Listo para continuar con el motor Flipbook."
      };
      await FlipBookDB.saveProject(project);
      $("#resultTitle").textContent = project.title;
      $("#resultMeta").textContent = `${project.fileName} · Importado ${formatDate(now)}`;
      $("#detailPages").textContent = String(pdf.numPages);
      $("#detailSize").textContent = formatBytes(file.size);
      $("#pdfResult").hidden = false;
      await refreshProjects();
      notify(`PDF importado correctamente: ${pdf.numPages} páginas.`);
      pdf.cleanup();
    } catch (error) {
      console.error(error);
      let message = "No se pudo procesar este PDF. Puede estar dañado, protegido con contraseña o utilizar una característica no compatible.";
      if (error && /password/i.test(error.message || "")) message = "El PDF está protegido con contraseña. En esta versión no podemos abrir documentos protegidos.";
      if (error && error.name === "QuotaExceededError") message = "El almacenamiento del navegador está lleno. Libera espacio o prueba con un PDF más pequeño.";
      showError(message);
    } finally {
      setProcessing(false);
    }
  }

  // Estado del visor: conserva las páginas renderizadas para redimensionar
  // el libro sin volver a descargar ni renderizar el PDF.
  let readerPageMap = [];
  let readerOriginalTotal = 0;
  let readerPageElements = [];
  let readerPageAspect = 0.707;
  let readerResizeTimer = null;

  function getReaderPageSize() {
    const stage = $("#flipbookStage");
    const rect = stage.getBoundingClientRect();
    const styles = getComputedStyle(stage);
    const padX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const padY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const availableWidth = Math.max(260, rect.width - padX - 36);
    const availableHeight = Math.max(300, rect.height - padY - 28);

    // Un pliego ocupa dos páginas. Se aprovecha el espacio disponible tanto
    // en la vista previa como en pantalla completa, manteniendo la proporción.
    const pageWidth = Math.floor(Math.min(availableWidth / 2, availableHeight * readerPageAspect));
    const pageHeight = Math.floor(pageWidth / readerPageAspect);
    return {
      width: Math.max(180, pageWidth),
      height: Math.max(260, pageHeight)
    };
  }

  function updateCoverAlignment() {
    const stage = $("#flipbookStage");
    const mount = $("#flipbookMount");
    if (!stage || !mount || !mount.children.length) return;

    // Keep the existing StPageFlip instance and its DOM intact.
    // Scale its visual book to the space available in preview/fullscreen.
    const stageStyle = getComputedStyle(stage);
    const availableWidth = Math.max(1,
      stage.clientWidth -
      parseFloat(stageStyle.paddingLeft || 0) -
      parseFloat(stageStyle.paddingRight || 0) - 24
    );
    const availableHeight = Math.max(1,
      stage.clientHeight -
      parseFloat(stageStyle.paddingTop || 0) -
      parseFloat(stageStyle.paddingBottom || 0) - 24
    );
    const bookWidth = mount.offsetWidth || parseFloat(mount.style.width) || 1;
    const bookHeight = mount.offsetHeight || parseFloat(mount.style.height) || 1;
    const fitScale = Math.min(availableWidth / bookWidth, availableHeight / bookHeight);

    mount.style.transformOrigin = "center center";
    mount.style.transform = `scale(${fitScale * readerZoom})`;
  }

  function updateReaderControls() {
    if (!pageFlip) return;
    const current = pageFlip.getCurrentPageIndex();
    const lastIndex = pageFlip.getPageCount() - 1;
    const total = readerOriginalTotal || lastIndex + 1;
    let label = "";

    if (current === 0 || current === lastIndex) {
      label = String(readerPageMap[current] || (current === 0 ? 1 : total));
    } else {
      const spreadStart = current % 2 === 0 ? current - 1 : current;
      const a = readerPageMap[spreadStart];
      const b = readerPageMap[spreadStart + 1];
      const nums = [a, b].filter(n => Number.isInteger(n));
      label = nums.length > 1 ? `${Math.min(...nums)}–${Math.max(...nums)}` :
              nums.length === 1 ? String(nums[0]) : "—";
    }

    $("#currentPageLabel").textContent = label;
    $("#totalPagesLabel").textContent = String(total);
    $("#previousPageBtn").disabled = current <= 0;
    $("#nextPageBtn").disabled = current >= lastIndex;
    $("#readerDocumentPages").textContent = `${total} páginas originales · Lectura interactiva`;
    updateCoverAlignment();
  }

  async function openViewer(projectId) {
    try {
      const project = await FlipBookDB.getProject(projectId);
      if (!project || !project.pdfBlob) { notify("No se encontró el PDF original de este proyecto."); return; }
      if (!window.pdfjsLib) { notify("No se pudo cargar PDF.js. Comprueba tu conexión a Internet."); return; }
      if (!window.St || !window.St.PageFlip) { notify("No se pudo cargar el motor de páginas. Comprueba tu conexión a Internet."); return; }
      activeProjectId = projectId;
      $("#viewerTitle").textContent = project.title;
      $("#viewerSubtitle").textContent = `${project.fileName} · ${formatBytes(project.fileSize)}`;
      $("#readerDocumentTitle").textContent = project.title;
      $("#readerDocumentPages").textContent = "Preparando páginas…";
      $("#readerLoading").hidden = false;
      $("#readerProgress").textContent = "Abriendo el PDF guardado localmente.";
      $("#flipbookMount").innerHTML = "";
      $("#flipbookMount").style.transform = "none";
      readerZoom = 1;
      readerPageMap = [];
      readerOriginalTotal = 0;
      $("#zoomLabel").textContent = "100%";
      navigate("viewer");
      if (pageFlip) { try { pageFlip.destroy(); } catch (_) {} pageFlip = null; }
      if (activePdf) { try { await activePdf.destroy(); } catch (_) {} activePdf = null; }

      const data = await project.pdfBlob.arrayBuffer();
      const task = pdfjsLib.getDocument({ data: new Uint8Array(data) });
      activePdf = await task.promise;
      readerOriginalTotal = activePdf.numPages;

      const firstPage = await activePdf.getPage(1);
      const baseViewport = firstPage.getViewport({ scale: 1 });
      const stage = $("#flipbookStage");
      const pageRatio = baseViewport.width / baseViewport.height;
      readerPageAspect = pageRatio;

      const pages = [];
      const renderPdfPage = async (pageNumber) => {
        $("#readerProgress").textContent = `Renderizando página ${pageNumber} de ${activePdf.numPages}…`;
        const pdfPage = pageNumber === 1 ? firstPage : await activePdf.getPage(pageNumber);
        const viewportAtOne = pdfPage.getViewport({ scale: 1 });
        const scale = Math.min(1.25, 1050 / viewportAtOne.width, 1450 / viewportAtOne.height);
        const viewport = pdfPage.getViewport({ scale });
        const page = document.createElement("div");
        page.className = "page reader-page";
        // StPageFlip showCover marca la primera y última hoja como tapas rígidas.
        // Declaramos la misma densidad en el HTML para evitar discrepancias de geometría.
        page.dataset.density = (pageNumber === 1 || pageNumber === activePdf.numPages) ? "hard" : "soft";
        page.dataset.originalPage = String(pageNumber);
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        const context = canvas.getContext("2d", { alpha: false });
        await pdfPage.render({ canvasContext: context, viewport }).promise;
        page.append(canvas);
        pages.push(page);
        readerPageMap.push(pageNumber);
        if (pageNumber > 1) pdfPage.cleanup();
      };

      // Renderizamos las páginas originales en su orden, sin alterar el PDF.
      for (let pageNumber = 1; pageNumber <= activePdf.numPages; pageNumber++) {
        await renderPdfPage(pageNumber);
      }

      // No se agrega una página auxiliar en blanco al final. Se conserva
      // exactamente el contenido del PDF; StPageFlip muestra la última hoja
      // como contraportada individual cuando showCover está activado.
      readerPageElements = pages.slice();
      const size = getReaderPageSize();
      const mount = $("#flipbookMount");
      mount.innerHTML = "";
      mount.style.width = `${size.width * 2}px`;
      mount.style.height = `${size.height}px`;
      readerPageElements.forEach(page => {
        page.style.width = `${size.width}px`;
        page.style.height = `${size.height}px`;
        mount.append(page);
      });

      pageFlip = new St.PageFlip(mount, {
        width: size.width,
        height: size.height,
        size: "fixed",
        maxShadowOpacity: 0.22,
        showCover: true,
        showPageCorners: false,
        mobileScrollSupport: false,
        usePortrait: false,
        autoSize: false,
        flippingTime: 650,
        startPage: 0,
        drawShadow: true,
        disableFlipByClick: false
      });
      pageFlip.loadFromHTML(readerPageElements);
      pageFlip.on("flip", updateReaderControls);
      $("#readerLoading").hidden = true;
      requestAnimationFrame(() => requestAnimationFrame(updateCoverAlignment));
      updateReaderControls();
      notify("Revista lista para leer.");
    } catch (error) {
      console.error(error);
      $("#readerLoading").hidden = false;
      $("#readerProgress").textContent = "No se pudo preparar el visor. Comprueba que el PDF esté íntegro e inténtalo nuevamente.";
      notify("Ocurrió un problema al abrir la revista.");
    }
  }


  // =========================
  // FASE 4 · EXPORTACIÓN HTML5 / OFFLINE
  // =========================
  function setExportProgress(active, title = "Preparando publicación…", message = "Iniciando…", percent = 0) {
    const panel = $("#exportProgress");
    panel.hidden = !active;
    $("#exportProgressTitle").textContent = title;
    $("#exportProgressMessage").textContent = message;
    $("#exportProgressPercent").textContent = `${Math.round(percent)}%`;
    $("#exportProgressBar").style.width = `${Math.max(0, Math.min(100, percent))}%`;
  }

  function safeFileName(value) {
    return (value || "revista-digital")
      .normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "revista-digital";
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("No se pudo optimizar una página.")), type, quality);
    });
  }

  async function getExportProjects() {
    const projects = await FlipBookDB.getProjects();
    projects.sort((a, b) => b.updatedAt - a.updatedAt);
    const select = $("#exportProjectSelect");
    const selected = select.value;
    select.innerHTML = "";
    if (!projects.length) {
      select.add(new Option("Primero importa un PDF", ""));
      select.disabled = true;
      return;
    }
    select.disabled = false;
    select.add(new Option("Selecciona una revista…", ""));
    projects.forEach(project => select.add(new Option(`${project.title} · ${project.pageCount} páginas`, project.id)));
    if (projects.some(p => p.id === selected)) select.value = selected;
  }

  async function renderProjectPagesForExport(project, quality) {
    if (!window.pdfjsLib) throw new Error("PDF.js no está disponible. Comprueba tu conexión a Internet.");
    const buffer = await project.pdfBlob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages = [];
    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setExportProgress(true, "Convirtiendo páginas…", `Procesando página ${pageNumber} de ${pdf.numPages}`, (pageNumber - 1) / pdf.numPages * 70);
        const page = await pdf.getPage(pageNumber);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(1.65, 1800 / base.width, 1800 / base.height);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d", { alpha: false });
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await canvasToBlob(canvas, "image/webp", quality);
        pages.push({ number: pageNumber, width: canvas.width, height: canvas.height, blob });
        canvas.width = 0;
        canvas.height = 0;
        page.cleanup();
      }
    } finally {
      await pdf.destroy();
    }
    return pages;
  }

  function buildExportHtml(project, pages, branded) {
    const title = project.title.replace(/[<>&"]/g, "");
    const pageMarkup = pages.map((p, i) => `
      <div class="page" data-density="${i === 0 || i === pages.length - 1 ? "hard" : "soft"}">
        <img src="assets/pages/page-${String(p.number).padStart(3, "0")}.webp" alt="Página ${p.number}" draggable="false">
      </div>`).join("");
    const brand = branded ? '<div class="brand-mark">Publicado con FlipBook Studio</div>' : "";
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#111827">
<meta name="description" content="Revista digital interactiva: ${title}">
<title>${title}</title>
<link rel="stylesheet" href="css/reader.css">
</head>
<body>
<header class="toolbar">
  <div class="publication-title">${title}</div>
  <div class="controls">
    <button id="prev" aria-label="Página anterior">←</button>
    <span id="page-label">1 / ${pages.length}</span>
    <button id="next" aria-label="Página siguiente">→</button>
    <button id="zoom-out" aria-label="Alejar">−</button>
    <button id="zoom-in" aria-label="Acercar">+</button>
    <button id="fullscreen" aria-label="Pantalla completa">⛶</button>
  </div>
</header>
<main id="reader-stage" class="reader-stage">
  <div id="book" class="book">${pageMarkup}</div>
  ${brand}
</main>
<script src="js/page-flip.browser.min.js"><\/script>
<script src="js/reader.js"><\/script>
</body>
</html>`;
  }

  function buildExportReaderJs(pageCount) {
    return `(function(){
const stage=document.getElementById('reader-stage');
const book=document.getElementById('book');
const pages=[...book.querySelectorAll('.page')];
const firstImg=pages[0].querySelector('img');
let flip=null,zoom=1;
function fit(){
 const w=stage.clientWidth-32,h=stage.clientHeight-32;
 const ratio=firstImg.naturalWidth/firstImg.naturalHeight;
 const pageW=Math.min(w/2,h*ratio),pageH=pageW/ratio;
 book.style.width=(pageW*2)+'px';book.style.height=pageH+'px';
 if(flip && flip.update) flip.update();
}
function label(){
 if(!flip)return;
 const i=flip.getCurrentPageIndex(),last=flip.getPageCount()-1;
 let t=(i===0||i===last)?String(i===0?1:${pageCount}):String(Math.min(${pageCount},i+1));
 document.getElementById('page-label').textContent=t+' / ${pageCount}';
 document.getElementById('prev').disabled=i<=0;
 document.getElementById('next').disabled=i>=last;
}
function scale(){book.style.transform='scale('+zoom+')';}
Promise.all(pages.map(p=>{const im=p.querySelector('img');return im.decode?im.decode():new Promise(r=>{im.onload=r;im.onerror=r;});})).then(()=>{
 fit();
 const pageW=Math.round(firstImg.naturalWidth),pageH=Math.round(firstImg.naturalHeight);
 flip=new St.PageFlip(book,{width:pageW,height:pageH,size:'stretch',minWidth:180,maxWidth:1600,minHeight:260,maxHeight:2200,showCover:true,usePortrait:false,autoSize:true,showPageCorners:true,drawShadow:true,maxShadowOpacity:.22,flippingTime:650});
 flip.loadFromHTML(pages);flip.on('flip',label);label();
 requestAnimationFrame(()=>{fit();});
});
document.getElementById('prev').onclick=()=>flip&&flip.flipPrev();
document.getElementById('next').onclick=()=>flip&&flip.flipNext();
document.getElementById('zoom-in').onclick=()=>{zoom=Math.min(1.4,zoom+.1);scale();};
document.getElementById('zoom-out').onclick=()=>{zoom=Math.max(.7,zoom-.1);scale();};
document.getElementById('fullscreen').onclick=()=>!document.fullscreenElement?stage.requestFullscreen():document.exitFullscreen();
window.addEventListener('resize',()=>requestAnimationFrame(fit));
document.addEventListener('fullscreenchange',()=>requestAnimationFrame(fit));
document.addEventListener('keydown',e=>{if(!flip)return;if(e.key==='ArrowRight')flip.flipNext();if(e.key==='ArrowLeft')flip.flipPrev();});
})();`;
  }

  async function generatePublication(mode) {
    const projectId = $("#exportProjectSelect").value;
    if (!projectId) { notify("Selecciona primero una revista."); return; }
    if (!window.JSZip) { notify("No se pudo cargar el generador ZIP. Comprueba tu conexión."); return; }
    const project = await FlipBookDB.getProject(projectId);
    if (!project || !project.pdfBlob) { notify("No se encontró el PDF original de esta revista."); return; }
    const branded = $("#exportBranding").value === "branded";
    const quality = Number($("#exportImageQuality").value || 0.88);
    const slug = safeFileName(project.title);
    const zip = new JSZip();
    const folder = zip.folder(slug);
    const webRuntimeUrl = "https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.min.js";

    $("#exportWebBtn").disabled = true;
    $("#exportOfflineBtn").disabled = true;
    $("#exportResult").hidden = true;
    try {
      setExportProgress(true, "Preparando publicación…", "Convirtiendo el PDF en páginas optimizadas.", 0);
      const pages = await renderProjectPagesForExport(project, quality);
      pages.forEach((p, i) => {
        folder.file(`assets/pages/page-${String(p.number).padStart(3, "0")}.webp`, p.blob);
        setExportProgress(true, "Empaquetando imágenes…", `Añadiendo página ${i + 1} de ${pages.length}`, 70 + (i + 1) / pages.length * 12);
      });

      setExportProgress(true, "Preparando visor independiente…", "Incluyendo el motor de volteo dentro del paquete.", 84);
      const response = await fetch(webRuntimeUrl);
      if (!response.ok) throw new Error("No se pudo descargar el motor de volteo para incluirlo en el paquete.");
      const pageFlipSource = await response.text();
      folder.file("js/page-flip.browser.min.js", pageFlipSource);
      folder.file("js/reader.js", buildExportReaderJs(pages.length));
      folder.file("css/reader.css", buildExportCss(branded));
      folder.file("index.html", buildExportHtml(project, pages, branded));
      folder.file("LEEME.txt", mode === "offline"
        ? `REVISTA OFFLINE: ${project.title}\\n\\n1. Descomprime toda esta carpeta.\\n2. Abre index.html con doble clic en Chrome, Edge o Firefox.\\n3. Mantén juntas las carpetas assets, css y js.\\n\\nLa revista funciona localmente sin conexión a Internet.`
        : `REVISTA WEB: ${project.title}\\n\\n1. Descomprime el ZIP.\\n2. Sube la carpeta completa a tu alojamiento web.\\n3. Abre la dirección pública que termine en /index.html.\\n4. Para WordPress o Google Sites, utiliza el código iframe generado en FlipBook Studio.`);
      folder.file("codigo-iframe-ejemplo.txt",
        '<iframe src="https://TU-DOMINIO.com/ruta-de-la-revista/" title="' + project.title.replace(/["<>]/g, "") + '" width="100%" height="760" style="border:0;max-width:100%;" loading="lazy" allowfullscreen></iframe>');
      folder.file("manifest.json", JSON.stringify({
        title: project.title, pageCount: pages.length, format: "FlipBook Studio HTML5",
        version: "1.0", branding: branded ? "FlipBook Studio" : "none",
        generatedAt: new Date().toISOString(), imageFormat: "WebP"
      }, null, 2));

      setExportProgress(true, "Generando archivo ZIP…", "Comprimiendo la revista y sus recursos.", 93);
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
        meta => setExportProgress(true, "Generando archivo ZIP…", "Comprimiendo recursos…", 93 + meta.percent * 0.07));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}_${mode === "offline" ? "OFFLINE" : "WEB"}.zip`;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);

      const record = {
        id: `export_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        projectId, projectTitle: project.title, mode, branded, fileName: a.download,
        fileSize: blob.size, pageCount: pages.length, createdAt: Date.now()
      };
      await FlipBookDB.saveExport(record);
      await refreshProjects();
      await renderExportHistory();
      $("#exportResult").hidden = false;
      $("#exportResultMessage").textContent = `${project.title} · ${pages.length} páginas · ${formatBytes(blob.size)} · ${mode === "offline" ? "Paquete offline" : "Paquete web"}.`;
      setExportProgress(false);
      notify("La revista se exportó correctamente.");
    } catch (error) {
      console.error(error);
      setExportProgress(false);
      notify(error.message || "No se pudo generar la publicación.");
    } finally {
      $("#exportWebBtn").disabled = false;
      $("#exportOfflineBtn").disabled = false;
    }
  }

  function buildExportCss(branded) {
    return `*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;font-family:Arial,sans-serif;background:#e8edf4;color:#172033;overflow:hidden}.toolbar{height:58px;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 18px;border-bottom:1px solid #dce3ed;gap:12px}.publication-title{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.controls{display:flex;align-items:center;gap:8px}.controls button{border:1px solid #d7dfeb;background:#fff;border-radius:8px;padding:8px 12px;cursor:pointer;color:#1d4ed8}.controls button:disabled{opacity:.35;cursor:default}#page-label{font-size:13px;min-width:65px;text-align:center}.reader-stage{height:calc(100vh - 58px);width:100%;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:16px}.book{transform-origin:center center;margin:auto}.page{background:#fff;overflow:hidden}.page img{display:block;width:100%;height:100%;object-fit:fill;user-select:none;-webkit-user-drag:none}.brand-mark{position:absolute;right:12px;bottom:8px;color:#637083;font-size:10px;opacity:.7;pointer-events:none}button:focus-visible{outline:2px solid #2563eb;outline-offset:2px}@media(max-width:650px){.toolbar{height:auto;min-height:58px;align-items:flex-start;flex-direction:column;padding:9px 12px}.controls{width:100%;justify-content:center}.reader-stage{height:calc(100vh - 98px);padding:8px}}`;
  }

  async function renderExportHistory() {
    const list = $("#exportHistoryList");
    if (!list) return;
    const records = await FlipBookDB.getExports();
    records.sort((a, b) => b.createdAt - a.createdAt);
    list.innerHTML = "";
    if (!records.length) {
      const p = document.createElement("p"); p.className = "muted"; p.textContent = "Todavía no has generado exportaciones."; list.append(p); return;
    }
    records.slice(0, 12).forEach(item => {
      const row = document.createElement("div"); row.className = "export-history-row";
      const name = document.createElement("b"); name.textContent = item.projectTitle;
      const detail = document.createElement("small"); detail.textContent = `${item.mode === "offline" ? "Offline" : "Web"} · ${item.branded ? "Con marca" : "Sin marca"} · ${formatBytes(item.fileSize)} · ${formatDate(item.createdAt)}`;
      row.append(name, detail); list.append(row);
    });
  }

  $("#exportWebBtn").addEventListener("click", () => generatePublication("web"));
  $("#exportOfflineBtn").addEventListener("click", () => generatePublication("offline"));
  $("#generateEmbedBtn").addEventListener("click", () => {
    const url = $("#exportPublicUrl").value.trim();
    if (!/^https?:\/\//i.test(url)) { notify("Introduce primero una dirección pública que comience con https:// o http://."); return; }
    const title = $("#exportProjectSelect").selectedOptions[0]?.textContent.split(" · ")[0] || "Revista digital";
    $("#exportEmbedCode").value = `<iframe src="${url.replace(/"/g, "&quot;")}" title="${title.replace(/"/g, "&quot;")}" width="100%" height="760" style="border:0;max-width:100%;" loading="lazy" allowfullscreen></iframe>`;
  });
  $("#copyEmbedBtn").addEventListener("click", async () => {
    const value = $("#exportEmbedCode").value;
    if (!value) { notify("Genera primero el código de inserción."); return; }
    try { await navigator.clipboard.writeText(value); notify("Código iframe copiado."); }
    catch (_) { $("#exportEmbedCode").select(); document.execCommand("copy"); notify("Código iframe copiado."); }
  });

  function closeViewer() {
    if (pageFlip) { try { pageFlip.destroy(); } catch (_) {} pageFlip = null; }
    if (activePdf) { try { activePdf.destroy(); } catch (_) {} activePdf = null; }
    activeProjectId = null;
    $("#flipbookMount").innerHTML = "";
    readerPageElements = [];
    readerPageMap = [];
    navigate("projects");
  }

  $("#closeViewerBtn").addEventListener("click", closeViewer);
  $("#previousPageBtn").addEventListener("click", () => pageFlip && pageFlip.flipPrev());
  $("#nextPageBtn").addEventListener("click", () => pageFlip && pageFlip.flipNext());
  $("#zoomInBtn").addEventListener("click", () => { readerZoom = Math.min(1.3, readerZoom + .1); updateCoverAlignment(); $("#zoomLabel").textContent = `${Math.round(readerZoom * 100)}%`; });
  $("#zoomOutBtn").addEventListener("click", () => { readerZoom = Math.max(.8, readerZoom - .1); updateCoverAlignment(); $("#zoomLabel").textContent = `${Math.round(readerZoom * 100)}%`; });
  $("#fullscreenBtn").addEventListener("click", async () => { const stage = $("#flipbookStage"); try { if (!document.fullscreenElement) await stage.requestFullscreen(); else await document.exitFullscreen(); } catch (_) { notify("No se pudo activar pantalla completa en este navegador."); } });
  document.addEventListener("fullscreenchange", () => {
    // No reconstruir StPageFlip: solo ajustar la escala visual del libro existente.
    requestAnimationFrame(() => requestAnimationFrame(updateCoverAlignment));
  });
  window.addEventListener("resize", () => {
    requestAnimationFrame(updateCoverAlignment);
  });
  document.addEventListener("keydown", event => {
    if (!pageFlip || !$("#view-viewer").classList.contains("active")) return;
    if (event.key === "ArrowRight") pageFlip.flipNext();
    if (event.key === "ArrowLeft") pageFlip.flipPrev();
    if (event.key === "Escape" && document.fullscreenElement) document.exitFullscreen();
  });

  $$(".nav-item[data-view]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.view)));
  $$("[data-goto]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.goto)));
  $("#newProjectBtn").addEventListener("click", () => navigate("import"));
  $("#heroImportBtn").addEventListener("click", () => navigate("import"));
  $("#emptyImportBtn").addEventListener("click", () => navigate("import"));
  $("#pdfInput").addEventListener("change", event => importPDF(event.target.files[0]));
  $("#importAnotherBtn").addEventListener("click", () => {
    $("#pdfResult").hidden = true; $("#pdfInput").value = ""; navigate("import");
  });
  $("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

  const zone = $("#uploadZone");
  ["dragenter","dragover"].forEach(name => zone.addEventListener(name, event => { event.preventDefault(); zone.classList.add("dragging"); }));
  ["dragleave","drop"].forEach(name => zone.addEventListener(name, event => { event.preventDefault(); zone.classList.remove("dragging"); }));
  zone.addEventListener("drop", event => importPDF(event.dataTransfer.files[0]));

  $("#clearDataBtn").addEventListener("click", async () => {
    if (!confirm("¿Seguro que deseas borrar todos los proyectos y los PDF originales guardados en este navegador? Esta acción no se puede deshacer.")) return;
    await FlipBookDB.clearProjects(); await refreshProjects(); notify("Proyectos y documentos locales eliminados.");
  });

  FlipBookDB.healthCheck().then(() => refreshProjects()).catch(error => {
    console.error(error); notify("No se pudo iniciar IndexedDB. Prueba con Chrome o Edge actualizado.");
  });
})();