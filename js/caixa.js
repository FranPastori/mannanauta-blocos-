/* ---------------------------- Caixa de blocos ------------------------ */
const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    { kind:'category', name:'Eventos', colour:COR.evento, contents:[ {kind:'block',type:'mn_ao_ligar'}, {kind:'block',type:'mn_sempre'} ] },
    { kind:'category', name:'Controle', colour:COR.controle, contents:[
      {kind:'block',type:'mn_esperar',inputs:{S:sombraNum(1)}},
      {kind:'block',type:'mn_esperar_ms',inputs:{MS:sombraNum(100)}},
      {kind:'block',type:'controls_repeat_ext',inputs:{TIMES:sombraNum(10)}},
      {kind:'block',type:'controls_if'},
      {kind:'block',type:'controls_if',extraState:{hasElse:true}},
      {kind:'block',type:'controls_whileUntil'},
      {kind:'block',type:'controls_for',inputs:{FROM:sombraNum(1),TO:sombraNum(10),BY:sombraNum(1)}},
      {kind:'block',type:'controls_flow_statements'},
      {kind:'block',type:'mn_tempo'}
    ]},
    { kind:'category', name:'Matriz de LEDs', colour:COR.matriz, contents:[
      {kind:'block',type:'mn_emocao',inputs:{COR:sombraCor}},
      {kind:'block',type:'mn_letra',inputs:{COR:sombraCor}},
      {kind:'block',type:'mn_numero',inputs:{N:sombraNum(5),COR:sombraCor}},
      {kind:'block',type:'mn_texto',inputs:{COR:sombraCor,S:sombraNum(0.6)}},
      {kind:'block',type:'mn_simbolo',inputs:{COR:sombraCor}},
      {kind:'block',type:'mn_desenho',inputs:{COR:sombraCor}},
      {kind:'block',type:'mn_led_xy',inputs:{X:sombraNum(3),Y:sombraNum(3),COR:sombraCor}},
      {kind:'block',type:'mn_led_n',inputs:{N:sombraNum(1),COR:sombraCor}},
      {kind:'block',type:'mn_todos',inputs:{COR:sombraCor}},
      {kind:'block',type:'mn_preparar_xy',inputs:{X:sombraNum(1),Y:sombraNum(1),COR:sombraCor}},
      {kind:'block',type:'mn_preparar_n',inputs:{N:sombraNum(1),COR:sombraCor}},
      {kind:'block',type:'mn_mostrar'},
      {kind:'block',type:'mn_preparar_limpar'},
      {kind:'block',type:'mn_limpar'},
      {kind:'block',type:'mn_brilho',inputs:{B:sombraNum(20)}}
    ]},
    { kind:'category', name:'Cores', colour:COR.cor, contents:[
      {kind:'block',type:'mn_cor'},
      {kind:'block',type:'mn_cor_rgb',inputs:{R:sombraNum(255),G:sombraNum(100),B:sombraNum(0)}},
      {kind:'block',type:'mn_cor_hsv',inputs:{H:sombraNum(200),S:sombraNum(100),V:sombraNum(100)}},
      {kind:'block',type:'mn_cor_arco',inputs:{P:sombraNum(0)}}
    ]},
    { kind:'category', name:'Sensor de movimento', colour:COR.sensor, contents:[
      {kind:'block',type:'mn_inclinada'},
      {kind:'block',type:'mn_angulo'},
      {kind:'block',type:'mn_sacudida'},
      {kind:'block',type:'mn_aceleracao'},
      {kind:'block',type:'mn_giro'},
      {kind:'block',type:'mn_temperatura'},
      {kind:'block',type:'mn_passos'},
      {kind:'block',type:'mn_zerar_passos'},
      {kind:'block',type:'mn_sensibilidade'},
      {kind:'block',type:'mn_faixa_acel'},
      {kind:'block',type:'mn_faixa_giro'},
      {kind:'block',type:'mn_conectado'},
      {kind:'block',type:'mn_nome_sensor'}
    ]},
    { kind:'category', name:'Pinos', colour:COR.pinos, contents:[
      {kind:'block',type:'mn_analogico'}
    ]},
    { kind:'category', name:'Internet (IoT)', colour:COR.internet, contents:[
      {kind:'block',type:'mn_wifi'},
      {kind:'block',type:'mn_blynk'},
      {kind:'block',type:'mn_blynk_enviar',inputs:{V:{block:{type:'mn_analogico'}}}},
      {kind:'block',type:'mn_wifi_ok'}
    ]},
    { kind:'category', name:'Página web', colour:COR.pagina, contents:[
      {kind:'block',type:'mn_wifi_criar'},
      {kind:'block',type:'mn_pagina_iniciar'},
      {kind:'block',type:'mn_pagina_mostrar',inputs:{V:{block:{type:'mn_analogico'}}}},
      {kind:'block',type:'mn_escrever',inputs:{V:{block:{type:'mn_endereco'}}}}
    ]},
    { kind:'category', name:'Monitor serial', colour:COR.serial, contents:[
      {kind:'block',type:'mn_escrever',inputs:{V:{shadow:{type:'text',fields:{TEXT:'Olá!'}}}}},
      {kind:'block',type:'mn_escrever_dois',inputs:{A:{shadow:{type:'text',fields:{TEXT:'valor:'}}},B:sombraNum(0)}},
      {kind:'block',type:'text'}
    ]},
    { kind:'category', name:'Operadores', colour:COR.matematica, contents:[
      {kind:'block',type:'math_number'},
      {kind:'block',type:'math_arithmetic',inputs:{A:sombraNum(1),B:sombraNum(1)}},
      {kind:'block',type:'math_random_int',inputs:{FROM:sombraNum(1),TO:sombraNum(10)}},
      {kind:'block',type:'math_modulo',inputs:{DIVIDEND:sombraNum(10),DIVISOR:sombraNum(3)}},
      {kind:'block',type:'math_round',inputs:{NUM:sombraNum(3.7)}},
      {kind:'block',type:'math_single',inputs:{NUM:sombraNum(9)}},
      {kind:'block',type:'logic_compare',inputs:{A:sombraNum(0),B:sombraNum(0)}},
      {kind:'block',type:'logic_operation'},
      {kind:'block',type:'logic_negate'},
      {kind:'block',type:'logic_boolean'}
    ]},
    { kind:'category', name:'Variáveis', colour:COR.variavel, custom:'VARIABLE' }
  ]
};

const PROJETO_INICIAL = {
  blocks: { languageVersion: 0, blocks: [
    { type:'mn_ao_ligar', x:30, y:30, inputs:{ CORPO:{ block:{ type:'mn_brilho', inputs:{B:sombraNum(20)}, next:{ block:{ type:'mn_texto', fields:{T:'OI'}, inputs:{COR:{shadow:{type:'mn_cor',fields:{COR:'0x0000FF'}}}, S:sombraNum(0.6)} } } } } } },
    { type:'mn_sempre', x:30, y:200, inputs:{ CORPO:{ block:{
      type:'controls_if', extraState:{hasElse:true},
      inputs:{
        IF0:{ block:{ type:'mn_inclinada', fields:{DIR:'0'} } },
        DO0:{ block:{ type:'mn_emocao', fields:{E:'=]'}, inputs:{COR:sombraCor} } },
        ELSE:{ block:{ type:'mn_emocao', fields:{E:'=O'}, inputs:{COR:{shadow:{type:'mn_cor',fields:{COR:'0xFF8000'}}}} } }
      },
      next:{ block:{ type:'mn_esperar', inputs:{S:sombraNum(0.2)} } }
    } } } }
  ]}
};

