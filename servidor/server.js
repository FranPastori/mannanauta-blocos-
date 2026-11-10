// Servidor de compilação do mannaNAUTA Blocos
// Recebe o código C++ gerado pelos blocos, compila para ESP32-S3 com o arduino-cli
// e devolve os binários para o navegador gravar na placa (esptool-js).
//
//   POST /compilar   { "codigo": "..." }
//   → { ok: true, partes: [ { endereco, dados(base64) }, ... ] }
//   → { ok: false, erro: "mensagem do compilador" }

const http = require('http');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const PORTA = process.env.PORT || 8080;
const FQBN = process.env.FQBN || 'esp32:esp32:esp32s3:CDCOnBoot=cdc';
const BOOT_APP0 = process.env.BOOT_APP0 || '/opt/boot_app0.bin';
const ORIGENS = (process.env.ORIGENS || '*').split(',').map((s) => s.trim());
const LIMITE_CODIGO = 200 * 1024;
const TEMPO_MAXIMO = 4 * 60 * 1000;

// Uma compilação por vez: o ESP32 usa bastante memória ao compilar.
let fila = Promise.resolve();
const naFila = (tarefa) => { const p = fila.then(tarefa, tarefa); fila = p.catch(() => {}); return p; };

function cabecalhosCors(req) {
  const origem = req.headers.origin || '';
  const permitida = ORIGENS.includes('*') ? '*' : (ORIGENS.includes(origem) ? origem : ORIGENS[0]);
  return {
    'Access-Control-Allow-Origin': permitida,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };
}

function responder(req, res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...cabecalhosCors(req) });
  res.end(JSON.stringify(obj));
}

function rodar(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: TEMPO_MAXIMO, maxBuffer: 8 * 1024 * 1024 }, (erro, stdout, stderr) => {
      resolve({ ok: !erro, saida: String(stdout) + String(stderr) });
    });
  });
}

async function compilar(codigo) {
  const pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'manna-'));
  const esboco = path.join(pasta, 'programa');
  const saida = path.join(pasta, 'saida');
  try {
    await fs.mkdir(esboco);
    await fs.writeFile(path.join(esboco, 'programa.ino'), codigo);
    const r = await rodar('arduino-cli', ['compile', '--fqbn', FQBN, '--output-dir', saida, esboco]);
    if (!r.ok) {
      const limpo = r.saida.split(esboco + path.sep).join('').split(pasta).join('');
      return { ok: false, erro: limpo.slice(-4000) };
    }
    const ler = async (nome) => (await fs.readFile(path.join(saida, nome))).toString('base64');
    return {
      ok: true,
      partes: [
        { endereco: 0x0, dados: await ler('programa.ino.bootloader.bin') },
        { endereco: 0x8000, dados: await ler('programa.ino.partitions.bin') },
        { endereco: 0xe000, dados: (await fs.readFile(BOOT_APP0)).toString('base64') },
        { endereco: 0x10000, dados: await ler('programa.ino.bin') }
      ]
    };
  } finally {
    fs.rm(pasta, { recursive: true, force: true }).catch(() => {});
  }
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cabecalhosCors(req)); return res.end(); }
  if (req.method === 'GET' && (req.url === '/' || req.url === '/saude')) {
    return responder(req, res, 200, { ok: true, servico: 'mannaNAUTA Blocos', placa: FQBN });
  }
  if (req.method !== 'POST' || req.url !== '/compilar') return responder(req, res, 404, { ok: false, erro: 'Rota não encontrada' });

  let corpo = '';
  let grande = false;
  req.on('data', (parte) => {
    corpo += parte;
    if (corpo.length > LIMITE_CODIGO) { grande = true; req.destroy(); }
  });
  req.on('end', async () => {
    if (grande) return;
    let codigo;
    try { codigo = JSON.parse(corpo).codigo; } catch (e) { return responder(req, res, 400, { ok: false, erro: 'JSON inválido' }); }
    if (typeof codigo !== 'string' || !codigo.trim()) return responder(req, res, 400, { ok: false, erro: 'Código vazio' });
    try {
      const resultado = await naFila(() => compilar(codigo));
      responder(req, res, 200, resultado);
    } catch (e) {
      responder(req, res, 500, { ok: false, erro: 'Falha no servidor: ' + e.message });
    }
  });
}).listen(PORTA, () => console.log(`mannaNAUTA Blocos: servidor na porta ${PORTA} (${FQBN})`));
