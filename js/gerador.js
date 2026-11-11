/* ---------------------- Gerador de MicroPython ----------------------- */
const Py = new Blockly.CodeGenerator('MicroPython');
Py.ORDER_ATOMIC = 0; Py.ORDER_EXP = 3; Py.ORDER_UNARY = 4; Py.ORDER_MULT = 5; Py.ORDER_ADD = 6;
Py.ORDER_REL = 11; Py.ORDER_NOT = 12; Py.ORDER_AND = 13; Py.ORDER_OR = 14; Py.ORDER_NONE = 99;
Py.INDENT = '    ';
Py.addReservedWords('False,None,True,and,as,assert,break,class,continue,def,del,elif,else,except,finally,for,from,global,if,import,in,is,lambda,nonlocal,not,or,pass,raise,return,try,while,with,yield,' +
  'time,math,random,print,int,float,str,range,abs,round,matriz,sensor,Matriz,Sensor,contar,cor_rgb,cor_arco,cor_hsv,mannanauta');

Py.init = function (ws) {
  Object.getPrototypeOf(this).init.call(this, ws);
  this.usa = new Set();
  if (!this.nameDB_) this.nameDB_ = new Blockly.Names(this.RESERVED_WORDS_);
  else this.nameDB_.reset();
  this.nameDB_.setVariableMap(ws.getVariableMap());
  this.nameDB_.populateVariables(ws);
  // Nomes de variável legíveis: "posição" vira "posicao"
  this.nomesVar = new Map();
  const usados = new Set(this.RESERVED_WORDS_.split(','));
  for (const va of ws.getVariableMap().getAllVariables()) {
    let n = va.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    if (!n) n = 'variavel';
    if (/^[0-9]/.test(n)) n = 'v_' + n;
    let final = n, k = 2;
    while (usados.has(final)) final = n + '_' + k++;
    usados.add(final);
    this.nomesVar.set(va.getId(), final);
  }
};
Py.scrub_ = function (block, code, thisOnly) {
  const prox = block.nextConnection && block.nextConnection.targetBlock();
  return code + (prox && !thisOnly ? this.blockToCode(prox) : '');
};
Py.scrubNakedValue = (line) => line + '\n';
Py.nomeVar = function (id) { return this.nomesVar.get(id) || this.nameDB_.getName(id, Blockly.Names.NameType.VARIABLE); };
Py.corpo = function (b, nome) { return this.statementToCode(b, nome) || this.INDENT + 'pass\n'; };
const v = (b, nome, ordem, padrao = '0') => Py.valueToCode(b, nome, ordem ?? Py.ORDER_NONE) || padrao;
const usaMatriz = () => Py.usa.add('matriz');
const cor = (b) => { usaMatriz(); return v(b, 'COR', Py.ORDER_NONE, '0x00FF00'); };
const f = Py.forBlock;

