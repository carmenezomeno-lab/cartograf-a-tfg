let plano;
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

const DESPLAZAMIENTO_X = 25;
const DESPLAZAMIENTO_Y = 5;

const UI_PADDING = 14;
const BOTON_ALTO = 28;
const BOTON_MARGEN = 8;
const BOTON_RADIO = 9;
const PANEL_ANCHO_MAX = 380;

const COLUMNAS_CSV = {
  genero: 0,
  tipo: 2,
  emocion: 3,
  frecuencia: 4,
  intensidad: 5,
  momento: 6,
  coordenadas: 7,
};

const filtros = {
  genero: new Set(),
  momento: new Set(),
  tipo: new Set(),
  emocion: new Set(),
};

const opcionesFiltro = {
  genero: [
    { valor: "hombre", etiqueta: "Hombre" },
    { valor: "mujer", etiqueta: "Mujer" },
  ],
  momento: [
    { valor: "manana", etiqueta: "Manana" },
    { valor: "tarde", etiqueta: "Tarde" },
  ],
  tipo: [
    { valor: "triangulo", etiqueta: "Ruidos industriales y tecnologicos" },
    { valor: "cuadrado", etiqueta: "Ruidos de personas" },
    { valor: "circulo", etiqueta: "Sonidos naturales" },
  ],
  emocion: [
    { valor: "molestia", etiqueta: "Molestia" },
    { valor: "estres", etiqueta: "Estres" },
    { valor: "neutral", etiqueta: "Neutral" },
    { valor: "calma", etiqueta: "Calma" },
    { valor: "alegria", etiqueta: "Alegria" },
  ],
};

const gruposUI = [
  { clave: "genero", titulo: "Genero" },
  { clave: "momento", titulo: "Momento" },
  { clave: "tipo", titulo: "Tipo" },
  { clave: "emocion", titulo: "Emocion" },
];

const botonesFiltro = [];

let escalaVista = 1;
let offsetX = 0;
let offsetY = 0;

