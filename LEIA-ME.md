# mannaNAUTA Blocos

Plataforma de programação em blocos para a placa **mannaNAUTA** (ESP32-S3), feita para o projeto Manna.
Roda direto no navegador (Chrome ou Edge de computador) e **não precisa de servidor**: os programas
vão para a placa pelo cabo USB.

> Para quem desenvolve: por baixo, os blocos geram MicroPython. Na interface para alunos e professores,
> esse nome não aparece: falamos em "preparar a placa".

Endereço: https://franpastori.github.io/mannanauta-blocos-/

## Como usar

1. Ligue a placa no USB e clique em **Conectar placa** (só na primeira vez em cada computador; depois o app
   conecta sozinho sempre que a placa for ligada no cabo).
2. Se a placa ainda não estiver preparada, o app avisa e oferece prepará-la: basta clicar em **Preparar agora**
   (o botão **Preparar placa** faz o mesmo a qualquer momento).
   Se não funcionar, segure **BOOT**, aperte e solte **RESET**, solte **BOOT** e tente de novo.
3. Monte o programa com os blocos (o código Python aparece ao lado).
4. Clique em **Enviar para a placa**. O programa é gravado como `main.py` e começa a rodar.
   Na primeira vez, a biblioteca `mannanauta.py` também é instalada.
5. O que o programa escrever aparece na aba **Monitor serial**. O botão **Parar** interrompe o programa.

## Pastas

| Arquivo | O que é |
|---|---|
| `index.html` | Estrutura da página do editor |
| `css/estilo.css` | Visual (identidade manna team) |
| `img/logo-manna-team.png` | Logo |
| `js/blocos.js` | Definição dos blocos e cores das categorias |
| `js/gerador.js` | Transforma os blocos em código para a placa |
| `js/caixa.js` | Categorias da caixa de blocos e projeto inicial |
| `js/interface.js` | Área de blocos, abas, salvar/abrir, avisos |
| `js/placa.js` | Conexão com a placa pelo cabo, envio do programa e monitor |
| `js/preparar.js` | Preparação da placa (gravação do firmware) |
| `micropython/mannanauta.py` | Biblioteca da placa em MicroPython (matriz de LEDs e sensor de movimento) |
| `firmware/` | Firmware oficial do MicroPython para ESP32-S3, baixado de micropython.org |
| `.github/workflows/firmware.yml` | Ação que baixa/atualiza o firmware (Actions → Atualizar firmware MicroPython → Run workflow) |

## Biblioteca mannanauta.py

É a versão em MicroPython das bibliotecas livres de [wuigor](https://github.com/wuigor) (licença MIT):

- [mannaNAUTA_WS2812_Lib](https://github.com/wuigor/mannaNAUTA_WS2812_Lib) → classe `Matriz` (pino 47, 25 LEDs).
  Os desenhos de letras, números, símbolos e carinhas foram copiados da biblioteca original.
- [mannaNAUTA_LSM6DS_Lib](https://github.com/wuigor/mannaNAUTA_LSM6DS_Lib) → classe `Sensor` (SDA 5, SCL 4, endereço 0x6A ou 0x6B),
  com a mesma configuração inicial e a mesma correção de orientação da placa.

Também pode ser usada sem os blocos, em qualquer editor de MicroPython (Thonny, por exemplo):

```python
from mannanauta import *
matriz = Matriz()
sensor = Sensor()
matriz.emocao("=]", 0x00FF00)
print(sensor.aceleracao())
```

Ao mudar a biblioteca, aumente o número em `VERSAO = "..."` para o editor reinstalá-la nas placas.

## Ainda falta conferir na placa

- Se o sentido de frente/trás/direita/esquerda bate com a placa.
- Os desenhos das carinhas `=s` e `=S`.
- Os blocos "placa sacudida" e "número de passos".
- A instalação do MicroPython pelo navegador na placa real.

Licença MIT, como as bibliotecas originais.