// Blocos padrão do Blockly
f['math_number'] = (b) => { const n = Number(b.getFieldValue('NUM')); return [String(n), n < 0 ? Py.ORDER_UNARY : Py.ORDER_ATOMIC]; };
f['math_arithmetic'] = (b) => {
  const op = b.getFieldValue('OP');
  const t = { ADD:['+', Py.ORDER_ADD], MINUS:['-', Py.ORDER_ADD], MULTIPLY:['*', Py.ORDER_MULT], DIVIDE:['/', Py.ORDER_MULT], POWER:['**', Py.ORDER_EXP] }[op];
  return [`${v(b,'A',t[1])} ${t[0]} ${v(b,'B',t[1])}`, t[1]];
};
f['math_modulo'] = (b) => [`${v(b,'DIVIDEND',Py.ORDER_MULT)} % ${v(b,'DIVISOR',Py.ORDER_MULT,'1')}`, Py.ORDER_MULT];
f['math_random_int'] = (b) => { Py.usa.add('random'); return [`random.randint(int(${v(b,'FROM')}), int(${v(b,'TO')}))`, Py.ORDER_ATOMIC]; };
f['math_round'] = (b) => {
  const op = b.getFieldValue('OP'), x = v(b, 'NUM');
  if (op === 'ROUND') return [`round(${x})`, Py.ORDER_ATOMIC];
  Py.usa.add('math');
  return [`math.${op === 'ROUNDUP' ? 'ceil' : 'floor'}(${x})`, Py.ORDER_ATOMIC];
};
f['math_single'] = (b) => {
  const op = b.getFieldValue('OP'), x = v(b, 'NUM');
  if (op === 'ABS') return [`abs(${x})`, Py.ORDER_ATOMIC];
  if (op === 'NEG') return [`-(${x})`, Py.ORDER_UNARY];
  if (op === 'POW10') return [`10 ** (${x})`, Py.ORDER_EXP];
  Py.usa.add('math');
  const t = { ROOT:`math.sqrt(${x})`, LN:`math.log(${x})`, LOG10:`(math.log(${x}) / math.log(10))`, EXP:`math.exp(${x})` };
  return [t[op] || x, Py.ORDER_ATOMIC];
};
f['logic_boolean'] = (b) => [b.getFieldValue('BOOL') === 'TRUE' ? 'True' : 'False', Py.ORDER_ATOMIC];
f['logic_negate'] = (b) => [`not ${v(b,'BOOL',Py.ORDER_NOT,'False')}`, Py.ORDER_NOT];
f['logic_operation'] = (b) => {
  const e = b.getFieldValue('OP') === 'AND', o = e ? Py.ORDER_AND : Py.ORDER_OR;
  return [`${v(b,'A',o,'False')} ${e ? 'and' : 'or'} ${v(b,'B',o,'False')}`, o];
};
f['logic_compare'] = (b) => {
  const op = { EQ:'==', NEQ:'!=', LT:'<', LTE:'<=', GT:'>', GTE:'>=' }[b.getFieldValue('OP')];
  return [`${v(b,'A',Py.ORDER_REL)} ${op} ${v(b,'B',Py.ORDER_REL)}`, Py.ORDER_REL];
};
f['controls_if'] = (b) => {
  let code = '';
  for (let i = 0; b.getInput('IF' + i); i++) {
    code += (i ? 'elif ' : 'if ') + v(b, 'IF' + i, Py.ORDER_NONE, 'False') + ':\n' + Py.corpo(b, 'DO' + i);
  }
  if (b.getInput('ELSE')) code += 'else:\n' + Py.corpo(b, 'ELSE');
  return code;
};
f['controls_repeat_ext'] = (b) => {
  const i = Py.nameDB_.getDistinctName('_i', Blockly.Names.NameType.VARIABLE);
  return `for ${i} in range(int(${v(b,'TIMES')})):\n${Py.corpo(b,'DO')}`;
};
f['controls_whileUntil'] = (b) => {
  let c = v(b, 'BOOL', Py.ORDER_NONE, 'False');
  if (b.getFieldValue('MODE') === 'UNTIL') c = `not (${c})`;
  return `while ${c}:\n${Py.corpo(b,'DO')}`;
};
f['controls_for'] = (b) => {
  const n = Py.nomeVar(b.getFieldValue('VAR'));
  return `for ${n} in contar(${v(b,'FROM')}, ${v(b,'TO')}, ${v(b,'BY',Py.ORDER_NONE,'1')}):\n${Py.corpo(b,'DO')}`;
};
f['controls_flow_statements'] = (b) => {
  const lacos = ['controls_repeat_ext', 'controls_whileUntil', 'controls_for'];
  let pai = b.getSurroundParent();
  while (pai && !lacos.includes(pai.type)) pai = pai.getSurroundParent();
  if (!pai) return '# (bloco "sair do laço" fora de um laço foi ignorado)\n';
  return b.getFieldValue('FLOW') === 'BREAK' ? 'break\n' : 'continue\n';
};
f['variables_get'] = (b) => [Py.nomeVar(b.getFieldValue('VAR')), Py.ORDER_ATOMIC];
f['variables_set'] = (b) => `${Py.nomeVar(b.getFieldValue('VAR'))} = ${v(b,'VALUE')}\n`;
f['math_change'] = (b) => `${Py.nomeVar(b.getFieldValue('VAR'))} += ${v(b,'DELTA')}\n`;
f['text'] = (b) => [JSON.stringify(b.getFieldValue('TEXT')), Py.ORDER_ATOMIC];

// Eventos e controle
f['mn_ao_ligar'] = () => ''; f['mn_sempre'] = () => '';
f['mn_esperar'] = (b) => `time.sleep(${v(b,'S')})\n`;
f['mn_esperar_ms'] = (b) => `time.sleep_ms(int(${v(b,'MS')}))\n`;
f['mn_tempo'] = () => ['time.ticks_ms()', Py.ORDER_ATOMIC];

