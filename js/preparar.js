/* ------------------ Instalar o MicroPython na placa ------------------ */
let esptool = null;
async function carregarEsptool() {
  if (!esptool) esptool = await import('https://unpkg.com/esptool-js@0.7.1/bundle.js');
  return esptool;
}

let instalando = false;
$('btCancelarInst').onclick = async () => {
  $('dlgInstalar').close();
  await desconectar();
  status('Placa não preparada');
};
$('btConfirmarInst').onclick = async () => {
  $('dlgInstalar').close();
  if (!temSerial || emQuadro) { status('Indisponível aqui (veja o aviso)'); return; }
  const bt = $('btConectar');
  bt.disabled = true; $('btEnviar').disabled = true;
  let transporte = null;
  instalando = true;
  try {
    const conhecida = conexao.porta || null;
    await desconectar();
    const porta = conhecida || await navigator.serial.requestPort();
    status('Conectando à placa…'); progresso(0.02);
    const { ESPLoader, Transport } = await carregarEsptool();
    transporte = new Transport(porta, false);
    const terminal = { clean() {}, writeLine(t) { console.log(t); }, write(t) {} };
    const carregador = new ESPLoader({ transport: transporte, baudrate: 460800, terminal, romBaudrate: 115200 });
    const chip = await carregador.main();
    if (!/ESP32-S3/i.test(chip)) throw new Error('Esta placa não parece ser um ESP32-S3 (' + chip + ').');
    let tamanho = '';
    try { tamanho = (await carregador.detectFlashSize()) || ''; } catch (e) {}
    const arquivo = /^(2|4)MB/.test(tamanho) ? 'firmware/ESP32_GENERIC_S3-FLASH_4M.bin' : 'firmware/ESP32_GENERIC_S3.bin';
    status('Preparando a placa…');
    const r = await fetch(arquivo, { cache: 'no-cache' });
    if (!r.ok) throw new Error('Não encontrei o arquivo ' + arquivo);
    const dados = new Uint8Array(await r.arrayBuffer());
    status('Preparando a placa (cerca de 1 minuto)…');
    await carregador.writeFlash({
      fileArray: [{ address: 0x0, data: dados }], flashSize: 'keep', flashMode: 'keep', flashFreq: 'keep',
      eraseAll: true, compress: true,
      reportProgress: (i, escrito, total) => progresso(0.05 + 0.95 * escrito / total)
    });
    try { await carregador.after('hard_reset'); } catch (e) {}
    status('Placa preparada! ✔ Reconectando…');
    setTimeout(async () => {
      instalando = false;
      await conectarAutomatico();
      if (!conexao.porta) status('Placa preparada! ✔ Clique em "Conectar placa" e escolha a porta de novo.');
    }, 3000);
    progresso(1); setTimeout(() => progresso(0), 2000);
  } catch (e) {
    progresso(0);
    if (e && e.name === 'NotFoundError') status('Nenhuma porta escolhida');
    else { status('Não foi possível preparar a placa'); mostrarErro(((e && e.message) || String(e)) + '\nDica: segure o botão BOOT, aperte e solte RESET, solte o BOOT e tente de novo.'); }
  } finally {
    try { if (transporte) await transporte.disconnect(); } catch (e) {}
    bt.disabled = false; $('btEnviar').disabled = false;
    setTimeout(() => { instalando = false; }, 3500);
  }
};
