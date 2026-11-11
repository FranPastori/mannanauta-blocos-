/* ============================ Simulador ===============================
   Placa mannaNAUTA virtual: roda o programa de blocos no navegador.
   - Matriz 5x5 de LEDs, botões de toque (mãos) e botão BOOT clicáveis
   - Inclinação, sacudida, passos e temperatura controlados por botões e barras
   - Entradas (analógicas, digitais, botões, ultrassônico, DHT11) com controles
   - Saídas (pinos, PWM, servo, som), página web e Blynk mostrados no painel
   ===================================================================== */

const PARAR_SIM = { parar: true };

/* --------------------------- Desenho da placa ------------------------- */
function desenharPlaca() {
  const leds = [];
  for (let i = 0; i < 25; i++) {
    const x = 104 + (i % 5) * 23, y = 50 + Math.floor(i / 5) * 23;
    leds.push(`<rect x="${x - 2}" y="${y - 2}" width="22" height="22" rx="3" fill="#0e1a33"/>` +
      `<circle id="led${i}" cx="${x + 9}" cy="${y + 9}" r="8.5" fill="#2a3550"/>`);
  }
  const pads = [];
  for (let k = 0; k < 15; k++) {
    const a = Math.PI * (0.92 + k * 0.083);
    pads.push(`<circle cx="${150 + 92 * Math.cos(a)}" cy="${108 + 92 * Math.sin(a)}" r="4.5" fill="#d9a63c"/>`);
  }
  const pinos = [];
  for (let k = 0; k < 6; k++) pinos.push(`<rect x="${117 + k * 12}" y="262" width="7" height="16" rx="1.5" fill="#d9a63c"/>`);
  document.getElementById('simPlaca').innerHTML = `
<svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" aria-label="Placa mannaNAUTA simulada">
  <g fill="#1b2f5e" stroke="#0e1a33" stroke-width="2">
    <path d="M70 330 q-4 34 18 40 h40 q14 -2 14 -18 v-30 z"/>
    <path d="M230 330 q4 34 -18 40 h-40 q-14 -2 -14 -18 v-30 z"/>
    <path d="M85 200 q65 -24 130 0 l12 60 q4 75 -40 80 h-74 q-44 -5 -40 -80 z"/>
    <path d="M88 205 q-40 10 -52 58 q-4 22 18 26 q16 2 22 -18 l18 -40 z"/>
    <path d="M212 205 q40 10 52 58 q4 22 -18 26 q-16 2 -22 -18 l-18 -40 z"/>
    <circle cx="150" cy="108" r="100"/>
  </g>
  ${pads.join('')}
  <rect x="135" y="12" width="30" height="13" rx="6" fill="#0e1a33" stroke="#d9a63c" stroke-width="1.5"/>
  ${leds.join('')}
  <text x="150" y="232" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="22" fill="#fff">manna<tspan font-size="11" dx="2">team</tspan></text>
  <rect x="110" y="256" width="80" height="28" rx="3" fill="#0e1a33"/>
  ${pinos.join('')}
  <g class="toque" id="toqueEsq" data-lado="esquerdo">
    <circle class="anel" cx="52" cy="268" r="20" fill="#e9eef6"/><circle cx="52" cy="268" r="14" fill="#1b2f5e"/>
    <text x="52" y="272" text-anchor="middle" font-size="9" font-weight="900" fill="#fff" font-family="Nunito, sans-serif">TOQUE</text>
  </g>
  <g class="toque" id="toqueDir" data-lado="direito">
    <circle class="anel" cx="248" cy="268" r="20" fill="#e9eef6"/><circle cx="248" cy="268" r="14" fill="#1b2f5e"/>
    <text x="248" y="272" text-anchor="middle" font-size="9" font-weight="900" fill="#fff" font-family="Nunito, sans-serif">TOQUE</text>
  </g>
  <g class="boot" id="btBootSim">
    <rect x="100" y="300" width="26" height="16" rx="4" fill="#e9eef6"/>
    <text x="113" y="330" text-anchor="middle" font-size="9" font-weight="900" fill="#fff" font-family="Nunito, sans-serif">BOOT</text>
  </g>
  <g id="servoSim" hidden>
    <circle cx="210" cy="312" r="14" fill="#fff" stroke="#0e1a33"/>
    <line id="servoBraco" x1="210" y1="312" x2="210" y2="300" stroke="#EF466E" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>`;
}

