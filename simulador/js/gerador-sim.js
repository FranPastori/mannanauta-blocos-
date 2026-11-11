/* ---------------- Gerador para o simulador (JavaScript) ----------------
   Transforma os blocos em JavaScript assíncrono que roda no navegador.
   Cada bloco chama o objeto S (o simulador da placa), definido em simulador.js.
   As variáveis ficam no objeto V. */
const Js = new Blockly.CodeGenerator('Simulador');
Js.ORDER_ATOMIC = 0; Js.ORDER_EXP = 2; Js.ORDER_UNARY = 4; Js.ORDER_MULT = 5; Js.ORDER_ADD = 6;
Js.ORDER_REL = 8; Js.ORDER_EQ = 9; Js.ORDER_AND = 13; Js.ORDER_OR = 14; Js.ORDER_NONE = 99;
Js.INDENT = '  ';

Js.init = function (ws) {
  Object.getPrototypeOf(this).init.call(this, ws);
  this.usa = new Set();
};
Js.scrub_ = function (block, code, thisOnly) {
  const prox = block.nextConnection && block.nextConnection.targetBlock();
  return code + (prox && !thisOnly ? this.blockToCode(prox) : '');
};
Js.scrubNakedValue = (line) => line + ';\n';
const jv = (b, nome, ordem, padrao = '0') => Js.valueToCode(b, nome, ordem ?? Js.ORDER_NONE) || padrao;
const jvar = (b) => `V[${JSON.stringify(b.getFieldValue('VAR'))}]`;
const jcor = (b) => jv(b, 'COR', Js.ORDER_NONE, '0x00FF00');
const jcampo = (b, n) => JSON.stringify(b.getFieldValue(n));
const g = Js.forBlock;
const TICK = 'await S.tick();\n';

