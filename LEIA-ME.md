# mannaNAUTA Blocos

Plataforma de programação em blocos para a placa **mannaNAUTA** (ESP32-S3), que roda no navegador.
Os blocos geram código C++ que usa as bibliotecas livres de [wuigor](https://github.com/wuigor):

- [mannaNAUTA_WS2812_Lib](https://github.com/wuigor/mannaNAUTA_WS2812_Lib): matriz 5x5 de LEDs (pino 47)
- [mannaNAUTA_LSM6DS_Lib](https://github.com/wuigor/mannaNAUTA_LSM6DS_Lib): acelerômetro e giroscópio (SDA 5, SCL 4)

## Como funciona

1. O aluno monta os blocos e o código C++ aparece ao lado.
2. Ao clicar em **Enviar para a placa**, o navegador manda o código ao **servidor de compilação**.
3. O servidor compila para ESP32-S3 e devolve o programa pronto.
4. O navegador grava o programa na placa pelo cabo USB (Web Serial + esptool-js).

Funciona no **Google Chrome** ou no **Microsoft Edge** de computador. A placa precisa estar ligada no USB.

## Pastas

| Arquivo | O que é |
|---|---|
| `index.html` | O editor de blocos (página única) |
| `servidor/server.js` | Servidor de compilação (Node, sem dependências) |
| `servidor/Dockerfile` | Monta o servidor com arduino-cli, núcleo ESP32 e as duas bibliotecas |
| `servidor/teste.ino` | Programa de teste que usa todos os blocos (compilado durante a montagem) |

## Publicar o editor (GitHub Pages)

1. Crie um repositório no GitHub e envie `index.html` para ele.
2. Em **Settings → Pages**, escolha a branch `main` e a pasta raiz.
3. O editor fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

## Publicar o servidor (Render)

1. No Render, crie um **Web Service** apontando para a pasta `servidor` do repositório (Runtime: **Docker**).
2. A primeira montagem demora (baixa o núcleo ESP32, que é grande).
3. Abra o endereço do serviço: deve aparecer `{"ok":true,...}`.
4. No editor, clique em **⚙** e cole o endereço do servidor.
   Para deixar fixo para todos, preencha `SERVIDOR_PADRAO` no começo do script do `index.html`.

Variáveis de ambiente opcionais:

- `FQBN`: placa usada na compilação. Padrão: `esp32:esp32:esp32s3:CDCOnBoot=cdc` (Serial pela USB nativa).
- `ORIGENS`: endereços que podem usar o servidor, separados por vírgula. Padrão: `*`. Recomendado: o endereço do GitHub Pages.

Compilar para ESP32 usa bastante memória. O plano gratuito do Render (512 MB) pode não dar conta; se as compilações falharem por memória, use um plano maior ou outro serviço com Docker.

## Se a placa não for encontrada

- Use um cabo USB que transmita dados (alguns só carregam).
- Se a gravação não começar, segure o botão **BOOT**, aperte e solte **RESET**, solte o **BOOT** e tente de novo.

## Blocos disponíveis

- **Eventos:** quando a placa ligar, repetir para sempre
- **Controle:** esperar (segundos ou milissegundos), repetir, se/senão, enquanto, contar, sair do laço, tempo desde que ligou
- **Matriz de LEDs:** carinha, letra, número, texto, símbolo, desenho 5x5, LED por coluna/linha, LED por número, todos os LEDs, apagar, brilho
- **Cores:** cores prontas, cor por vermelho/verde/azul, cor do arco-íris
- **Sensor de movimento:** placa inclinada (frente, trás, direita, esquerda, nivelada), inclinação em graus, placa sacudida, aceleração, giro, temperatura, passos, zerar passos
- **Monitor serial:** escrever um valor, escrever nome e valor
- **Operadores e Variáveis**

## Ainda falta conferir na placa

- Se o sentido de **frente/trás/direita/esquerda** bate com a placa (a lógica é a mesma do exemplo AxisOrientationMatrix da biblioteca).
- Os desenhos das carinhas `=s` e `=S`.
- O bloco **placa sacudida** (usa o recurso de "wake-up" do sensor) e o **contador de passos**.
- Se a placa usa a USB nativa do ESP32-S3 (padrão do servidor) ou um chip conversor USB-serial.

Licença MIT, como as bibliotecas usadas.
