/* ------------------- Conexão com a placa (MicroPython) --------------- */
// Uma única conexão serial é usada para enviar programas e para o monitor.
const conexao = { porta: null, leitor: null, escritor: null, buffer: '', ouvintes: [] };
const dec = new TextDecoder();
const enc = new TextEncoder();
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function noMonitor(texto) {
  texto = texto.replace(/\x04>?/g, '');
  const m = $('monitor');
  m.textContent = (m.textContent + texto).slice(-20000);
  m.parentElement.scrollTop = m.parentElement.scrollHeight;
}

async function conectar(portaConhecida = null) {
  if (conexao.porta) return conexao.porta;
  const porta = portaConhecida || await navigator.serial.requestPort();
  await porta.open({ baudRate: 115200 });
  conexao.porta = porta; conexao.ultimaPorta = porta;
  conexao.escritor = porta.writable.getWriter();
  conexao.leitor = porta.readable.getReader();
  $('btConectar').textContent = 'Desconectar placa';
  status('Placa conectada');
  (async () => {
    try {
      while (true) {
        const { value, done } = await conexao.leitor.read();
        if (done) break;
        const t = dec.decode(value, { stream: true });
        conexao.buffer += t;
        if (conexao.buffer.length > 200000) conexao.buffer = conexao.buffer.slice(-100000);
        if (!conexao.silencio) noMonitor(t);
      }
    } catch (e) { /* porta fechada */ }
    await desconectar(true);
  })();
  return porta;
}

async function desconectar(jaFechando = false) {
  const c = conexao;
  if (!c.porta) return;
  const porta = c.porta; c.porta = null;
  try { if (!jaFechando && c.leitor) await c.leitor.cancel(); } catch (e) {}
  try { c.leitor && c.leitor.releaseLock(); } catch (e) {}
  try { c.escritor && c.escritor.releaseLock(); } catch (e) {}
  try { await porta.close(); } catch (e) {}
  c.leitor = null; c.escritor = null;
  $('btConectar').textContent = 'Conectar placa';
  status('Placa desconectada');
}

async function escrever(texto) {
  const dados = typeof texto === 'string' ? enc.encode(texto) : texto;
  // envia em pedaços pequenos para não sobrecarregar a placa
  for (let i = 0; i < dados.length; i += 128) {
    await conexao.escritor.write(dados.slice(i, i + 128));
    await esperar(4);
  }
}

// Espera até aparecer "fim" no que a placa respondeu depois da posição "desde".
async function aguardar(fim, desde, tempo = 5000) {
  const limite = Date.now() + tempo;
  while (Date.now() < limite) {
    const i = conexao.buffer.indexOf(fim, desde);
    if (i >= 0) return i + fim.length;
    await esperar(20);
  }
  throw new Error('A placa não respondeu. Confira o cabo e se a placa já foi preparada.');
}

// Entra no modo "raw REPL" do MicroPython
async function entrarRaw() {
  await escrever('\r\x03\x03');
  await esperar(150);
  const desde = conexao.buffer.length;
  await escrever('\x01');
  await aguardar('raw REPL; CTRL-B to exit\r\n>', desde, 3000);
}

// Executa um trecho de código no modo raw e devolve [saída, erro]
async function executar(codigo, tempo = 8000) {
  const desde = conexao.buffer.length;
  await escrever(codigo);
  await escrever('\x04');
  const ok = await aguardar('OK', desde, tempo);
  const fimSaida = await aguardar('\x04', ok, tempo);
  const fimErro = await aguardar('\x04>', fimSaida, tempo);
  const saida = conexao.buffer.slice(ok, fimSaida - 1);
  const erro = conexao.buffer.slice(fimSaida, fimErro - 2);
  return [saida, erro];
}

function paraBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

async function gravarArquivo(nome, conteudo) {
  const bytes = enc.encode(conteudo);
  let [, erro] = await executar(`import ubinascii as _b\n_f=open(${JSON.stringify(nome)},'wb')`);
  if (erro) throw new Error(erro);
  for (let i = 0; i < bytes.length; i += 384) {
    [, erro] = await executar(`_f.write(_b.a2b_base64('${paraBase64(bytes.slice(i, i + 384))}'))`);
    if (erro) throw new Error(erro);
    progresso(Math.min(0.95, (i + 384) / bytes.length));
  }
  [, erro] = await executar('_f.close()');
  if (erro) throw new Error(erro);
}

let bibliotecaTexto = null;
async function carregarBiblioteca() {
  if (bibliotecaTexto) return bibliotecaTexto;
  const r = await fetch('../micropython/mannanauta.py', { cache: 'no-cache' });
  if (!r.ok) throw new Error('Não encontrei o arquivo micropython/mannanauta.py');
  bibliotecaTexto = await r.text();
  return bibliotecaTexto;
}

