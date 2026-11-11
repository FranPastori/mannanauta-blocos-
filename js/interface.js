/* ---------------------------- Interface ------------------------------ */
const $ = (id) => document.getElementById(id);
const statusEl = $('status');
const status = (t) => { statusEl.textContent = t; };
const progresso = (p) => { $('progresso').firstElementChild.style.width = (p == null ? 0 : Math.round(p * 100)) + '%'; };

const ws = Blockly.inject('areaBlocos', {
  toolbox, trashcan: true, renderer: 'zelos', media: 'https://unpkg.com/blockly@11.2.2/media/',
  theme: Blockly.Theme.defineTheme('manna', {
    base: Blockly.Themes.Classic,
    fontStyle: { family: "'Nunito', sans-serif", weight: '800', size: 11 },
    componentStyles: { workspaceBackgroundColour: '#ffffff', toolboxBackgroundColour: '#F5F9FD', flyoutBackgroundColour: '#EDF3FA', flyoutOpacity: 0.96, scrollbarColour: '#C5D6E8' }
  }),
  zoom: { controls: true, wheel: true, startScale: 0.8 }, move: { scrollbars: true, drag: true, wheel: false },
  grid: { spacing: 24, length: 2, colour: '#DCE7F2', snap: true }
});

function carregar(json) {
  ws.clear();
  try { Blockly.serialization.workspaces.load(json, ws); }
  catch (e) { Blockly.serialization.workspaces.load(PROJETO_INICIAL, ws); }
}
let salvo = null;
try { salvo = JSON.parse(armazenar.ler('mannaBlocos.projeto', 'null')); } catch (e) {}
carregar(salvo || PROJETO_INICIAL);

let codigoAtual = '';
function atualizar() {
  try { codigoAtual = gerarPrograma(ws); } catch (e) { codigoAtual = '// Erro ao gerar o código: ' + e.message; }
  armazenar.gravar('mannaBlocos.projeto', JSON.stringify(Blockly.serialization.workspaces.save(ws)));
}
ws.addChangeListener((e) => { if (!e.isUiEvent) atualizar(); });
atualizar();

window.addEventListener('resize', () => Blockly.svgResize(ws));

// Novo / Abrir / Salvar
$('btNovo').onclick = () => carregar(PROJETO_INICIAL);
$('btSalvar').onclick = () => {
  const dados = JSON.stringify(Blockly.serialization.workspaces.save(ws), null, 1);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([dados], { type: 'application/json' }));
  a.download = 'projeto-mannanauta.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
$('arquivo').onchange = async (e) => {
  const arq = e.target.files[0]; if (!arq) return;
  try { carregar(JSON.parse(await arq.text())); status('Projeto aberto'); }
  catch (err) { status('Não consegui abrir esse arquivo'); }
  e.target.value = '';
};

// Aviso quando o navegador não tem Web Serial (ou a página está dentro de um quadro)
const temSerial = 'serial' in navigator;
const emQuadro = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
if (!temSerial || emQuadro) {
  $('aviso').style.display = 'block';
  $('aviso').textContent = !temSerial
    ? 'Para enviar programas à placa, abra esta página no Google Chrome ou no Microsoft Edge de um computador.'
    : 'Esta é uma prévia: aqui dá para montar os blocos e ver o código. Para enviar à placa, abra a plataforma em franpastori.github.io/mannanauta-blocos-/ no Chrome ou no Edge.';
}