// Matriz
f['mn_brilho'] = (b) => { usaMatriz(); return `matriz.brilho(${v(b,'B')})\n`; };
f['mn_limpar'] = () => { usaMatriz(); return 'matriz.limpar()\n'; };
f['mn_todos'] = (b) => `matriz.todos(${cor(b)})\n`;
f['mn_led_xy'] = (b) => { const c = cor(b); return `matriz.led_xy(${v(b,'X')}, ${v(b,'Y')}, ${c})\n`; };
f['mn_led_n'] = (b) => { const c = cor(b); return `matriz.led(int(${v(b,'N')}) - 1, ${c})\n`; };
f['mn_preparar_xy'] = (b) => { const c = cor(b); return `matriz.preparar_xy(${v(b,'X')}, ${v(b,'Y')}, ${c})\n`; };
f['mn_preparar_n'] = (b) => { const c = cor(b); return `matriz.preparar(int(${v(b,'N')}) - 1, ${c})\n`; };
f['mn_preparar_limpar'] = () => { usaMatriz(); return 'matriz.preparar_todos(0)\n'; };
f['mn_mostrar'] = () => { usaMatriz(); return 'matriz.mostrar()\n'; };
f['mn_letra'] = (b) => {
  const c = cor(b);
  let l = (b.getFieldValue('L') || 'A').trim().toUpperCase().charAt(0);
  if (!/[A-Z]/.test(l)) l = 'A';
  return `matriz.letra("${l}", ${c})\n`;
};
f['mn_numero'] = (b) => { const c = cor(b); return `matriz.numero(${v(b,'N')}, ${c})\n`; };
f['mn_texto'] = (b) => { const c = cor(b); return `matriz.texto(${JSON.stringify(b.getFieldValue('T') || '')}, ${c}, ${v(b,'S',Py.ORDER_NONE,'0.5')})\n`; };
f['mn_simbolo'] = (b) => { const c = cor(b); return `matriz.simbolo(${JSON.stringify(b.getFieldValue('S'))}, ${c})\n`; };
f['mn_emocao'] = (b) => { const c = cor(b); return `matriz.emocao("${b.getFieldValue('E')}", ${c})\n`; };
f['mn_desenho'] = (b) => {
  const c = cor(b);
  let bits = '';
  for (let i = 0; i < 25; i++) bits += b.getFieldValue('P' + i) === 'TRUE' ? '1' : '0';
  return `matriz.desenho("${bits}", ${c})\n`;
};

// Cores
f['mn_cor'] = (b) => [b.getFieldValue('COR'), Py.ORDER_ATOMIC];
f['mn_cor_rgb'] = (b) => [`cor_rgb(${v(b,'R')}, ${v(b,'G')}, ${v(b,'B')})`, Py.ORDER_ATOMIC];
f['mn_cor_hsv'] = (b) => [`cor_hsv(${v(b,'H')}, ${v(b,'S')}, ${v(b,'V')})`, Py.ORDER_ATOMIC];
f['mn_cor_arco'] = (b) => [`cor_arco(${v(b,'P')})`, Py.ORDER_ATOMIC];

// Sensor
const sensor = (extra) => { Py.usa.add('sensor'); if (extra) Py.usa.add(extra); };
f['mn_aceleracao'] = (b) => { sensor(); return [`sensor.aceleracao_eixo("${b.getFieldValue('EIXO')}")`, Py.ORDER_ATOMIC]; };
f['mn_giro'] = (b) => { sensor(); return [`sensor.giro_eixo("${b.getFieldValue('EIXO')}")`, Py.ORDER_ATOMIC]; };
f['mn_angulo'] = (b) => { sensor(); return [`sensor.angulo(${b.getFieldValue('TIPO') === 'rol' ? 'True' : 'False'})`, Py.ORDER_ATOMIC]; };
f['mn_inclinada'] = (b) => { sensor(); return [`sensor.inclinacao() == ${b.getFieldValue('DIR')}`, Py.ORDER_REL]; };
f['mn_sacudida'] = () => { sensor('sacudida'); return ['sensor.sacudida()', Py.ORDER_ATOMIC]; };
f['mn_temperatura'] = () => { sensor(); return ['sensor.temperatura()', Py.ORDER_ATOMIC]; };
f['mn_passos'] = () => { sensor('passos'); return ['sensor.passos()', Py.ORDER_ATOMIC]; };
f['mn_zerar_passos'] = () => { sensor('passos'); return 'sensor.zerar_passos()\n'; };
f['mn_sensibilidade'] = (b) => { sensor('sacudida'); return `sensor.sensibilidade(${b.getFieldValue('NIVEL')})\n`; };
f['mn_faixa_acel'] = (b) => { sensor(); return `sensor.faixa_acelerometro(${b.getFieldValue('F')})\n`; };
f['mn_faixa_giro'] = (b) => { sensor(); return `sensor.faixa_giroscopio(${b.getFieldValue('F')})\n`; };
f['mn_conectado'] = () => { sensor(); return ['sensor.conectado', Py.ORDER_ATOMIC]; };
f['mn_nome_sensor'] = () => { sensor(); return ['sensor.nome()', Py.ORDER_ATOMIC]; };