/* ----------------------------- Utilidades ----------------------------- */
const limitarNum = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0));
const formatarPy = (v) => {
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'number') {
    if (!isFinite(v)) return String(v);
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
  }
  return String(v);
};
const textoPagina = (v) => {
  if (v === true) return 'sim';
  if (v === false) return 'não';
  if (typeof v === 'number' && !Number.isInteger(v)) return String(Math.round(v * 100) / 100);
  return String(v);
};

/* --------------------------- Estado do simulador ---------------------- */
const est = {
  lados: 0, frente: 0, temperatura: 25, passos: 0, sacudiu: false, giroExtra: 0,
  analogico: {}, digital: {}, botoes: {}, distancia: {}, dhtTemp: {}, dhtUmid: {},
  toque: { esquerdo: false, direito: false }, boot: false
};
let execucao = 0;         // muda a cada nova execução (para parar a anterior)
let simAtivo = false;
let somLigado = true;

/* ------------------------------ Som ----------------------------------- */
let audio = null, osc = null, ganho = null;
function iniciarAudio() {
  if (!audio) { try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; } }
  if (audio && audio.state === 'suspended') audio.resume().catch(() => {});
}
function somTocar(freq) {
  if (!somLigado) return;
  iniciarAudio();
  if (!audio) return;
  if (!osc) {
    osc = audio.createOscillator(); ganho = audio.createGain();
    osc.type = 'square'; ganho.gain.value = 0.05;
    osc.connect(ganho).connect(audio.destination); osc.start();
  }
  osc.frequency.setValueAtTime(freq, audio.currentTime);
}
function somParar() { if (osc) { try { osc.stop(); } catch (e) {} osc = null; } }

