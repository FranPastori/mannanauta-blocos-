/* =====================================================================
   mannaNAUTA Blocos — editor de blocos para a placa mannaNAUTA (ESP32-S3)
   Os blocos geram MicroPython. A biblioteca micropython/mannanauta.py é a
   versão em Python das bibliotecas livres de wuigor:
     mannaNAUTA_WS2812_Lib  (matriz 5x5 de LEDs, pino 47)
     mannaNAUTA_LSM6DS_Lib  (acelerômetro/giroscópio, SDA 5 / SCL 4)
   ===================================================================== */


const armazenar = {
  ler(k, padrao) { try { const v = localStorage.getItem(k); return v === null ? padrao : v; } catch (e) { return padrao; } },
  gravar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

/* ---------------------------- Cores ---------------------------------- */
const COR = { evento:'#FFBF00', controle:'#FFAB19', matriz:'#9966FF', cor:'#CF63CF', sensor:'#4CBF56', serial:'#0FBD8C', matematica:'#59C059', logica:'#5CB1D6', variavel:'#FF8C1A', pinos:'#5C68A6', internet:'#1CA8DD' };

const CORES_NOMEADAS = [
  ['🔴 vermelho', '0xFF0000'], ['🟢 verde', '0x00FF00'], ['🔵 azul', '0x0000FF'],
  ['🟡 amarelo', '0xFFFF00'], ['🟠 laranja', '0xFF8000'], ['🟣 roxo', '0x8000FF'],
  ['🩷 rosa', '0xFF3080'], ['🩵 ciano', '0x00FFFF'], ['⚪ branco', '0xFFFFFF'], ['⚫ apagado', '0x000000']
];

/* ---------------------------- Blocos --------------------------------- */
const sombraCor = { shadow: { type: 'mn_cor', fields: { COR: '0x00FF00' } } };
const sombraNum = (n) => ({ shadow: { type: 'math_number', fields: { NUM: n } } });

Blockly.defineBlocksWithJsonArray([
  // Eventos
  { type:'mn_ao_ligar', message0:'quando a placa ligar %1 %2', args0:[{type:'input_dummy'},{type:'input_statement',name:'CORPO'}], colour:COR.evento, tooltip:'Roda uma vez, quando a placa liga.' },
  { type:'mn_sempre', message0:'repetir para sempre %1 %2', args0:[{type:'input_dummy'},{type:'input_statement',name:'CORPO'}], colour:COR.evento, tooltip:'Roda sem parar, depois do "quando a placa ligar".' },

  // Controle
  { type:'mn_esperar', message0:'esperar %1 segundos', args0:[{type:'input_value',name:'S',check:'Number'}], previousStatement:null, nextStatement:null, colour:COR.controle, inputsInline:true },
  { type:'mn_esperar_ms', message0:'esperar %1 milissegundos', args0:[{type:'input_value',name:'MS',check:'Number'}], previousStatement:null, nextStatement:null, colour:COR.controle, inputsInline:true },
  { type:'mn_tempo', message0:'tempo desde que ligou (ms)', output:'Number', colour:COR.controle },

  // Matriz de LEDs
  { type:'mn_brilho', message0:'brilho da matriz %1 %%', args0:[{type:'input_value',name:'B',check:'Number'}], previousStatement:null, nextStatement:null, colour:COR.matriz, inputsInline:true, tooltip:'De 0 a 100. Vale para o que for desenhado depois.' },
  { type:'mn_limpar', message0:'apagar a matriz', previousStatement:null, nextStatement:null, colour:COR.matriz },
  { type:'mn_todos', message0:'acender todos os LEDs com %1', args0:[{type:'input_value',name:'COR',check:'Cor'}], previousStatement:null, nextStatement:null, colour:COR.matriz, inputsInline:true },
  { type:'mn_led_xy', message0:'acender LED coluna %1 linha %2 com %3', args0:[{type:'input_value',name:'X',check:'Number'},{type:'input_value',name:'Y',check:'Number'},{type:'input_value',name:'COR',check:'Cor'}], previousStatement:null, nextStatement:null, colour:COR.matriz, inputsInline:true, tooltip:'Coluna e linha de 1 a 5. A linha 1 fica em cima.' },
  { type:'mn_led_n', message0:'acender LED número %1 com %2', args0:[{type:'input_value',name:'N',check:'Number'},{type:'input_value',name:'COR',check:'Cor'}], previousStatement:null, nextStatement:null, colour:COR.matriz, inputsInline:true, tooltip:'LEDs numerados de 1 a 25.' },
  { type:'mn_letra', message0:'mostrar letra %1 com %2', args0:[{type:'field_input',name:'L',text:'A'},{type:'input_value',name:'COR',check:'Cor'}], previousStatement:null, nextStatement:null, colour:COR.matriz, inputsInline:true, tooltip:'Uma letra de A a Z.' },
  { type:'mn_numero', message0:'mostrar número %1 com %2', args0:[{type:'input_value',name:'N',check:'Number'},{type:'input_value',name:'COR',check:'Cor'}], previousStatement:null, nextStatement:null, colour:COR.matriz, inputsInline:true, tooltip:'Um algarismo de 0 a 9.' },
  { type:'mn_texto', message0:'mostrar texto %1 com %2 cada letra por %3 segundos', args0:[{type:'field_input',name:'T',text:'MANNA'},{type:'input_value',name:'COR',check:'Cor'},{type:'input_value',name:'S',check:'Number'}], previousStatement:null, nextStatement:null, colour:COR.matriz, inputsInline:true, tooltip:'Mostra letras (A–Z) e algarismos (0–9), um de cada vez.' },
  { type:'mn_simbolo', message0:'mostrar símbolo %1 com %2', args0:[{type:'field_dropdown',name:'S',options:[['?','?'],['!','!'],['#','#'],['@','@'],['$','$'],['%','%'],['(','('],[')',')'],['[','['],[']',']']]},{type:'input_value',name:'COR',check:'Cor'}], previousStatement:null, nextStatement:null, colour:COR.matriz, inputsInline:true },
  { type:'mn_preparar_xy', message0:'preparar LED coluna %1 linha %2 com %3', args0:[{type:'input_value',name:'X',check:'Number'},{type:'input_value',name:'Y',check:'Number'},{type:'input_value',name:'COR',check:'Cor'}], previousStatement:null, nextStatement:null, colour:COR.matriz, inputsInline:true, tooltip:'Prepara o LED sem acender. Use "mostrar LEDs preparados" para acender tudo de uma vez.' },
  { type:'mn_preparar_n', message0:'preparar LED número %1 com %2', args0:[{type:'input_value',name:'N',check:'Number'},{type:'input_value',name:'COR',check:'Cor'}], previousStatement:null, nextStatement:null, colour:COR.matriz, inputsInline:true, tooltip:'Prepara o LED (1 a 25) sem acender.' },
  { type:'mn_preparar_limpar', message0:'apagar LEDs preparados', previousStatement:null, nextStatement:null, colour:COR.matriz, tooltip:'Apaga a preparação, sem mudar o que está aceso agora.' },
  { type:'mn_mostrar', message0:'mostrar LEDs preparados', previousStatement:null, nextStatement:null, colour:COR.matriz, tooltip:'Acende de uma vez todos os LEDs preparados.' },
  { type:'mn_emocao', message0:'mostrar carinha %1 com %2', args0:[{type:'field_dropdown',name:'E',options:[['feliz =]','=]'],['triste =[','=['],['surpresa =O','=O'],['boca aberta =o','=o'],['confusa =s','=s'],['muito confusa =S','=S']]},{type:'input_value',name:'COR',check:'Cor'}], previousStatement:null, nextStatement:null, colour:COR.matriz, inputsInline:true },

  // Cores
  { type:'mn_cor', message0:'%1', args0:[{type:'field_dropdown',name:'COR',options:CORES_NOMEADAS}], output:'Cor', colour:COR.cor },
  { type:'mn_cor_rgb', message0:'cor vermelho %1 verde %2 azul %3', args0:[{type:'input_value',name:'R',check:'Number'},{type:'input_value',name:'G',check:'Number'},{type:'input_value',name:'B',check:'Number'}], output:'Cor', colour:COR.cor, inputsInline:true, tooltip:'Cada parte vai de 0 a 255.' },
  { type:'mn_cor_hsv', message0:'cor matiz %1 saturação %2 %% brilho %3 %%', args0:[{type:'input_value',name:'H',check:'Number'},{type:'input_value',name:'S',check:'Number'},{type:'input_value',name:'V',check:'Number'}], output:'Cor', colour:COR.cor, inputsInline:true, tooltip:'Matiz de 0 a 360 (volta no círculo das cores); saturação e brilho de 0 a 100.' },
  { type:'mn_cor_arco', message0:'cor do arco-íris na posição %1', args0:[{type:'input_value',name:'P',check:'Number'}], output:'Cor', colour:COR.cor, inputsInline:true, tooltip:'Posição de 0 a 255: percorre todas as cores.' },

  // Sensor de movimento
  { type:'mn_aceleracao', message0:'aceleração no eixo %1 (g)', args0:[{type:'field_dropdown',name:'EIXO',options:[['X','x'],['Y','y'],['Z','z']]}], output:'Number', colour:COR.sensor, tooltip:'Parada e deitada, a placa marca cerca de 1 g no eixo Z.' },
  { type:'mn_giro', message0:'giro no eixo %1 (graus/s)', args0:[{type:'field_dropdown',name:'EIXO',options:[['X','x'],['Y','y'],['Z','z']]}], output:'Number', colour:COR.sensor },
  { type:'mn_angulo', message0:'inclinação %1 em graus', args0:[{type:'field_dropdown',name:'TIPO',options:[['para os lados','rol'],['para frente e para trás','arf']]}], output:'Number', colour:COR.sensor },
  { type:'mn_inclinada', message0:'placa inclinada %1 ?', args0:[{type:'field_dropdown',name:'DIR',options:[['para frente','1'],['para trás','2'],['para a direita','3'],['para a esquerda','4'],['nivelada (reta)','0']]}], output:'Boolean', colour:COR.sensor },
  { type:'mn_sacudida', message0:'placa sacudida?', output:'Boolean', colour:COR.sensor },
  { type:'mn_sensibilidade', message0:'sensibilidade da sacudida %1', args0:[{type:'field_dropdown',name:'NIVEL',options:[['média','20'],['alta (sacudida leve)','8'],['baixa (sacudida forte)','40']]}], previousStatement:null, nextStatement:null, colour:COR.sensor },
  { type:'mn_faixa_acel', message0:'faixa do acelerômetro %1', args0:[{type:'field_dropdown',name:'F',options:[['±2 g','2'],['±4 g','4'],['±8 g','8'],['±16 g','16']]}], previousStatement:null, nextStatement:null, colour:COR.sensor, tooltip:'Faixas maiores medem movimentos mais fortes, com menos detalhe.' },
  { type:'mn_faixa_giro', message0:'faixa do giroscópio %1', args0:[{type:'field_dropdown',name:'F',options:[['±250 graus/s','250'],['±125 graus/s','125'],['±500 graus/s','500'],['±1000 graus/s','1000'],['±2000 graus/s','2000']]}], previousStatement:null, nextStatement:null, colour:COR.sensor },
  { type:'mn_conectado', message0:'sensor conectado?', output:'Boolean', colour:COR.sensor },
  { type:'mn_nome_sensor', message0:'nome do sensor', output:'String', colour:COR.sensor, tooltip:'Bom para escrever no monitor e conferir a placa.' },
  { type:'mn_temperatura', message0:'temperatura (°C)', output:'Number', colour:COR.sensor },
  { type:'mn_passos', message0:'número de passos', output:'Number', colour:COR.sensor, tooltip:'Conta passos quando a placa vai junto com quem anda.' },
  { type:'mn_zerar_passos', message0:'zerar contador de passos', previousStatement:null, nextStatement:null, colour:COR.sensor },

  // Pinos
  { type:'mn_analogico', message0:'leitura analógica no pino %1', args0:[{type:'field_dropdown',name:'PINO',options:[['1','1'],['2','2'],['3','3'],['6','6'],['7','7'],['8','8'],['9','9'],['10','10']]}], output:'Number', colour:COR.pinos, tooltip:'Valor de 0 a 4095 (0 a 3,3 V). Ex.: sensor de umidade do solo.' },

  // Internet (IoT)
  { type:'mn_wifi', message0:'conectar ao Wi-Fi rede %1 senha %2', args0:[{type:'field_input',name:'REDE',text:'nome da rede'},{type:'field_input',name:'SENHA',text:'senha'}], previousStatement:null, nextStatement:null, colour:COR.internet, tooltip:'Use no "quando a placa ligar". Redes com página de login não funcionam.' },
  { type:'mn_wifi_ok', message0:'Wi-Fi conectado?', output:'Boolean', colour:COR.internet },
  { type:'mn_blynk', message0:'conectar ao Blynk com o código %1', args0:[{type:'field_input',name:'TOKEN',text:'código da placa'}], previousStatement:null, nextStatement:null, colour:COR.internet, tooltip:'Cole o código (Auth Token) desta placa, criado no Blynk.' },
  { type:'mn_blynk_enviar', message0:'enviar %1 para o Blynk no pino %2', args0:[{type:'input_value',name:'V'},{type:'field_dropdown',name:'PINO',options:[['V0','V0'],['V1','V1'],['V2','V2'],['V3','V3'],['V4','V4'],['V5','V5'],['V6','V6'],['V7','V7'],['V8','V8'],['V9','V9']]}], previousStatement:null, nextStatement:null, colour:COR.internet, inputsInline:true, tooltip:'Envia um valor para o painel do Blynk. Espere alguns segundos entre um envio e outro.' },

  // Monitor serial
  { type:'mn_escrever', message0:'escrever no monitor %1', args0:[{type:'input_value',name:'V'}], previousStatement:null, nextStatement:null, colour:COR.serial, inputsInline:true },
  { type:'mn_escrever_dois', message0:'escrever no monitor %1 %2', args0:[{type:'input_value',name:'A'},{type:'input_value',name:'B'}], previousStatement:null, nextStatement:null, colour:COR.serial, inputsInline:true, tooltip:'Escreve duas coisas na mesma linha, por exemplo um nome e um valor.' }
]);

// Bloco de desenho: grade 5x5 de caixinhas.
Blockly.Blocks['mn_desenho'] = {
  init() {
    this.appendDummyInput().appendField('desenhar com');
    this.appendValueInput('COR').setCheck('Cor');
    for (let y = 0; y < 5; y++) {
      const linha = this.appendDummyInput();
      for (let x = 0; x < 5; x++) linha.appendField(new Blockly.FieldCheckbox(false), `P${y * 5 + x}`);
    }
    this.setInputsInline(false);
    this.setPreviousStatement(true); this.setNextStatement(true);
    this.setColour(COR.matriz);
    this.setTooltip('Marque os LEDs que devem acender.');
  }
};

// Os blocos padrão do Blockly ganham a cor da categoria em que aparecem.
const RECOLORIR = {
  controle: ['controls_if', 'controls_repeat_ext', 'controls_whileUntil', 'controls_for', 'controls_flow_statements'],
  matematica: ['math_number', 'math_arithmetic', 'math_random_int', 'math_modulo', 'math_round', 'math_single',
               'logic_compare', 'logic_operation', 'logic_negate', 'logic_boolean'],
  serial: ['text'],
  variavel: ['variables_get', 'variables_set', 'math_change']
};
for (const [categoria, tipos] of Object.entries(RECOLORIR)) {
  for (const tipo of tipos) {
    const def = Blockly.Blocks[tipo];
    if (!def || def.__recolorido) continue;
    const initOriginal = def.init;
    def.init = function () { initOriginal.call(this); this.setColour(COR[categoria]); };
    def.__recolorido = true;
  }
}