// Blocos padrão do Blockly
g['math_number'] = (b) => { const n = Number(b.getFieldValue('NUM')); return [String(n), n < 0 ? Js.ORDER_UNARY : Js.ORDER_ATOMIC]; };
g['math_arithmetic'] = (b) => {
  const op = b.getFieldValue('OP');
  if (op === 'POWER') return [`Math.pow(${jv(b,'A')}, ${jv(b,'B')})`, Js.ORDER_ATOMIC];
  const t = { ADD:['+', Js.ORDER_ADD], MINUS:['-', Js.ORDER_ADD], MULTIPLY:['*', Js.ORDER_MULT], DIVIDE:['/', Js.ORDER_MULT] }[op];
  return [`(${jv(b,'A')}) ${t[0]} (${jv(b,'B')})`, t[1]];
};
g['math_modulo'] = (b) => [`S.resto(${jv(b,'DIVIDEND')}, ${jv(b,'DIVISOR',Js.ORDER_NONE,'1')})`, Js.ORDER_ATOMIC];
g['math_random_int'] = (b) => [`S.aleatorio(${jv(b,'FROM')}, ${jv(b,'TO')})`, Js.ORDER_ATOMIC];
g['math_round'] = (b) => {
  const fn = { ROUND:'Math.round', ROUNDUP:'Math.ceil', ROUNDDOWN:'Math.floor' }[b.getFieldValue('OP')];
  return [`${fn}(${jv(b,'NUM')})`, Js.ORDER_ATOMIC];
};
g['math_single'] = (b) => {
  const x = jv(b, 'NUM');
  const t = { ROOT:`Math.sqrt(${x})`, ABS:`Math.abs(${x})`, NEG:`-(${x})`, LN:`Math.log(${x})`, LOG10:`Math.log10(${x})`, EXP:`Math.exp(${x})`, POW10:`Math.pow(10, ${x})` };
  return [t[b.getFieldValue('OP')] || x, Js.ORDER_ATOMIC];
};
g['logic_boolean'] = (b) => [b.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false', Js.ORDER_ATOMIC];
g['logic_negate'] = (b) => [`!(${jv(b,'BOOL',Js.ORDER_NONE,'false')})`, Js.ORDER_UNARY];
g['logic_operation'] = (b) => {
  const e = b.getFieldValue('OP') === 'AND';
  return [`(${jv(b,'A',Js.ORDER_NONE,'false')}) ${e ? '&&' : '||'} (${jv(b,'B',Js.ORDER_NONE,'false')})`, e ? Js.ORDER_AND : Js.ORDER_OR];
};
g['logic_compare'] = (b) => {
  const op = { EQ:'==', NEQ:'!=', LT:'<', LTE:'<=', GT:'>', GTE:'>=' }[b.getFieldValue('OP')];
  return [`(${jv(b,'A')}) ${op} (${jv(b,'B')})`, Js.ORDER_REL];
};
g['controls_if'] = (b) => {
  let code = '';
  for (let i = 0; b.getInput('IF' + i); i++) {
    code += (i ? ' else if (' : 'if (') + jv(b, 'IF' + i, Js.ORDER_NONE, 'false') + ') {\n' + Js.statementToCode(b, 'DO' + i) + '}';
  }
  if (b.getInput('ELSE')) code += ' else {\n' + Js.statementToCode(b, 'ELSE') + '}';
  return code + '\n';
};
g['controls_repeat_ext'] = (b) =>
  `for (let _i = 0, _n = Number(${jv(b,'TIMES')}); _i < _n; _i++) {\n${Js.statementToCode(b,'DO')}${Js.INDENT}${TICK}}\n`;
g['controls_whileUntil'] = (b) => {
  let c = jv(b, 'BOOL', Js.ORDER_NONE, 'false');
  if (b.getFieldValue('MODE') === 'UNTIL') c = `!(${c})`;
  return `while (${c}) {\n${Js.statementToCode(b,'DO')}${Js.INDENT}${TICK}}\n`;
};
g['controls_for'] = (b) => {
  const n = jvar(b);
  return `{ const _de = Number(${jv(b,'FROM')}), _ate = Number(${jv(b,'TO')}); let _p = Number(${jv(b,'BY',Js.ORDER_NONE,'1')}) || 1;\n` +
    `for (${n} = _de; _p > 0 ? ${n} <= _ate : ${n} >= _ate; ${n} += _p) {\n${Js.statementToCode(b,'DO')}${Js.INDENT}${TICK}} }\n`;
};
g['controls_flow_statements'] = (b) => {
  const lacos = ['controls_repeat_ext', 'controls_whileUntil', 'controls_for'];
  let pai = b.getSurroundParent();
  while (pai && !lacos.includes(pai.type)) pai = pai.getSurroundParent();
  if (!pai) return '';
  return b.getFieldValue('FLOW') === 'BREAK' ? 'break;\n' : 'continue;\n';
};
g['variables_get'] = (b) => [jvar(b), Js.ORDER_ATOMIC];
g['variables_set'] = (b) => `${jvar(b)} = ${jv(b,'VALUE')};\n`;
g['math_change'] = (b) => `${jvar(b)} = Number(${jvar(b)}) + Number(${jv(b,'DELTA')});\n`;
g['text_join'] = (b) => {
  const partes = [];
  for (let i = 0; i < (b.itemCount_ || 0); i++) partes.push(`S.str(${jv(b, 'ADD' + i, Js.ORDER_NONE, '""')})`);
  return [partes.length ? partes.join(' + ') : '""', Js.ORDER_ADD];
};
g['text'] = (b) => [JSON.stringify(b.getFieldValue('TEXT')), Js.ORDER_ATOMIC];

// Eventos e controle
g['mn_ao_ligar'] = () => ''; g['mn_sempre'] = () => '';
g['mn_esperar'] = (b) => `await S.esperar(Number(${jv(b,'S')}) * 1000);\n`;
g['mn_esperar_ms'] = (b) => `await S.esperar(Number(${jv(b,'MS')}));\n`;
g['mn_tempo'] = () => ['S.millis()', Js.ORDER_ATOMIC];

// Matriz
g['mn_brilho'] = (b) => `S.matriz.brilho(${jv(b,'B')});\n`;
g['mn_limpar'] = () => 'S.matriz.limpar();\n';
g['mn_todos'] = (b) => `S.matriz.todos(${jcor(b)});\n`;
g['mn_led_xy'] = (b) => `S.matriz.ledXY(${jv(b,'X')}, ${jv(b,'Y')}, ${jcor(b)});\n`;
g['mn_led_n'] = (b) => `S.matriz.led(Number(${jv(b,'N')}) - 1, ${jcor(b)});\n`;
g['mn_preparar_xy'] = (b) => `S.matriz.prepararXY(${jv(b,'X')}, ${jv(b,'Y')}, ${jcor(b)});\n`;
g['mn_preparar_n'] = (b) => `S.matriz.preparar(Number(${jv(b,'N')}) - 1, ${jcor(b)});\n`;
g['mn_preparar_limpar'] = () => 'S.matriz.prepararTodos(0);\n';
g['mn_mostrar'] = () => 'S.matriz.mostrar();\n';
g['mn_letra'] = (b) => {
  let l = (b.getFieldValue('L') || 'A').trim().toUpperCase().charAt(0);
  if (!/[A-Z]/.test(l)) l = 'A';
  return `S.matriz.letra("${l}", ${jcor(b)});\n`;
};
g['mn_numero'] = (b) => `S.matriz.numero(${jv(b,'N')}, ${jcor(b)});\n`;
g['mn_texto'] = (b) => `await S.matriz.texto(${jcampo(b,'T')}, ${jcor(b)}, ${jv(b,'S',Js.ORDER_NONE,'0.5')});\n`;
g['mn_simbolo'] = (b) => `S.matriz.simbolo(${jcampo(b,'S')}, ${jcor(b)});\n`;
g['mn_emocao'] = (b) => `S.matriz.emocao(${jcampo(b,'E')}, ${jcor(b)});\n`;
g['mn_desenho'] = (b) => {
  let bits = '';
  for (let i = 0; i < 25; i++) bits += b.getFieldValue('P' + i) === 'TRUE' ? '1' : '0';
  return `S.matriz.desenho("${bits}", ${jcor(b)});\n`;
};

// Cores
g['mn_cor'] = (b) => [b.getFieldValue('COR'), Js.ORDER_ATOMIC];
g['mn_cor_rgb'] = (b) => [`S.corRGB(${jv(b,'R')}, ${jv(b,'G')}, ${jv(b,'B')})`, Js.ORDER_ATOMIC];
g['mn_cor_hsv'] = (b) => [`S.corHSV(${jv(b,'H')}, ${jv(b,'S')}, ${jv(b,'V')})`, Js.ORDER_ATOMIC];
g['mn_cor_arco'] = (b) => [`S.corArco(${jv(b,'P')})`, Js.ORDER_ATOMIC];

// Sensor de movimento
g['mn_aceleracao'] = (b) => [`S.sensor.aceleracao(${jcampo(b,'EIXO')})`, Js.ORDER_ATOMIC];
g['mn_giro'] = (b) => [`S.sensor.giro(${jcampo(b,'EIXO')})`, Js.ORDER_ATOMIC];
g['mn_angulo'] = (b) => [`S.sensor.angulo(${b.getFieldValue('TIPO') === 'rol'})`, Js.ORDER_ATOMIC];
g['mn_inclinada'] = (b) => [`(S.sensor.inclinacao() == ${b.getFieldValue('DIR')})`, Js.ORDER_ATOMIC];
g['mn_sacudida'] = () => ['S.sensor.sacudida()', Js.ORDER_ATOMIC];
g['mn_temperatura'] = () => ['S.sensor.temperatura()', Js.ORDER_ATOMIC];
g['mn_passos'] = () => ['S.sensor.passos()', Js.ORDER_ATOMIC];
g['mn_zerar_passos'] = () => 'S.sensor.zerarPassos();\n';
g['mn_sensibilidade'] = () => '';
g['mn_faixa_acel'] = () => '';
g['mn_faixa_giro'] = () => '';
g['mn_conectado'] = () => ['true', Js.ORDER_ATOMIC];
g['mn_nome_sensor'] = () => ['"LSM6DS (simulado)"', Js.ORDER_ATOMIC];

// Pinos, som, componentes e botões
g['mn_pino_modo'] = (b) => `S.pinos.modo(${b.getFieldValue('PINO')}, ${jcampo(b,'MODO')});\n`;
g['mn_digital_escrever'] = (b) => `S.pinos.escrever(${b.getFieldValue('PINO')}, ${b.getFieldValue('VALOR')});\n`;
g['mn_digital_ler'] = (b) => [`S.pinos.ler(${b.getFieldValue('PINO')})`, Js.ORDER_ATOMIC];
g['mn_pwm'] = (b) => `S.pinos.pwm(${b.getFieldValue('PINO')}, ${jv(b,'V')});\n`;
g['mn_analogico'] = (b) => [`S.pinos.analogico(${b.getFieldValue('PINO')})`, Js.ORDER_ATOMIC];
g['mn_nota'] = (b) => `await S.som.tocar(${b.getFieldValue('PINO')}, ${b.getFieldValue('NOTA')}, ${jv(b,'S',Js.ORDER_NONE,'0.5')});\n`;
g['mn_tom'] = (b) => `S.som.tom(${b.getFieldValue('PINO')}, ${jv(b,'F',Js.ORDER_NONE,'440')});\n`;
g['mn_sem_tom'] = (b) => `S.som.parar(${b.getFieldValue('PINO')});\n`;
g['mn_servo'] = (b) => `S.pinos.servo(${b.getFieldValue('PINO')}, ${jv(b,'A',Js.ORDER_NONE,'90')});\n`;
g['mn_distancia'] = (b) => [`S.pinos.distancia(${b.getFieldValue('TRIG')}, ${b.getFieldValue('ECHO')})`, Js.ORDER_ATOMIC];
g['mn_botao'] = (b) => [`S.pinos.botao(${b.getFieldValue('PINO')})`, Js.ORDER_ATOMIC];
g['mn_dht'] = (b) => [`S.pinos.dht(${b.getFieldValue('PINO')}, ${jcampo(b,'TIPO')})`, Js.ORDER_ATOMIC];
g['mn_toque'] = (b) => [`S.botoes.toque(${jcampo(b,'LADO')})`, Js.ORDER_ATOMIC];
g['mn_toque_valor'] = (b) => [`S.botoes.leitura(${jcampo(b,'LADO')})`, Js.ORDER_ATOMIC];
g['mn_boot'] = () => ['S.botoes.boot()', Js.ORDER_ATOMIC];

// Operadores extras
g['mn_mapear'] = (b) => [`S.mapear(${jv(b,'V')}, ${jv(b,'A')}, ${jv(b,'B')}, ${jv(b,'C')}, ${jv(b,'D')})`, Js.ORDER_ATOMIC];
g['mn_limitar'] = (b) => [`S.limitar(${jv(b,'V')}, ${jv(b,'A')}, ${jv(b,'B')})`, Js.ORDER_ATOMIC];

// Internet e página web
g['mn_wifi'] = (b) => `await S.rede.conectar(${jcampo(b,'REDE')});\n`;
g['mn_wifi_ok'] = () => ['S.rede.conectado()', Js.ORDER_ATOMIC];
g['mn_blynk'] = (b) => `S.rede.blynk(${jcampo(b,'TOKEN')});\n`;
g['mn_blynk_enviar'] = (b) => `S.rede.blynkEnviar(${jcampo(b,'PINO')}, ${jv(b,'V')});\n`;
g['mn_wifi_criar'] = (b) => `await S.rede.criar(${jcampo(b,'NOME')});\n`;
g['mn_pagina_iniciar'] = (b) => `S.pagina.iniciar(${jcampo(b,'TITULO')});\n`;
g['mn_pagina_mostrar'] = (b) => `S.pagina.mostrar(${jcampo(b,'NOME')}, ${jv(b,'V')});\n`;
g['mn_endereco'] = () => ['S.pagina.endereco()', Js.ORDER_ATOMIC];

// Monitor serial
g['mn_escrever'] = (b) => `S.print(${jv(b,'V',Js.ORDER_NONE,'""')});\n`;
g['mn_escrever_dois'] = (b) => `S.print(${jv(b,'A',Js.ORDER_NONE,'""')}, ${jv(b,'B',Js.ORDER_NONE,'""')});\n`;

/* Monta o programa do simulador a partir da área de blocos. */
function gerarSimulacao(ws) {
  Js.init(ws);
  let setup = '', loop = '';
  for (const topo of ws.getTopBlocks(true)) {
    if (!topo.isEnabled()) continue;
    if (topo.type === 'mn_ao_ligar') { const p = topo.getInputTargetBlock('CORPO'); if (p) setup += Js.blockToCode(p); }
    else if (topo.type === 'mn_sempre') loop += Js.statementToCode(topo, 'CORPO');
  }
  const vars = ws.getVariableMap().getAllVariables().map((va) => `V[${JSON.stringify(va.getId())}] = 0;`).join('\n');
  return `${vars}\n// quando a placa ligar\n${setup}\n// repetir para sempre\nwhile (true) {\n${loop}${Js.INDENT}${TICK}}\n`;
}