// Pinos e internet
f['mn_analogico'] = (b) => [`leitura_analogica(${b.getFieldValue('PINO')})`, Py.ORDER_ATOMIC];
f['mn_wifi'] = (b) => `wifi_conectar(${JSON.stringify(b.getFieldValue('REDE'))}, ${JSON.stringify(b.getFieldValue('SENHA'))})\n`;
f['mn_wifi_ok'] = () => ['wifi_conectado()', Py.ORDER_ATOMIC];
f['mn_blynk'] = (b) => `blynk_conectar(${JSON.stringify((b.getFieldValue('TOKEN') || '').trim())})\n`;
f['mn_blynk_enviar'] = (b) => `blynk_enviar("${b.getFieldValue('PINO')}", ${v(b,'V')})\n`;

// Página web da placa
f['mn_wifi_criar'] = (b) => `wifi_criar(${JSON.stringify(b.getFieldValue('NOME'))}, ${JSON.stringify(b.getFieldValue('SENHA'))})\n`;
f['mn_pagina_iniciar'] = (b) => `pagina_iniciar(${JSON.stringify(b.getFieldValue('TITULO'))})\n`;
f['mn_pagina_mostrar'] = (b) => `pagina_mostrar(${JSON.stringify(b.getFieldValue('NOME'))}, ${v(b,'V')})\n`;
f['mn_endereco'] = () => ['endereco_pagina()', Py.ORDER_ATOMIC];

// Monitor serial
f['mn_escrever'] = (b) => `print(${v(b,'V',Py.ORDER_NONE,'""')})\n`;
f['mn_escrever_dois'] = (b) => `print(${v(b,'A',Py.ORDER_NONE,'""')}, ${v(b,'B',Py.ORDER_NONE,'""')})\n`;

/* Monta o programa completo (main.py) a partir da área de blocos. */
function gerarPrograma(ws) {
  Py.init(ws);
  let setup = '', loop = '';
  const soltos = [];
  for (const topo of ws.getTopBlocks(true)) {
    if (!topo.isEnabled()) continue;
    if (topo.type === 'mn_ao_ligar') { const p = topo.getInputTargetBlock('CORPO'); if (p) setup += Py.blockToCode(p); }
    else if (topo.type === 'mn_sempre') loop += Py.statementToCode(topo, 'CORPO');
    else soltos.push(topo);
  }
  const u = Py.usa;
  const L = [];
  L.push('# Programa gerado pelo mannaNAUTA Blocos');
  L.push('# Placa: mannaNAUTA');
  L.push('');
  L.push('import time');
  if (u.has('math')) L.push('import math');
  if (u.has('random')) L.push('import random');
  L.push('from mannanauta import *');
  L.push('');
  if (u.has('matriz')) L.push('matriz = Matriz()');
  if (u.has('sensor')) L.push('sensor = Sensor()');
  if (u.has('passos')) L.push('sensor.ligar_passos()');
  if (u.has('sacudida')) L.push('sensor.sensibilidade(20)');

  const vars = ws.getVariableMap().getAllVariables();
  if (vars.length) { L.push(''); for (const va of vars) L.push(`${Py.nomeVar(va.getId())} = 0`); }

  if (setup) { L.push(''); L.push('# quando a placa ligar'); L.push(setup.replace(/\s+$/, '')); }
  L.push('');
  L.push('# repetir para sempre');
  L.push('while True:');
  L.push(loop ? loop.replace(/\s+$/, '') : Py.INDENT + 'time.sleep_ms(100)');
  if (soltos.length) {
    L.push('');
    L.push(`# Atenção: ${soltos.length} bloco(s) fora de "quando a placa ligar" ou "repetir para sempre" não entraram no programa.`);
  }
  return L.join('\n') + '\n';
}