// Roda o main.py sem reiniciar a placa (reiniciar derruba a conexão USB desta placa).
// Fica no modo raw; o próximo envio interrompe com Ctrl-C.
const CODIGO_RODAR = "import sys\nsys.modules.pop('mannanauta', None)\ntry:\n _f = open('main.py')\nexcept OSError:\n _f = None\nif _f:\n _c = _f.read()\n _f.close()\n exec(_c, {'__name__': '__main__'})\n";
async function rodarPrograma() {
  await escrever(CODIGO_RODAR);
  await escrever('\x04');
}

// Confere se a placa responde como MicroPython (sem mexer no programa dela).
async function temMicroPython() {
  conexao.silencio = true;
  try {
    await escrever('\r\x03\x03');
    await esperar(200);
    const desde = conexao.buffer.length;
    await escrever('\x01');
    await aguardar('raw REPL; CTRL-B to exit', desde, 2500);
    // volta a rodar o programa que já estava gravado na placa
    conexao.silencio = false;
    await rodarPrograma();
    return true;
  } catch (e) {
    return false;
  } finally { conexao.silencio = false; }
}

let verificando = false;
// Chamado sempre que a placa é conectada: se não tiver MicroPython, oferece a instalação.
async function aoConectar(automatico) {
  if (verificando) return;
  verificando = true;
  try {
    status('Verificando a placa…');
    if (await temMicroPython()) {
      status(automatico ? 'Placa conectada automaticamente ✔' : 'Placa conectada ✔');
    } else {
      status('Esta placa ainda não está preparada');
      pedirInstalacao();
    }
  } finally { verificando = false; }
}

function pedirInstalacao() {
  $('txtInstalar').textContent = 'Esta placa ainda não está preparada para receber os programas dos blocos. Preparar agora? Leva cerca de 1 minuto e apaga o que estiver gravado na placa.';
  if (!$('dlgInstalar').open) $('dlgInstalar').showModal();
}

// Conexão automática: quando uma placa já usada antes neste computador é ligada no cabo.
async function conectarAutomatico() {
  if (!temSerial || emQuadro || conexao.porta || instalando) return;
  try {
    const portas = await navigator.serial.getPorts();
    if (portas.length !== 1) return;
    await conectar(portas[0]);
    await aoConectar(true);
  } catch (e) { /* placa ocupada ou desligada: segue sem conectar */ }
}
if (temSerial && !emQuadro) {
  navigator.serial.addEventListener('connect', () => setTimeout(conectarAutomatico, 800));
  navigator.serial.addEventListener('disconnect', (e) => { if (conexao.porta && e.target === conexao.porta) desconectar(true); });
  setTimeout(conectarAutomatico, 500);
}

$('btConectar').onclick = async () => {
  if (!temSerial || emQuadro) { status('Conexão indisponível aqui (veja o aviso)'); return; }
  try {
    if (conexao.porta) await desconectar();
    else { await conectar(); await aoConectar(false); }
  } catch (e) { if (!(e && e.name === 'NotFoundError')) status('Não foi possível conectar'); }
};

$('btEnviar').onclick = async () => {
  const bt = $('btEnviar');
  if (!temSerial || emQuadro) { status('Envio indisponível aqui (veja o aviso)'); return; }
  bt.disabled = true; progresso(0.03);
  try {
    await conectar();
    conexao.silencio = true;
    status('Preparando a placa…');
    try { await entrarRaw(); }
    catch (e) {
      conexao.silencio = false; progresso(0);
      status('Esta placa ainda não está preparada');
      pedirInstalacao();
      return;
    }
    // Confere se a biblioteca mannanauta.py já está na placa e atualizada
    const lib = await carregarBiblioteca();
    const versao = (lib.match(/^VERSAO = "([^"]+)"/m) || [])[1] || '?';
    const [saida] = await executar(
      `try:\n import os\n f=open('mannanauta.py')\n l=f.readline()\n while l and not l.startswith('VERSAO'):\n  l=f.readline()\n f.close()\n print(l.strip())\nexcept Exception:\n print('nada')`);
    if (!saida.includes(`VERSAO = "${versao}"`)) {
      status('Preparando a placa…');
      await gravarArquivo('mannanauta.py', lib);
    }
    status('Enviando o programa…');
    await gravarArquivo('main.py', codigoAtual);
    progresso(1);
    // Roda o programa novo (sem reiniciar a placa)
    conexao.silencio = false;
    noMonitor('\n--- programa enviado ---\n');
    await rodarPrograma();
    status('Programa enviado! ✔');
    setTimeout(() => progresso(0), 1500);
  } catch (e) {
    conexao.silencio = false;
    progresso(0);
    if (e && e.name === 'NotFoundError') status('Nenhuma porta escolhida');
    else { status('Falha no envio'); mostrarErro((e && e.message) || String(e)); }
    try { if (conexao.porta) await escrever('\x02'); } catch (e2) {}
  } finally { bt.disabled = false; }
};


function mostrarErro(texto) {
  noMonitor('\n⚠ ' + texto + '\n');
}
$('btLimparMonitor').onclick = () => { $('monitor').textContent = ''; };