function preload() {
  plano = loadImage("plano.jpg");
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
  textFont("Arial");
  textSize(13);

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
  dibujarManchasSuaves(particulaActiva);

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

  let y = UI_PADDING;

  for (const grupo of gruposUI) {
    let x = UI_PADDING;

    botonesFiltro.push({
      x,
      y,
      w: textWidth(grupo.titulo) + 10,
      h: BOTON_ALTO,
      etiqueta: grupo.titulo,
      esTitulo: true,
      activa: false,
      onClick: () => {},
    });

    x += botonesFiltro[botonesFiltro.length - 1].w + BOTON_MARGEN;

    for (const opcion of opcionesFiltro[grupo.clave]) {
      const boton = {
        x,
        y,
        w: min(PANEL_ANCHO_MAX, textWidth(opcion.etiqueta) + 16),
        h: BOTON_ALTO,
        etiqueta: opcion.etiqueta,
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
    w: textWidth(etiquetaTodo) + 18,
    h: BOTON_ALTO,
    etiqueta: etiquetaTodo,
    activa: filtrosCompletosActivos(),
    onClick: () => activarTodosLosFiltros(),
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
  fill(255, 235);
  rect(8, 8, min(plano.width - 16, 720), 148, 12);

  for (const boton of botonesFiltro) {
    if (boton.esTitulo) {
      fill(45);
      textAlign(LEFT, CENTER);
      textStyle(BOLD);
      textSize(13);
      text(boton.etiqueta, boton.x, boton.y + boton.h / 2);
      textStyle(NORMAL);
      continue;
    }

    if (boton.activa) {
      fill(35, 35, 35);
      stroke(35, 35, 35);
    } else {
      fill(255);
      stroke(170);
    }

    strokeWeight(1);
    rect(boton.x, boton.y, boton.w, boton.h, BOTON_RADIO);
    noStroke();

    fill(boton.activa ? 255 : 50);
    textAlign(LEFT, CENTER);
    textSize(13);
    text(boton.etiqueta, boton.x + 8, boton.y + boton.h / 2);
  }
}

function buscarParticulaBajoCursor(mx, my) {
  for (let i = particulasVisibles.length - 1; i >= 0; i--) {
    if (particulasVisibles[i].contienePunto(mx, my)) {
      return particulasVisibles[i];
    }
  }
  return null;
}

function obtenerGruposVisiblesPorEmocion() {
  const grupos = {};

  for (const particula of particulasVisibles) {
    if (!grupos[particula.emocion]) {
      grupos[particula.emocion] = [];
    }
    grupos[particula.emocion].push(particula);
  }

  return grupos;
}

function dibujarManchasSuaves(particulaActiva) {
  const grupos = obtenerGruposVisiblesPorEmocion();

  for (const emocion in grupos) {
    const grupo = grupos[emocion];
    if (grupo.length < 2) continue;

    let alpha = 20 + sin(frameCount * 0.02 + grupo.length) * 20;

    if (particulaActiva && particulaActiva.emocion === emocion) {
      alpha = 52;
    }

    dibujarManchaBlob(grupo, grupo[0].baseColor, alpha);
  }
}

function dibujarManchaBlob(grupo, baseColor, alpha) {
  noStroke();

  for (let capa = 0; capa < 3; capa++) {
    const alphaCapa = alpha * (0.52 - capa * 0.11);
    fill(red(baseColor), green(baseColor), blue(baseColor), alphaCapa);

    beginShape();
    const puntos = construirPuntosBlob(grupo, 14 + capa * 6);
    for (let i = 0; i < puntos.length; i++) {
      const actual = puntos[i];
      const siguiente = puntos[(i + 1) % puntos.length];
      const mx = (actual.x + siguiente.x) * 0.5;
      const my = (actual.y + siguiente.y) * 0.5;

      if (i === 0) {
        curveVertex(mx, my);
      }

      curveVertex(actual.x, actual.y);
      curveVertex(mx, my);
    }
    endShape(CLOSE);
  }
}

function construirPuntosBlob(grupo, radioBase) {
  const puntos = [];

  for (const particula of grupo) {
    const pasos = 8;
    const radio = radioBase + particula.tamano * 0.45;

    for (let i = 0; i < pasos; i++) {
      const angulo = TWO_PI * (i / pasos);
      puntos.push({
        x: particula.x + cos(angulo) * radio,
        y: particula.y + sin(angulo) * radio,
      });
    }
  }

  const hull = convexHull(puntos);
  return suavizarHull(hull);
}

function suavizarHull(puntos) {
  const centro = centroide(puntos);
  const resultado = [];

  for (let i = 0; i < puntos.length; i++) {
    const p = puntos[i];
    const ruido = noise(i * 0.2, frameCount * 0.01) * 2;
    const angulo = atan2(p.y - centro.y, p.x - centro.x);
    resultado.push({
      x: p.x + cos(angulo) * ruido,
      y: p.y + sin(angulo) * ruido,
    });
  }

  return resultado;
}

function dibujarPanelInfo(particula) {
  const lineas = [
    `Emocion: ${capitalizar(particula.emocion)}`,
    `Forma: ${etiquetaTipo(particula.tipo)}`,
    `Genero: ${capitalizar(particula.genero)}`,
    `Momento: ${capitalizar(particula.momento)}`,
    `Frecuencia: ${particula.frecuencia}`,
    `Intensidad: ${particula.intensidad}`,
    `Coordenadas: ${redondear(particula.xOriginal)}, ${redondear(particula.yOriginal)}`,
  ];

  const padding = 14;
  const altoLinea = 21;
  let anchoCaja = 0;

  textSize(15);
  textAlign(LEFT, TOP);

  for (const linea of lineas) {
    anchoCaja = max(anchoCaja, textWidth(linea));
  }

  anchoCaja += padding * 2 + 10;
  const altoCaja = lineas.length * altoLinea + padding * 2;
  const xCaja = width - anchoCaja - 24;
  const yCaja = 24;

  noStroke();
  fill(255, 245);
  rect(xCaja, yCaja, anchoCaja, altoCaja, 10);

  fill(
    red(particula.baseColor),
    green(particula.baseColor),
    blue(particula.baseColor)
  );
  rect(xCaja, yCaja, 8, altoCaja, 10, 0, 0, 10);

  fill(22);
  for (let i = 0; i < lineas.length; i++) {
    text(lineas[i], xCaja + padding + 8, yCaja + padding + i * altoLinea);
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
  if (tipo === "triangulo") return "Ruidos industriales y tecnologicos";
  if (tipo === "cuadrado") return "Ruidos de personas";
  if (tipo === "circulo") return "Sonidos naturales";
  return capitalizar(tipo);
}

function colorPorEmocion(emocion) {
  if (emocion === "molestia") return color(255, 210, 0);
  if (emocion === "estres") return color(220, 40, 40);
  if (emocion === "neutral") return color(60, 170, 90);
  if (emocion === "alegria") return color(255, 105, 180);
  if (emocion === "calma") return color(70, 140, 255);
  return color(120, 120, 120);
}

function alphaPorFrecuencia(frecuencia) {
  return map(constrain(frecuencia, 1, 5), 1, 5, 70, 255);
}

function tamanoPorIntensidad(intensidad) {
  return map(constrain(intensidad, 1, 5), 1, 5, 10, 36);
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
    this.tipo = tipo;
    this.emocion = emocion;
    this.frecuencia = frecuencia;
    this.intensidad = intensidad;
    this.momento = momento;
    this.baseColor = colorPorEmocion(emocion);
    this.alpha = alphaPorFrecuencia(frecuencia);
    this.tamano = tamanoPorIntensidad(intensidad);
  }

  dibujar(destacada = false) {
    const c = color(
      red(this.baseColor),
      green(this.baseColor),
      blue(this.baseColor),
      this.alpha
    );

    if (destacada) {
      stroke(20, 20, 20, 190);
      strokeWeight(2);
    } else {
      noStroke();
    }

    fill(c);

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

  dibujarTriangulo() {
    const r = this.tamano * 0.7;
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

function convexHull(points) {
  if (points.length < 3) return points.slice();

  const pts = points
    .slice()
    .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  const lower = [];
  for (const p of pts) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    ) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    ) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function cross(o, a, b) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function centroide(puntos) {
  let sumaX = 0;
  let sumaY = 0;

  for (const p of puntos) {
    sumaX += p.x;
    sumaY += p.y;
  }

  return {
    x: sumaX / puntos.length,
    y: sumaY / puntos.length,
  };
}

