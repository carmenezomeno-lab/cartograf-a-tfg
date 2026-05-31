let plano;
let mascara;
let mascaraPermitida;
let capaHeatmap;
let componentesMascara;
let mascarasPorComponente = new Map();
let umbralMascara = 140;
let filasCSV;
let particulas = [];
let particulasVisibles = [];
let ultimaParticulaActiva = null;
let sonidoActual = null;

let sonidoTriangulo;
let sonidoCuadrado;
let sonidoCirculo;

const PLANO_ORIGINAL_ANCHO = 300;
const PLANO_ORIGINAL_ALTO = 200;

const DESPLAZAMIENTO_X = 20;
const DESPLAZAMIENTO_Y = 2;

const UI_PADDING = 16;
const BOTON_ALTO = 38;
const BOTON_MARGEN = 13;
const BOTON_RADIO = 14;
const PANEL_ANCHO_MAX = 560;
const PANEL_FILTROS_ANCHO = 600;
const PANEL_FILTROS_ALTO = 250;
const PANEL_FILTROS_MARGEN = 12;

const COLUMNAS_CSV = {
  genero: 0,
  perfil: 1,
  tipo: 2,
  emocion: 3,
  frecuencia: 4,
  intensidad: 5,
  momento: 6,
  coordenadas: 7,
};

const filtros = {
  genero: new Set(),
  perfil: new Set(),
  momento: new Set(),
  tipo: new Set(),
  emocion: new Set(),
};

const opcionesFiltro = {
  genero: [
    { valor: "hombre", etiqueta: "Hombre" },
    { valor: "mujer", etiqueta: "Mujer" },
  ],
  perfil: [
    { valor: "usuario", etiqueta: "Usuario" },
    { valor: "trabajador", etiqueta: "Trabajador" },
  ],
  momento: [
    { valor: "manana", etiqueta: "Mañana" },
    { valor: "tarde", etiqueta: "Tarde" },
  ],
  tipo: [
    { valor: "triangulo", etiqueta: "Ruidos industriales" },
    { valor: "cuadrado", etiqueta: "Ruidos de personas" },
    { valor: "circulo", etiqueta: "Sonidos naturales" },
  ],
  emocion: [
    { valor: "molestia", etiqueta: "Molestia" },
    { valor: "estres", etiqueta: "Estrés" },
    { valor: "neutral", etiqueta: "Neutral" },
    { valor: "calma", etiqueta: "Calma" },
    { valor: "alegria", etiqueta: "Alegria" },
  ],
};

const gruposUI = [
  { clave: "genero", titulo: "Genero" },
  { clave: "perfil", titulo: "Perfil" },
  { clave: "momento", titulo: "Momento" },
  { clave: "tipo", titulo: "Tipo" },
  { clave: "emocion", titulo: "Emocion" },
];

const botonesFiltro = [];
const SECUENCIA_AUTOPLAY = [
  { clave: "genero", valor: "hombre", titulo: "Hombres" },
  { clave: "genero", valor: "mujer", titulo: "Mujeres" },
  { clave: "momento", valor: "manana", titulo: "Mañana" },
  { clave: "momento", valor: "tarde", titulo: "Tarde" },
  { clave: "tipo", valor: "triangulo", titulo: "Ruidos triangulos" },
  { clave: "tipo", valor: "cuadrado", titulo: "Ruidos cuadrados" },
  { clave: "tipo", valor: "circulo", titulo: "Ruidos circulos" },
  { clave: "emocion", valor: "calma", titulo: "Calma" },
  { clave: "emocion", valor: "alegria", titulo: "Alegria" },
  { clave: "emocion", valor: "neutral", titulo: "Neutral" },
  { clave: "emocion", valor: "molestia", titulo: "Molestia" },
  { clave: "emocion", valor: "estres", titulo: "Estres" },
];
const AUTOPLAY_DURACION_MS = 2200;

let escalaVista = 1;
let offsetX = 0;
let offsetY = 0;
let autoplayActivo = false;
let autoplayIndice = 0;
let autoplayUltimoCambio = 0;
let tituloAutoplay = "";