/* --------------------------- Objeto S (a placa) ----------------------- */
function criarS(id) {
  const t0 = performance.now();
  const ativo = () => simAtivo && id === execucao;
  const checar = () => { if (!ativo()) throw PARAR_SIM; };

  // ---- matriz
  const mat = { brilho: 20, buf: Array.from({ length: 25 }, () => [0, 0, 0, 20]) };
  const desenhar = () => {
    for (let i = 0; i < 25; i++) {
      const [r, g, b, br] = mat.buf[i];
      const el = document.getElementById('led' + i);
      if (!el) continue;
      if (!r && !g && !b) { el.setAttribute('fill', '#2a3550'); el.removeAttribute('filter'); el.style.filter = ''; continue; }
      const k = 0.45 + 0.55 * (br / 255);
      const c = `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
      el.setAttribute('fill', c);
      el.style.filter = `drop-shadow(0 0 4px ${c})`;
    }
  };
  const corDe = (cor) => { cor = Number(cor) >>> 0; return [(cor >> 16) & 255, (cor >> 8) & 255, cor & 255, mat.brilho]; };
  const prep = (i, cor) => { i = Math.trunc(Number(i)); if (i >= 0 && i < 25) mat.buf[i] = corDe(cor); };
  const mascara = (m, cor) => { for (let i = 0; i < 25; i++) mat.buf[i] = (m >> i) & 1 ? corDe(cor) : [0, 0, 0, mat.brilho]; desenhar(); };
  const matriz = {
    brilho: (p) => { mat.brilho = Math.trunc(limitarNum(p, 0, 100) * 255 / 100); },
    preparar: prep,
    prepararXY: (x, y, cor) => { x = Math.trunc(x); y = Math.trunc(y); if (x >= 1 && x <= 5 && y >= 1 && y <= 5) prep((y - 1) * 5 + x - 1, cor); },
    prepararTodos: (cor) => { for (let i = 0; i < 25; i++) prep(i, cor); },
    mostrar: desenhar,
    limpar: () => { for (let i = 0; i < 25; i++) mat.buf[i] = [0, 0, 0, mat.brilho]; desenhar(); },
    led: (i, cor) => { prep(i, cor); desenhar(); },
    ledXY: (x, y, cor) => { matriz.prepararXY(x, y, cor); desenhar(); },
    todos: (cor) => { matriz.prepararTodos(cor); desenhar(); },
    letra: (l, cor) => mascara(FONTES.letras[String(l).charAt(0).toUpperCase()] || 0, cor),
    numero: (n, cor) => mascara(FONTES.numeros[Math.trunc(limitarNum(n, 0, 9))], cor),
    simbolo: (s, cor) => mascara(FONTES.simbolos[s] || 0, cor),
    emocao: (e, cor) => mascara(FONTES.emocoes[e] || 0, cor),
    desenho: (bits, cor) => { let m = 0; for (let i = 0; i < 25; i++) if (bits[i] === '1') m |= 1 << i; mascara(m, cor); },
    texto: async (txt, cor, s) => {
      for (const ch of String(txt)) {
        const c = ch.toUpperCase();
        if (FONTES.letras[c] !== undefined) matriz.letra(c, cor);
        else if (c >= '0' && c <= '9') matriz.numero(Number(c), cor);
        else if (FONTES.simbolos[c] !== undefined) matriz.simbolo(c, cor);
        else matriz.limpar();
        await S.esperar(Number(s) * 1000);
      }
      matriz.limpar();
    }
  };

  // ---- sensor de movimento
  const rad = Math.PI / 180;
  const acel = () => {
    const l = est.lados * rad, f = est.frente * rad;
    return { x: Math.sin(f), y: Math.sin(l) * Math.cos(f), z: Math.cos(l) * Math.cos(f) };
  };
  const angulo = (lados) => {
    const a = acel();
    return lados ? Math.atan2(a.y, a.z) / rad : Math.atan2(-a.x, Math.sqrt(a.y * a.y + a.z * a.z)) / rad;
  };
  const sensor = {
    aceleracao: (e) => Math.round(acel()[e] * 1000) / 1000,
    giro: (e) => (e === 'z' ? 0 : est.giroExtra),
    angulo: (lados) => Math.round(angulo(lados) * 10) / 10,
    inclinacao: () => {
      const rol = angulo(true), arf = angulo(false);
      if (Math.abs(rol) < 12 && Math.abs(arf) < 12) return 0;
      if (Math.abs(arf) >= Math.abs(rol)) return arf < 0 ? 1 : 2;
      return rol > 0 ? 3 : 4;
    },
    sacudida: () => { const s = est.sacudiu; est.sacudiu = false; return s; },
    temperatura: () => est.temperatura,
    passos: () => est.passos,
    zerarPassos: () => { est.passos = 0; atualizarControle('passos'); }
  };

  // ---- pinos, componentes e botões
  const saidas = {};
  const pinos = {
    modo: () => {},
    escrever: (p, v) => { saidas['d' + p] = { tipo: 'digital', pino: p, valor: v ? 1 : 0 }; mostrarSaidas(saidas); },
    ler: (p) => !!est.digital[p],
    pwm: (p, v) => { saidas['d' + p] = { tipo: 'pwm', pino: p, valor: Math.trunc(limitarNum(v, 0, 255)) }; mostrarSaidas(saidas); },
    analogico: (p) => est.analogico[p] ?? 2048,
    servo: (p, a) => { saidas['s' + p] = { tipo: 'servo', pino: p, valor: Math.trunc(limitarNum(a, 0, 180)) }; mostrarSaidas(saidas); },
    distancia: (t, e) => est.distancia[t + '-' + e] ?? 50,
    botao: (p) => !!est.botoes[p],
    dht: (p, tipo) => (tipo === 'temperatura_ar' ? (est.dhtTemp[p] ?? 25) : (est.dhtUmid[p] ?? 60))
  };
  const som = {
    tom: (p, f) => { f = Number(f); if (f > 0) { somTocar(f); saidas['b' + p] = { tipo: 'som', pino: p, valor: f }; } else som.parar(p); mostrarSaidas(saidas); },
    parar: (p) => { somParar(); delete saidas['b' + p]; mostrarSaidas(saidas); },
    tocar: async (p, f, s) => { som.tom(p, f); try { await S.esperar(Number(s) * 1000); } finally { som.parar(p); } }
  };
  const botoes = {
    toque: (lado) => !!est.toque[lado],
    // valor bruto simulado, como na placa real: ~18000 sem tocar, ~31000 tocando
    leitura: (lado) => (est.toque[lado] ? 31000 : (lado === 'esquerdo' ? 19000 : 18400)) + Math.floor(Math.random() * 60),
    boot: () => !!est.boot
  };

  // ---- rede, Blynk e página web
  const rede = {
    sta: false, ap: null,
    conectar: async (nome) => {
      S.print('Conectando ao Wi-Fi', nome, '...');
      await S.esperar(700);
      rede.sta = true;
      S.print('Wi-Fi conectado: 192.168.0.50 (simulado)');
    },
    conectado: () => rede.sta,
    criar: async (nome) => {
      rede.ap = nome; await S.esperar(200);
      S.print('Rede Wi-Fi da placa criada:', nome);
      document.getElementById('celRede').textContent = '📶 ' + nome;
    },
    blynk: () => {},
    blynkEnviar: (pino, valor) => {
      if (!rede.sta) { S.print("Sem Wi-Fi: use o bloco 'conectar ao Wi-Fi' antes de enviar."); return; }
      document.getElementById('simBlynk').hidden = false;
      const caixa = document.getElementById('blynkValores');
      let chip = caixa.querySelector(`[data-pino="${pino}"]`);
      if (!chip) { chip = document.createElement('div'); chip.className = 'chip'; chip.dataset.pino = pino; caixa.append(chip); }
      chip.textContent = `${pino}: ${textoPagina(valor)}`;
    }
  };
  const pagina = {
    itens: new Map(),
    iniciar: (titulo) => {
      document.getElementById('simCelular').hidden = false;
      document.getElementById('celTitulo').textContent = titulo;
      S.print('Página web ligada! Abra no celular:', pagina.endereco());
    },
    mostrar: (nome, valor) => {
      pagina.itens.set(String(nome), textoPagina(valor));
      const cards = document.getElementById('celCards');
      cards.innerHTML = '';
      for (const [n, v] of pagina.itens) {
        const c = document.createElement('div'); c.className = 'celCard';
        const a = document.createElement('div'); a.className = 'n'; a.textContent = n;
        const b = document.createElement('div'); b.className = 'v'; b.textContent = v;
        c.append(a, b); cards.append(c);
      }
    },
    endereco: () => (rede.ap ? 'http://192.168.4.1' : (rede.sta ? 'http://192.168.0.50' : '(sem rede)'))
  };

  const S = {
    matriz, sensor, pinos, som, botoes, rede, pagina,
    tick: async () => { checar(); await new Promise((r) => setTimeout(r, 0)); checar(); },
    esperar: async (ms) => {
      ms = Math.max(0, Number(ms) || 0);
      const fim = performance.now() + ms;
      checar();
      while (performance.now() < fim) {
        await new Promise((r) => setTimeout(r, Math.min(40, fim - performance.now())));
        checar();
      }
      if (ms === 0) await new Promise((r) => setTimeout(r, 0));
    },
    millis: () => Math.round(performance.now() - t0),
    str: (v) => formatarPy(v),
    // com a placa de verdade conectada, o monitor mostra só o que vem da placa
    print: (...vals) => { if (ativo() && !conexao.porta) noMonitor(vals.map(formatarPy).join(' ') + '\n'); },
    resto: (a, b) => { a = Number(a); b = Number(b) || 1; return ((a % b) + b) % b; },
    aleatorio: (a, b) => { a = Math.trunc(a); b = Math.trunc(b); if (a > b) [a, b] = [b, a]; return a + Math.floor(Math.random() * (b - a + 1)); },
    mapear: (x, a, b, c, d) => (b == a ? Math.trunc(c) : Math.trunc((x - a) * (d - c) / (b - a) + Number(c))),
    limitar: (x, a, b) => (x < a ? a : (x > b ? b : x)),
    corRGB: (r, g, b) => (Math.trunc(limitarNum(r, 0, 255)) << 16) | (Math.trunc(limitarNum(g, 0, 255)) << 8) | Math.trunc(limitarNum(b, 0, 255)),
    corArco: (pos) => {
      let p = (Math.trunc(pos) & 255) % 255;
      if (p < 85) return ((255 - p * 3) << 16) | ((p * 3) << 8);
      if (p < 170) { p -= 85; return ((255 - p * 3) << 8) | (p * 3); }
      p -= 170; return ((p * 3) << 16) | (255 - p * 3);
    },
    corHSV: (h, s, v) => {
      h = Math.trunc(limitarNum(h, 0, 360)) % 360; s = Math.trunc(limitarNum(s, 0, 100)); v = Math.trunc(limitarNum(v, 0, 100));
      const vmax = Math.trunc(v * 2.55), vmin = Math.trunc(vmax * (100 - s) / 100);
      const i = Math.floor(h / 60), aj = Math.floor((vmax - vmin) * (h % 60) / 60);
      const t = [[vmax, vmin + aj, vmin], [vmax - aj, vmax, vmin], [vmin, vmax, vmin + aj], [vmin, vmax - aj, vmax], [vmin + aj, vmin, vmax], [vmax, vmin, vmax - aj]][i];
      return (t[0] << 16) | (t[1] << 8) | t[2];
    }
  };
  return S;
}

/* --------------------------- Saídas no painel ------------------------- */
function mostrarSaidas(saidas) {
  const caixa = document.getElementById('saidasSim');
  const servo = Object.values(saidas).find((s) => s.tipo === 'servo');
  const g = document.getElementById('servoSim');
  if (g) {
    g.hidden = !servo;
    if (servo) {
      const a = (180 - servo.valor) * Math.PI / 180;
      const br = document.getElementById('servoBraco');
      br.setAttribute('x2', 210 + 13 * Math.cos(a)); br.setAttribute('y2', 312 - 13 * Math.sin(a));
    }
  }
  if (!caixa) return;
  caixa.innerHTML = '';
  for (const s of Object.values(saidas)) {
    const c = document.createElement('div'); c.className = 'chip';
    if (s.tipo === 'digital') c.innerHTML = `<span class="luz ${s.valor ? 'on' : ''}"></span>pino ${s.pino}: ${s.valor ? 'ligado' : 'desligado'}`;
    else if (s.tipo === 'pwm') c.innerHTML = `<span class="luz on" style="opacity:${0.15 + 0.85 * s.valor / 255}"></span>pino ${s.pino}: PWM ${s.valor}`;
    else if (s.tipo === 'servo') c.innerHTML = `⚙️ servo pino ${s.pino}: ${s.valor}°`;
    else if (s.tipo === 'som') c.innerHTML = `🔊 pino ${s.pino}: ${Math.round(s.valor)} Hz`;
    caixa.append(c);
  }
  if (!caixa.children.length) caixa.innerHTML = '<span class="simVazio">Nenhuma saída ligada ainda.</span>';
}

/* ------------------------- Controles do painel ------------------------ */
function inclinarPlaca() {
  document.getElementById('simPlaca').style.transform = `rotateX(${est.frente}deg) rotateY(${est.lados}deg)`;
}
const controlesAtivos = {};
function atualizarControle(nome) { const f = controlesAtivos[nome]; if (f) f(); }

function barra(rotulo, min, max, passo, ler, gravar, unidade = '') {
  const d = document.createElement('div'); d.className = 'ctl';
  const l = document.createElement('label');
  const s = document.createElement('span'); s.textContent = rotulo;
  const r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.step = passo; r.value = ler();
  const v = document.createElement('span'); v.className = 'val'; v.textContent = ler() + unidade;
  r.oninput = () => { gravar(Number(r.value)); v.textContent = r.value + unidade; };
  l.append(s, r, v); d.append(l);
  return { el: d, atualizar: () => { r.value = ler(); v.textContent = ler() + unidade; } };
}

function botaoSegurar(rotulo, gravar) {
  const b = document.createElement('button'); b.textContent = rotulo;
  const on = () => { gravar(true); b.classList.add('on'); }, off = () => { gravar(false); b.classList.remove('on'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off);
  return b;
}

function montarControles(ws) {
  const area = document.getElementById('simControles');
  area.innerHTML = '';
  const blocos = ws.getAllBlocks(false).filter((b) => b.isEnabled());
  const tipos = new Set(blocos.map((b) => b.type));
  const pinosDe = (tipo, campo = 'PINO') => [...new Set(blocos.filter((b) => b.type === tipo).map((b) => b.getFieldValue(campo)))];
  const secao = (t) => { const h = document.createElement('div'); h.className = 'simSecao'; h.textContent = t; area.append(h); };

  // Movimento
  const usaMov = ['mn_aceleracao', 'mn_giro', 'mn_angulo', 'mn_inclinada', 'mn_sacudida', 'mn_temperatura', 'mn_passos'].some((t) => tipos.has(t));
  if (usaMov) {
    secao('Sensor de movimento (arraste a placa ou use as barras)');
    const b1 = barra('Para os lados', -90, 90, 1, () => est.lados, (v) => { est.lados = v; inclinarPlaca(); }, '°');
    const b2 = barra('Frente / trás', -90, 90, 1, () => est.frente, (v) => { est.frente = v; inclinarPlaca(); }, '°');
    controlesAtivos.inclinacao = () => { b1.atualizar(); b2.atualizar(); };
    area.append(b1.el, b2.el);
    const ctl = document.createElement('div'); ctl.className = 'ctl';
    const linha = document.createElement('div'); linha.className = 'linha';
    const mk = (txt, fn) => { const b = document.createElement('button'); b.textContent = txt; b.onclick = fn; linha.append(b); };
    mk('🫨 Sacudir', () => { est.sacudiu = true; est.giroExtra = 400; const p = document.getElementById('simPlaca'); p.animate([{ translate: '-6px 0' }, { translate: '6px 0' }, { translate: '0 0' }], { duration: 250, iterations: 2 }); setTimeout(() => { est.giroExtra = 0; }, 400); });
    mk('Deixar reta', () => { est.lados = 0; est.frente = 0; inclinarPlaca(); atualizarControle('inclinacao'); });
    if (tipos.has('mn_passos')) {
      const passos = document.createElement('span'); passos.className = 'val'; passos.textContent = est.passos + ' passos';
      mk('👣 Dar um passo', () => { est.passos++; passos.textContent = est.passos + ' passos'; });
      controlesAtivos.passos = () => { passos.textContent = est.passos + ' passos'; };
      linha.append(passos);
    }
    ctl.append(linha); area.append(ctl);
    if (tipos.has('mn_temperatura')) area.append(barra('Temperatura da placa', -10, 50, 1, () => est.temperatura, (v) => { est.temperatura = v; }, ' °C').el);
  }

  // Entradas
  const analog = pinosDe('mn_analogico');
  const digitais = pinosDe('mn_digital_ler');
  const botoesP = pinosDe('mn_botao');
  const ultras = [...new Set(blocos.filter((b) => b.type === 'mn_distancia').map((b) => b.getFieldValue('TRIG') + '-' + b.getFieldValue('ECHO')))];
  const dhts = pinosDe('mn_dht');
  if (analog.length || digitais.length || botoesP.length || ultras.length || dhts.length) secao('Entradas');
  for (const p of analog) area.append(barra(`Analógico pino ${p}`, 0, 4095, 1, () => est.analogico[p] ?? 2048, (v) => { est.analogico[p] = v; }).el);
  for (const k of ultras) area.append(barra(`Ultrassônico (${k.replace('-', '/')})`, 2, 400, 1, () => est.distancia[k] ?? 50, (v) => { est.distancia[k] = v; }, ' cm').el);
  for (const p of dhts) {
    area.append(barra(`DHT11 pino ${p}: temperatura`, 0, 50, 1, () => est.dhtTemp[p] ?? 25, (v) => { est.dhtTemp[p] = v; }, ' °C').el);
    area.append(barra(`DHT11 pino ${p}: umidade`, 20, 90, 1, () => est.dhtUmid[p] ?? 60, (v) => { est.dhtUmid[p] = v; }, ' %').el);
  }
  if (digitais.length || botoesP.length) {
    const ctl = document.createElement('div'); ctl.className = 'ctl';
    const linha = document.createElement('div'); linha.className = 'linha';
    for (const p of digitais) {
      const b = document.createElement('button');
      const pintar = () => { b.textContent = `pino ${p}: ${est.digital[p] ? 'ALTO' : 'BAIXO'}`; b.classList.toggle('on', !!est.digital[p]); };
      b.onclick = () => { est.digital[p] = !est.digital[p]; pintar(); }; pintar(); linha.append(b);
    }
    for (const p of botoesP) linha.append(botaoSegurar(`🔘 botão pino ${p} (segure)`, (v) => { est.botoes[p] = v; }));
    ctl.append(linha); area.append(ctl);
  }

  // Saídas
  const usaSaida = ['mn_digital_escrever', 'mn_pwm', 'mn_servo', 'mn_tom', 'mn_nota'].some((t) => tipos.has(t));
  if (usaSaida) {
    secao('Saídas');
    const s = document.createElement('div'); s.className = 'saidas'; s.id = 'saidasSim';
    s.innerHTML = '<span class="simVazio">Nenhuma saída ligada ainda.</span>';
    area.append(s);
  }

  if (tipos.has('mn_toque') || tipos.has('mn_toque_valor') || tipos.has('mn_boot')) {
    const d = document.createElement('div'); d.className = 'simVazio';
    d.textContent = '👉 Clique e segure nos botões de TOQUE (mãos) ou no BOOT da placa.';
    area.append(d);
  }
  if (!area.children.length) {
    const d = document.createElement('div'); d.className = 'simVazio';
    d.textContent = 'Os controles dos sensores aparecem aqui quando você usar os blocos deles.';
    area.append(d);
  }
}

/* ---------------------------- Execução -------------------------------- */
function pararSimulacao() {
  simAtivo = false;
  execucao++;
  somParar();
}

function limparPlacaVirtual() {
  for (let i = 0; i < 25; i++) { const el = document.getElementById('led' + i); if (el) { el.setAttribute('fill', '#2a3550'); el.style.filter = ''; } }
  document.getElementById('simCelular').hidden = true;
  document.getElementById('celCards').innerHTML = '';
  document.getElementById('simBlynk').hidden = true;
  document.getElementById('blynkValores').innerHTML = '';
  const g = document.getElementById('servoSim'); if (g) g.hidden = true;
}

async function rodarSimulacao() {
  pararSimulacao();
  limparPlacaVirtual();
  montarControles(ws);
  let codigo;
  try { codigo = gerarSimulacao(ws); } catch (e) { noMonitor('\n⚠ Erro ao montar a simulação: ' + e.message + '\n'); return; }
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  let programa;
  try { programa = new AsyncFunction('S', 'V', codigo); } catch (e) { noMonitor('\n⚠ Erro no programa: ' + e.message + '\n'); return; }
  simAtivo = true;
  const id = ++execucao;
  atualizarBotaoSim();
  const S = criarS(id);
  noMonitor('\n--- simulação iniciada ---\n');
  try {
    await programa(S, {});
  } catch (e) {
    if (e !== PARAR_SIM && id === execucao) noMonitor('\n⚠ Erro na simulação: ' + (e && e.message ? e.message : e) + '\n');
  }
  if (id === execucao) { simAtivo = false; somParar(); atualizarBotaoSim(); }
}

function atualizarBotaoSim() {
  const b = document.getElementById('btSimular');
  b.textContent = simAtivo ? '■ Parar' : '▶ Simular';
  b.classList.toggle('parado', !simAtivo);
}

/* ---------------------------- Ligações -------------------------------- */
desenharPlaca();
inclinarPlaca();

document.getElementById('btSimular').onclick = () => {
  iniciarAudio();
  if (simAtivo) { pararSimulacao(); atualizarBotaoSim(); noMonitor('\n--- simulação parada ---\n'); }
  else rodarSimulacao();
};
document.getElementById('btSimReiniciar').onclick = () => { iniciarAudio(); rodarSimulacao(); };
document.getElementById('btSom').onclick = (e) => {
  somLigado = !somLigado; e.currentTarget.textContent = somLigado ? '🔊' : '🔇';
  if (!somLigado) somParar(); else iniciarAudio();
};

// Botões de toque e BOOT da placa virtual (clicar e segurar)
for (const g of document.querySelectorAll('#simPlaca .toque, #simPlaca .boot')) {
  const on = (ev) => {
    ev.stopPropagation(); iniciarAudio();
    if (g.classList.contains('boot')) est.boot = true; else est.toque[g.dataset.lado] = true;
    g.classList.add('ativo');
  };
  const off = () => {
    if (g.classList.contains('boot')) est.boot = false; else est.toque[g.dataset.lado] = false;
    g.classList.remove('ativo');
  };
  g.addEventListener('pointerdown', on);
  g.addEventListener('pointerup', off);
  g.addEventListener('pointerleave', off);
}

// Arrastar a placa para inclinar
(() => {
  const placa = document.getElementById('simPlaca');
  let arrastando = null;
  placa.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.toque, .boot')) return;
    arrastando = { x: e.clientX, y: e.clientY, l: est.lados, f: est.frente };
    placa.setPointerCapture(e.pointerId);
  });
  placa.addEventListener('pointermove', (e) => {
    if (!arrastando) return;
    est.lados = Math.round(limitarNum(arrastando.l + (e.clientX - arrastando.x) * 0.6, -90, 90));
    est.frente = Math.round(limitarNum(arrastando.f - (e.clientY - arrastando.y) * 0.6, -90, 90));
    inclinarPlaca(); atualizarControle('inclinacao');
  });
  const soltar = () => { arrastando = null; };
  placa.addEventListener('pointerup', soltar);
  placa.addEventListener('pointercancel', soltar);
})();

// Recomeça a simulação quando os blocos mudam (como no simulador do micro:bit)
let temporizadorSim = null;
ws.addChangeListener((e) => {
  if (e.isUiEvent) return;
  clearTimeout(temporizadorSim);
  temporizadorSim = setTimeout(() => rodarSimulacao(), 700);
});
setTimeout(() => rodarSimulacao(), 300);
