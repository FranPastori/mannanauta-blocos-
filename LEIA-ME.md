# mannaNAUTA Blocos

Plataforma de programação em blocos para a placa **mannaNAUTA** (ESP32-S3), feita para o projeto Manna.
Roda direto no navegador (Chrome ou Edge de computador) e **não precisa de servidor**: os blocos geram
**MicroPython**, que é enviado para a placa pelo cabo USB.

Endereço: https://franpastori.github.io/mannanauta-blocos-/

## Como usar

1. Ligue a placa no USB.
2. **Só na primeira vez:** clique em **Instalar MicroPython** e escolha a porta da placa.
   Se não funcionar, segure **BOOT**, aperte e solte **RESET**, solte **BOOT** e tente de novo.
3. Monte o programa com os blocos (o código Python aparece ao lado).
4. Clique em **Enviar para a placa**. O programa é gravado como `main.py` e começa a rodar.
   Na primeira vez, a biblioteca `mannanauta.py` também é instalada.
5. O que o programa escrever aparece na aba **Monitor serial**. O botão **Parar** interrompe o programa.

## Pastas

| Arquivo | O que é |
|---|---|
| `index.html` | O editor de blocos (página única) |
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