function preload() {
  plano = loadImage("plano6.jpg");
  mascara = loadImage("mascara2.jpg");
  filasCSV = loadStrings("datos.csv");

  sonidoTriangulo = loadSound("sonidos/triangulo1.mp3");
  sonidoCuadrado = loadSound("sonidos/cuadrado3.mp3");
  sonidoCirculo = loadSound("sonidos/circulo2.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CORNER);
  ellipseMode(CENTER);
  rectMode(CORNER);
  textFont("Corbel");
  textSize(13);

  prepararRecursosMascara();

  particulas = parsearCSV(filasCSV);
  inicializarFiltros();
  actualizarParticulasVisibles();
  recalcularLayout();
}

function draw() {
  background(244, 242, 238);

  const mousePlanoX = (mouseX - offsetX) / escalaVista;
  const mousePlanoY = (mouseY - offsetY) / escalaVista;
  const dentroPlano =
    mouseX >= offsetX &&
    mouseX <= offsetX + plano.width * escalaVista &&
    mouseY >= offsetY &&
    mouseY <= offsetY + plano.height * escalaVista;

  const particulaActiva = dentroPlano
    ? buscarParticulaBajoCursor(mousePlanoX, mousePlanoY)
    : null;

  actualizarSonidoHover(particulaActiva);
  ultimaParticulaActiva = particulaActiva;

  push();
  translate(offsetX, offsetY);
  scale(escalaVista);

  image(plano, 0, 0);
  actualizarAutoplay();
  dibujarManchasSuaves(particulaActiva);
  dibujarTituloAutoplay();

  for (const particula of particulasVisibles) {
    particula.dibujar(particula === particulaActiva);
  }

  dibujarPanelFiltros();

  pop();

  if (particulaActiva) {
    dibujarPanelInfo(particulaActiva);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  recalcularLayout();
}

function mousePressed() {
  userStartAudio();

  const mouseLocalX = (mouseX - offsetX) / escalaVista;
  const mouseLocalY = (mouseY - offsetY) / escalaVista;

  for (const boton of botonesFiltro) {
    if (estaDentro(mouseLocalX, mouseLocalY, boton)) {
      if (autoplayActivo && boton.clave !== "autoplay") {
        detenerAutoplay(false);
      }
      boton.onClick();
      return;
    }
  }
}

function recalcularLayout() {
  const margen = 20;
  const escalaX = (windowWidth - margen * 2) / plano.width;
  const escalaY = (windowHeight - margen * 2) / plano.height;

  escalaVista = min(escalaX, escalaY);
  escalaVista = min(escalaVista, 1);

  const anchoMostrado = plano.width * escalaVista;
  const altoMostrado = plano.height * escalaVista;

  offsetX = (windowWidth - anchoMostrado) / 2;
  offsetY = (windowHeight - altoMostrado) / 2;
}

function prepararRecursosMascara() {
  capaHeatmap = createGraphics(plano.width, plano.height);
  capaHeatmap.pixelDensity(1);

  if (!mascara) return;

  if (mascara.width !== plano.width || mascara.height !== plano.height) {
    const mascaraRedimensionada = mascara.get();
    mascaraRedimensionada.resize(plano.width, plano.height);
    mascara = mascaraRedimensionada;
  }

  mascaraPermitida = createImage(plano.width, plano.height);
  mascara.loadPixels();
  mascaraPermitida.loadPixels();

  for (let i = 0; i < mascara.pixels.length; i += 4) {
    const brillo =
      (mascara.pixels[i] + mascara.pixels[i + 1] + mascara.pixels[i + 2]) / 3;

    mascaraPermitida.pixels[i] = 255;
    mascaraPermitida.pixels[i + 1] = 255;
    mascaraPermitida.pixels[i + 2] = 255;
    mascaraPermitida.pixels[i + 3] = brillo;
  }

  mascaraPermitida.updatePixels();
  prepararComponentesMascara();
}

function prepararComponentesMascara() {
  const ancho = plano.width;
  const alto = plano.height;
  const total = ancho * alto;

  componentesMascara = new Int32Array(total);
  componentesMascara.fill(-1);
  mascarasPorComponente.clear();

  const visitables = new Uint8Array(total);

  for (let i = 0, p = 0; i < total; i++, p += 4) {
    const brillo =
      (mascara.pixels[p] + mascara.pixels[p + 1] + mascara.pixels[p + 2]) / 3;
    visitables[i] = brillo >= umbralMascara ? 1 : 0;
  }

  const cola = new Int32Array(total);
  let componenteActual = 0;

  for (let i = 0; i < total; i++) {
    if (!visitables[i] || componentesMascara[i] !== -1) continue;

    let inicio = 0;
    let fin = 0;
    cola[fin++] = i;
    componentesMascara[i] = componenteActual;

    while (inicio < fin) {
      const actual = cola[inicio++];
      const x = actual % ancho;
      const y = Math.floor(actual / ancho);

      if (x > 0) {
        const izquierda = actual - 1;
        if (visitables[izquierda] && componentesMascara[izquierda] === -1) {
          componentesMascara[izquierda] = componenteActual;
          cola[fin++] = izquierda;
        }
      }

      if (x < ancho - 1) {
        const derecha = actual + 1;
        if (visitables[derecha] && componentesMascara[derecha] === -1) {
          componentesMascara[derecha] = componenteActual;
          cola[fin++] = derecha;
        }
      }

      if (y > 0) {
        const arriba = actual - ancho;
        if (visitables[arriba] && componentesMascara[arriba] === -1) {
          componentesMascara[arriba] = componenteActual;
          cola[fin++] = arriba;
        }
      }

      if (y < alto - 1) {
        const abajo = actual + ancho;
        if (visitables[abajo] && componentesMascara[abajo] === -1) {
          componentesMascara[abajo] = componenteActual;
          cola[fin++] = abajo;
        }
      }
    }

    componenteActual++;
  }
}

function obtenerComponenteMascara(x, y) {
  if (!componentesMascara) return -1;

  const ix = constrain(Math.round(x), 0, plano.width - 1);
  const iy = constrain(Math.round(y), 0, plano.height - 1);
  return componentesMascara[iy * plano.width + ix];
}

function obtenerMascaraComponente(componenteId) {
  if (componenteId < 0 || !componentesMascara) return null;
  if (mascarasPorComponente.has(componenteId)) {
    return mascarasPorComponente.get(componenteId);
  }

  const mascaraComponente = createImage(plano.width, plano.height);
  mascaraComponente.loadPixels();

  for (let i = 0, p = 0; i < componentesMascara.length; i++, p += 4) {
    const visible = componentesMascara[i] === componenteId ? 255 : 0;
    mascaraComponente.pixels[p] = 255;
    mascaraComponente.pixels[p + 1] = 255;
    mascaraComponente.pixels[p + 2] = 255;
    mascaraComponente.pixels[p + 3] = visible;
  }

  mascaraComponente.updatePixels();
  mascarasPorComponente.set(componenteId, mascaraComponente);
  return mascaraComponente;
}

function parsearCSV(lineas) {
  const resultado = [];
  const escalaX = plano.width / PLANO_ORIGINAL_ANCHO;
  const escalaY = plano.height / PLANO_ORIGINAL_ALTO;

  for (let i = 1; i < lineas.length; i++) {
    const linea = lineas[i].trim();
    if (!linea) continue;

    const columnas = linea.split(";");
    if (columnas.length < 8) continue;

    const genero = limpiarTexto(columnas[COLUMNAS_CSV.genero]);
    const perfil = limpiarTexto(columnas[COLUMNAS_CSV.perfil]);
    const tipo = limpiarTexto(columnas[COLUMNAS_CSV.tipo]);
    const emocion = limpiarTexto(columnas[COLUMNAS_CSV.emocion]);
    const frecuencia = Number(columnas[COLUMNAS_CSV.frecuencia]);
    const intensidad = Number(columnas[COLUMNAS_CSV.intensidad]);
    const momento = limpiarTexto(columnas[COLUMNAS_CSV.momento]);
    const coordenadas = columnas[COLUMNAS_CSV.coordenadas].split(",");

    if (coordenadas.length < 2) continue;

    const xOriginal = Number(coordenadas[0]);
    const yOriginal = Number(coordenadas[1]);

    const x = xOriginal * escalaX + DESPLAZAMIENTO_X;
    const y = plano.height - yOriginal * escalaY - DESPLAZAMIENTO_Y;

    resultado.push(
      new Particula({
        x,
        y,
        xOriginal,
        yOriginal,
        genero,
        perfil,
        tipo,
        emocion,
        frecuencia,
        intensidad,
        momento,
      })
    );
  }

  return resultado;
}

function inicializarFiltros() {
  for (const clave in opcionesFiltro) {
    for (const opcion of opcionesFiltro[clave]) {
      filtros[clave].add(opcion.valor);
    }
  }

  construirBotones();
}

function construirBotones() {
  botonesFiltro.length = 0;
  const anchoPanel = min(
    plano.width - PANEL_FILTROS_MARGEN * 2,
    PANEL_FILTROS_ANCHO
  );

  let y = UI_PADDING;

  for (const grupo of gruposUI) {
    let x = UI_PADDING;

    botonesFiltro.push({
      x,
      y,
      w: textWidth(grupo.titulo) + 14,
      h: BOTON_ALTO,
      etiqueta: grupo.titulo,
      clave: grupo.clave,
      valor: null,
      esTitulo: true,
      activa: false,
      onClick: () => {},
    });

    x += botonesFiltro[botonesFiltro.length - 1].w + BOTON_MARGEN;

    for (const opcion of opcionesFiltro[grupo.clave]) {
      const boton = {
        x,
        y,
        w: min(PANEL_ANCHO_MAX, textWidth(opcion.etiqueta) + 34),
        h: BOTON_ALTO,
        etiqueta: opcion.etiqueta,
        clave: grupo.clave,
        valor: opcion.valor,
        activa: filtros[grupo.clave].has(opcion.valor),
        onClick: () => alternarFiltro(grupo.clave, opcion.valor),
      };

      botonesFiltro.push(boton);
      x += boton.w + BOTON_MARGEN;
    }

    y += BOTON_ALTO + BOTON_MARGEN;
  }

  const etiquetaTodo = "Visualizar todo";
  botonesFiltro.push({
    x: UI_PADDING,
    y,
    w: textWidth(etiquetaTodo) + 32,
    h: BOTON_ALTO,
    etiqueta: etiquetaTodo,
    clave: "todo",
    valor: "todo",
    activa: filtrosCompletosActivos(),
    onClick: () => activarTodosLosFiltros(),
  });

  botonesFiltro.push({
    x: anchoPanel - 102,
    y,
    w: 86,
    h: BOTON_ALTO,
    etiqueta: autoplayActivo ? "Pause" : "Play",
    clave: "autoplay",
    valor: "autoplay",
    activa: autoplayActivo,
    onClick: () => alternarAutoplay(),
  });
}

function alternarFiltro(clave, valor) {
  const seleccion = filtros[clave];
  const opciones = opcionesFiltro[clave].map((opcion) => opcion.valor);

  if (seleccion.has(valor)) {
    if (seleccion.size === 1) {
      for (const item of opciones) {
        seleccion.add(item);
      }
    } else {
      seleccion.clear();
      seleccion.add(valor);
    }
  } else {
    seleccion.add(valor);
  }

  actualizarEstadoBotones();
  actualizarParticulasVisibles();
}

function activarTodosLosFiltros() {
  for (const clave in opcionesFiltro) {
    filtros[clave].clear();
    for (const opcion of opcionesFiltro[clave]) {
      filtros[clave].add(opcion.valor);
    }
  }

  actualizarEstadoBotones();
  actualizarParticulasVisibles();
}

function aplicarFiltroExclusivo(clave, valor) {
  for (const nombreClave in opcionesFiltro) {
    filtros[nombreClave].clear();
    for (const opcion of opcionesFiltro[nombreClave]) {
      filtros[nombreClave].add(opcion.valor);
    }
  }

  filtros[clave].clear();
  filtros[clave].add(valor);

  actualizarEstadoBotones();
  actualizarParticulasVisibles();
}

function alternarAutoplay() {
  if (autoplayActivo) {
    detenerAutoplay(false);
    return;
  }

  autoplayActivo = true;
  autoplayIndice = 0;
  autoplayUltimoCambio = millis();
  aplicarPasoAutoplay();
}

function detenerAutoplay(restaurarFiltros = true) {
  autoplayActivo = false;
  tituloAutoplay = "";

  if (restaurarFiltros) {
    activarTodosLosFiltros();
  } else {
    actualizarEstadoBotones();
  }
}

function aplicarPasoAutoplay() {
  const paso = SECUENCIA_AUTOPLAY[autoplayIndice];
  if (!paso) return;

  tituloAutoplay = paso.titulo;
  aplicarFiltroExclusivo(paso.clave, paso.valor);
}

function actualizarAutoplay() {
  if (!autoplayActivo) return;
  if (millis() - autoplayUltimoCambio < AUTOPLAY_DURACION_MS) return;

  autoplayIndice = (autoplayIndice + 1) % SECUENCIA_AUTOPLAY.length;
  autoplayUltimoCambio = millis();
  aplicarPasoAutoplay();
}

function filtrosCompletosActivos() {
  for (const clave in opcionesFiltro) {
    if (filtros[clave].size !== opcionesFiltro[clave].length) {
      return false;
    }
  }
  return true;
}

function actualizarEstadoBotones() {
  for (const boton of botonesFiltro) {
    if (boton.esTitulo) continue;

    if (boton.clave === "autoplay") {
      boton.activa = autoplayActivo;
      boton.etiqueta = autoplayActivo ? "Pause" : "Play";
      continue;
    }

    if (boton.etiqueta === "Visualizar todo") {
      boton.activa = filtrosCompletosActivos();
      continue;
    }

    for (const clave in opcionesFiltro) {
      const opcion = opcionesFiltro[clave].find(
        (item) => item.etiqueta === boton.etiqueta
      );
      if (opcion) {
        boton.activa = filtros[clave].has(opcion.valor);
      }
    }
  }
}

function actualizarParticulasVisibles() {
  particulasVisibles = particulas.filter((particula) => {
    return (
      filtros.genero.has(particula.genero) &&
      filtros.perfil.has(particula.perfil) &&
      filtros.momento.has(particula.momento) &&
      filtros.tipo.has(particula.tipo) &&
      filtros.emocion.has(particula.emocion)
    );
  });

  if (!particulasVisibles.includes(ultimaParticulaActiva)) {
    detenerSonidoActual();
    ultimaParticulaActiva = null;
  }
}

function dibujarPanelFiltros() {
  noStroke();
  fill(241, 236, 229, 238);
  rect(
    PANEL_FILTROS_MARGEN,
    PANEL_FILTROS_MARGEN,
    min(plano.width - PANEL_FILTROS_MARGEN * 2, PANEL_FILTROS_ANCHO),
    PANEL_FILTROS_ALTO,
    18
  );

  for (const boton of botonesFiltro) {
    if (boton.esTitulo) {
      fill(20, 20, 20);
      textAlign(LEFT, CENTER);
      textStyle(BOLD);
      textSize(16);
      text(boton.etiqueta, boton.x, boton.y + boton.h / 2);
      textStyle(NORMAL);
      continue;
    }

    const esEmocion = boton.clave === "emocion";
    const colorEmocion = esEmocion ? colorPorEmocion(boton.valor) : null;
    const esAutoplay = boton.clave === "autoplay";

    if (esEmocion) {
      if (boton.activa) {
        fill(red(colorEmocion), green(colorEmocion), blue(colorEmocion), 235);
        stroke(red(colorEmocion), green(colorEmocion), blue(colorEmocion), 245);
      } else {
        fill(red(colorEmocion), green(colorEmocion), blue(colorEmocion), 98);
        stroke(red(colorEmocion), green(colorEmocion), blue(colorEmocion), 165);
      }
    } else if (esAutoplay) {
      if (boton.activa) {
        fill(224, 217, 208, 248);
        stroke(50, 46, 42, 165);
      } else {
        fill(247, 243, 237, 248);
        stroke(110, 102, 94, 110);
      }
    } else {
      if (boton.activa) {
        fill(224, 217, 208, 248);
        stroke(50, 46, 42, 165);
      } else {
        fill(247, 243, 237, 248);
        stroke(110, 102, 94, 110);
      }
    }

    strokeWeight(1.05);
    rect(boton.x, boton.y, boton.w, boton.h, BOTON_RADIO);
    noStroke();

    fill(15, 15, 15);
    textAlign(LEFT, CENTER);
    textSize(15);
    text(boton.etiqueta, boton.x + 14, boton.y + boton.h / 2);
  }
}

function dibujarTituloAutoplay() {
  if (!autoplayActivo || !tituloAutoplay) return;

  textAlign(CENTER, CENTER);
  textSize(28);
  textStyle(BOLD);

  const anchoCaja = textWidth(tituloAutoplay) + 48;
  const xCaja = plano.width * 0.5 - anchoCaja * 0.5;
  const yCaja = 18;

  noStroke();
  fill(248, 245, 240, 228);
  rect(xCaja, yCaja, anchoCaja, 52, 16);

  fill(28, 30, 36);
  text(tituloAutoplay, plano.width * 0.5, yCaja + 27);
  textStyle(NORMAL);
}

function buscarParticulaBajoCursor(mx, my) {
  for (let i = particulasVisibles.length - 1; i >= 0; i--) {
    if (particulasVisibles[i].contienePunto(mx, my)) {
      return particulasVisibles[i];
    }
  }
  return null;
}

function dibujarManchasSuaves(particulaActiva) {
  if (!capaHeatmap || !mascaraPermitida) return;

  if (autoplayActivo) {
    dibujarManchasPorGruposVisibles(0.9);
    return;
  }

  if (particulaActiva) {
    capaHeatmap.clear();

    const componenteActivo = obtenerComponenteMascara(
      particulaActiva.x,
      particulaActiva.y
    );
    const mascaraComponente = obtenerMascaraComponente(componenteActivo);

    if (!mascaraComponente) return;

    const grupo = particulasVisibles.filter((particula) => {
      return (
        particula.emocion === particulaActiva.emocion &&
        obtenerComponenteMascara(particula.x, particula.y) === componenteActivo
      );
    });

    if (grupo.length === 0) return;

    dibujarHeatmapGrupo(capaHeatmap, grupo, particulaActiva.baseColor, 1.08);

    const heatmapRecortado = capaHeatmap.get();
    heatmapRecortado.mask(mascaraComponente);
    image(heatmapRecortado, 0, 0);
    return;
  }

  dibujarManchasPorGruposVisibles(0.82);
}

function dibujarManchasPorGruposVisibles(intensidadBase) {
  const gruposPorComponente = new Map();

  for (const particula of particulasVisibles) {
    const componenteId = obtenerComponenteMascara(particula.x, particula.y);
    if (componenteId < 0) continue;

    const claveGrupo = `${componenteId}-${particula.emocion}`;
    if (!gruposPorComponente.has(claveGrupo)) {
      gruposPorComponente.set(claveGrupo, {
        componenteId,
        color: particula.baseColor,
        particulas: [],
      });
    }

    gruposPorComponente.get(claveGrupo).particulas.push(particula);
  }

  for (const grupo of gruposPorComponente.values()) {
    const mascaraComponente = obtenerMascaraComponente(grupo.componenteId);
    if (!mascaraComponente || grupo.particulas.length === 0) continue;

    capaHeatmap.clear();
    dibujarHeatmapGrupo(
      capaHeatmap,
      grupo.particulas,
      grupo.color,
      intensidadBase
    );

    const heatmapRecortado = capaHeatmap.get();
    heatmapRecortado.mask(mascaraComponente);
    image(heatmapRecortado, 0, 0);
  }
}

function dibujarHeatmapGrupo(target, grupo, baseColor, intensidad) {
  target.push();
  target.blendMode(MULTIPLY);

  for (const particula of grupo) {
    dibujarHaloCalor(
      target,
      particula.x,
      particula.y,
      particula.tamano,
      baseColor,
      intensidad
    );
  }

  target.pop();
}

function dibujarHaloCalor(target, x, y, tamano, baseColor, intensidad) {
  const radioBase = tamano * 4.7;

  target.noStroke();

  target.fill(red(baseColor), green(baseColor), blue(baseColor), 9 * intensidad);
  target.ellipse(x, y, radioBase * 3.2, radioBase * 3.2);

  target.fill(red(baseColor), green(baseColor), blue(baseColor), 14 * intensidad);
  target.ellipse(x, y, radioBase * 2.5, radioBase * 2.5);

  target.fill(red(baseColor), green(baseColor), blue(baseColor), 20 * intensidad);
  target.ellipse(x, y, radioBase * 1.92, radioBase * 1.92);

  target.fill(red(baseColor), green(baseColor), blue(baseColor), 27 * intensidad);
  target.ellipse(x, y, radioBase * 1.42, radioBase * 1.42);

  target.fill(red(baseColor), green(baseColor), blue(baseColor), 35 * intensidad);
  target.ellipse(x, y, radioBase * 1.02, radioBase * 1.02);

  target.fill(red(baseColor), green(baseColor), blue(baseColor), 29 * intensidad);
  target.ellipse(x, y, radioBase * 0.72, radioBase * 0.72);
}

function dibujarPanelInfo(particula) {
  const lineas = [
    `Emocion: ${capitalizar(particula.emocion)}`,
    `Forma: ${etiquetaTipo(particula.tipo)}`,
    `Genero: ${capitalizar(particula.genero)}`,
    `Perfil: ${capitalizar(particula.perfil)}`,
    `Momento: ${capitalizar(particula.momento)}`,
    `Frecuencia: ${particula.frecuencia}`,
    `Intensidad: ${particula.intensidad}`,
    `Coordenadas: ${redondear(particula.xOriginal)}, ${redondear(
      particula.yOriginal
    )}`,
  ];

  const padding = 16;
  const altoLinea = 22;
  let anchoCaja = 0;

  textSize(15);
  textAlign(LEFT, TOP);

  for (const linea of lineas) {
    anchoCaja = max(anchoCaja, textWidth(linea));
  }

  anchoCaja += padding * 2 + 10;
  const altoCaja = lineas.length * altoLinea + padding * 2;
  const xCaja = offsetX + plano.width * escalaVista - anchoCaja - 18;
  const yCaja = offsetY + 18;

  stroke(
    red(particula.baseColor),
    green(particula.baseColor),
    blue(particula.baseColor),
    235
  );
  strokeWeight(2);
  fill(250, 247, 242, 244);
  rect(xCaja, yCaja, anchoCaja, altoCaja, 14);

  noStroke();
  fill(22);
  for (let i = 0; i < lineas.length; i++) {
    text(lineas[i], xCaja + padding, yCaja + padding + i * altoLinea);
  }
}

function actualizarSonidoHover(particulaActiva) {
  if (getAudioContext().state !== "running") return;

  if (!particulaActiva) {
    detenerSonidoActual();
    return;
  }

  if (particulaActiva === ultimaParticulaActiva) {
    return;
  }

  detenerSonidoActual();

  let nuevoSonido = null;

  if (particulaActiva.tipo === "triangulo") nuevoSonido = sonidoTriangulo;
  if (particulaActiva.tipo === "cuadrado") nuevoSonido = sonidoCuadrado;
  if (particulaActiva.tipo === "circulo") nuevoSonido = sonidoCirculo;

  if (!nuevoSonido) return;

  sonidoActual = nuevoSonido;
  sonidoActual.setVolume(0.45);
  sonidoActual.loop();
}

function detenerSonidoActual() {
  if (sonidoActual && sonidoActual.isPlaying()) {
    sonidoActual.stop();
  }
  sonidoActual = null;
}

function limpiarTexto(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function capitalizar(texto) {
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function redondear(valor) {
  return Number(valor.toFixed(2));
}

function etiquetaTipo(tipo) {
  if (tipo === "triangulo") return "Ruidos industriales";
  if (tipo === "cuadrado") return "Ruidos de personas";
  if (tipo === "circulo") return "Sonidos naturales";
  return capitalizar(tipo);
}

function colorPorEmocion(emocion) {
  if (emocion === "molestia") return color(255, 0, 81);
  if (emocion === "estres") return color(141, 95, 217);
  if (emocion === "neutral") return color(207, 207, 194);
  if (emocion === "alegria") return color(240, 255, 102);
  if (emocion === "calma") return color(66, 156, 76);
  return color(120, 120, 120);
}

function colorSaturadoPorFrecuencia(baseColor, frecuencia) {
  const gris = (red(baseColor) + green(baseColor) + blue(baseColor)) / 3;
  const mezcla = map(constrain(frecuencia, 1, 5), 1, 5, 0.55, 1);

  return color(
    lerp(gris, red(baseColor), mezcla),
    lerp(gris, green(baseColor), mezcla),
    lerp(gris, blue(baseColor), mezcla)
  );
}

function alphaPorFrecuencia(frecuencia) {
  return map(constrain(frecuencia, 1, 5), 1, 5, 95, 255);
}

function tamanoPorIntensidad(intensidad) {
  if (intensidad <= 1) return 10;
  if (intensidad === 2) return 14;
  if (intensidad === 3) return 18;
  if (intensidad === 4) return 22;
  return 26;
}

function estaDentro(px, py, caja) {
  return (
    px >= caja.x &&
    px <= caja.x + caja.w &&
    py >= caja.y &&
    py <= caja.y + caja.h
  );
}

class Particula {
  constructor({
    x,
    y,
    xOriginal,
    yOriginal,
    genero,
    perfil,
    tipo,
    emocion,
    frecuencia,
    intensidad,
    momento,
  }) {
    this.x = x;
    this.y = y;
    this.xOriginal = xOriginal;
    this.yOriginal = yOriginal;
    this.genero = genero;
    this.perfil = perfil;
    this.tipo = tipo;
    this.emocion = emocion;
    this.frecuencia = frecuencia;
    this.intensidad = intensidad;
    this.momento = momento;
    this.baseColor = colorSaturadoPorFrecuencia(
      colorPorEmocion(emocion),
      frecuencia
    );
    this.alpha = alphaPorFrecuencia(frecuencia);
    this.tamano = tamanoPorIntensidad(intensidad);
    this.radioHalo = map(constrain(intensidad, 1, 5), 1, 5, 20, 44);
  }

  dibujar(destacada = false) {
    this.dibujarHaloParticula();

    stroke(14, 14, 14, 80);
    strokeWeight(destacada ? 1 : 0.6);
    fill(
      red(this.baseColor),
      green(this.baseColor),
      blue(this.baseColor),
      this.alpha * 0.42
    );

    if (this.tipo === "circulo") {
      ellipse(this.x, this.y, this.tamano, this.tamano);
      return;
    }

    if (this.tipo === "cuadrado") {
      rectMode(CENTER);
      rect(this.x, this.y, this.tamano, this.tamano);
      rectMode(CORNER);
      return;
    }

    if (this.tipo === "triangulo") {
      this.dibujarTriangulo();
      return;
    }

    ellipse(this.x, this.y, this.tamano, this.tamano);
  }

  dibujarHaloParticula() {
    const ctx = drawingContext;
    const colorCentro = `rgba(${red(this.baseColor)}, ${green(
      this.baseColor
    )}, ${blue(this.baseColor)}, 0.48)`;
    const colorMedio = `rgba(${red(this.baseColor)}, ${green(
      this.baseColor
    )}, ${blue(this.baseColor)}, 0.28)`;
    const colorExterior = `rgba(${red(this.baseColor)}, ${green(
      this.baseColor
    )}, ${blue(this.baseColor)}, 0)`;
    const gradiente = ctx.createRadialGradient(
      this.x,
      this.y,
      0,
      this.x,
      this.y,
      this.radioHalo
    );

    gradiente.addColorStop(0, colorCentro);
    gradiente.addColorStop(0.38, colorMedio);
    gradiente.addColorStop(1, colorExterior);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = gradiente;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radioHalo, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    noStroke();
    ctx.restore();
  }

  dibujarTriangulo(tamanoActual = this.tamano) {
    const r = tamanoActual * 0.7;
    triangle(
      this.x,
      this.y - r,
      this.x - r,
      this.y + r,
      this.x + r,
      this.y + r
    );
  }

  contienePunto(px, py) {
    const r = this.tamano * 0.5;

    if (this.tipo === "circulo") {
      return dist(px, py, this.x, this.y) <= r;
    }

    if (this.tipo === "cuadrado") {
      return (
        px >= this.x - r &&
        px <= this.x + r &&
        py >= this.y - r &&
        py <= this.y + r
      );
    }

    if (this.tipo === "triangulo") {
      return dist(px, py, this.x, this.y) <= this.tamano * 0.75;
    }

    return dist(px, py, this.x, this.y) <= r;
  }
}
