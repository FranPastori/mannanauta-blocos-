# mannanauta.py — biblioteca MicroPython para a placa mannaNAUTA (ESP32-S3)
# Versão em MicroPython das bibliotecas livres de wuigor (licença MIT):
#   mannaNAUTA_WS2812_Lib  -> classe Matriz (matriz 5x5 de LEDs WS2812, pino 47)
#   mannaNAUTA_LSM6DS_Lib  -> classe Sensor (acelerômetro/giroscópio LSM6DS, SDA 5 / SCL 4)
# Também traz: leitura analógica, Wi-Fi, envio de dados para o Blynk e uma página web própria da placa.
# Os desenhos de letras, números, símbolos e carinhas são os mesmos da biblioteca original.

VERSAO = "5"

import math
import time
from machine import Pin, I2C
import neopixel

# Desenhos 5x5 (bit i = LED i), extraídos da mannaNAUTA_WS2812_Lib
LETRAS={'A': 18415167, 'B': 16031023, 'C': 14713902, 'D': 16303663, 'E': 31505470, 'F': 1096767, 'G': 33092671, 'H': 18415153, 'I': 32641183, 'J': 7508127, 'K': 9604265, 'L': 31524930, 'M': 18405243, 'N': 18667121, 'O': 33080895, 'P': 1113663, 'Q': 33343039, 'R': 18153023, 'S': 33061951, 'T': 4329631, 'U': 33080881, 'V': 4532785, 'W': 18732593, 'X': 18157905, 'Y': 4329809, 'Z': 32575775}
NUMEROS=[15324974, 4329668, 32584238, 14956814, 8665418, 14956622, 15022158, 2167054, 15022414, 8665422]
SIMBOLOS={'?': 4334156, '#': 11512810, '@': 15390280, '!': 4198532, '$': 4657604, '%': 1380688, '(': 3179555, ')': 25707032, '[': 3179555, ']': 25707032}
EMOCOES={'=]': 33063242, '=[': 18841930, '=O': 15251466, '=o': 15251466, '=s': 1523722, '=S': 17237002}


def _limitar(v, a, b):
    v = int(v)
    return a if v < a else (b if v > b else v)


def mapear(valor, de_min, de_max, para_min, para_max):
    # Igual ao map() do Arduino: converte um valor de uma faixa para outra (resultado inteiro)
    if de_max == de_min:
        return int(para_min)
    return int((valor - de_min) * (para_max - para_min) / (de_max - de_min) + para_min)


def limitar(valor, minimo, maximo):
    # Igual ao constrain() do Arduino
    return minimo if valor < minimo else (maximo if valor > maximo else valor)


def contar(de, ate, passo=1):
    # Usado pelo bloco "contar com": inclui o último valor, como no Scratch/Blockly
    v = de
    if passo == 0:
        passo = 1
    if passo > 0:
        while v <= ate:
            yield v
            v += passo
    else:
        while v >= ate:
            yield v
            v += passo


def cor_rgb(r, g, b):
    return (_limitar(r, 0, 255) << 16) | (_limitar(g, 0, 255) << 8) | _limitar(b, 0, 255)


def cor_arco(pos):
    # Igual a Wheel() da biblioteca original
    p = int(pos) & 0xFF
    p = p % 0xFF
    if p < 85:
        return ((255 - p * 3) << 16) | ((p * 3) << 8)
    if p < 170:
        p -= 85
        return ((255 - p * 3) << 8) | (p * 3)
    p -= 170
    return ((p * 3) << 16) | (255 - p * 3)


def cor_hsv(h, s, v):
    # Igual a hsv2rgb() da biblioteca original: h 0-360, s e v 0-100
    h = _limitar(h, 0, 360) % 360
    s = _limitar(s, 0, 100)
    v = _limitar(v, 0, 100)
    vmax = int(v * 2.55)
    vmin = int(vmax * (100 - s) / 100)
    i = h // 60
    dif = h % 60
    ajuste = (vmax - vmin) * dif // 60
    if i == 0:
        r, g, b = vmax, vmin + ajuste, vmin
    elif i == 1:
        r, g, b = vmax - ajuste, vmax, vmin
    elif i == 2:
        r, g, b = vmin, vmax, vmin + ajuste
    elif i == 3:
        r, g, b = vmin, vmax - ajuste, vmax
    elif i == 4:
        r, g, b = vmin + ajuste, vmin, vmax
    else:
        r, g, b = vmax, vmin, vmax - ajuste
    return (r << 16) | (g << 8) | b


class Matriz:
    TOTAL = 25

    def __init__(self, pino=47, total=25):
        self.TOTAL = total
        self._np = neopixel.NeoPixel(Pin(pino, Pin.OUT), total)
        self._brilho = 20  # 0 a 255, como em setBrightness(20) dos exemplos
        self.limpar()

    # --- básico ---
    def brilho(self, porcentagem):
        self._brilho = _limitar(porcentagem, 0, 100) * 255 // 100

    def _cor(self, cor):
        cor = int(cor)
        b = self._brilho
        return (((cor >> 16) & 0xFF) * b // 255, ((cor >> 8) & 0xFF) * b // 255, (cor & 0xFF) * b // 255)

    def preparar(self, indice, cor):
        indice = int(indice)
        if 0 <= indice < self.TOTAL:
            self._np[indice] = self._cor(cor)

    def preparar_todos(self, cor):
        c = self._cor(cor)
        for i in range(self.TOTAL):
            self._np[i] = c

    def mostrar(self):
        self._np.write()

    def limpar(self):
        self.preparar_todos(0)
        self.mostrar()

    def led(self, indice, cor):
        self.preparar(indice, cor)
        self.mostrar()

    def led_xy(self, coluna, linha, cor):
        coluna, linha = int(coluna), int(linha)
        if 1 <= coluna <= 5 and 1 <= linha <= 5:
            self.led((linha - 1) * 5 + (coluna - 1), cor)

    def preparar_xy(self, coluna, linha, cor):
        coluna, linha = int(coluna), int(linha)
        if 1 <= coluna <= 5 and 1 <= linha <= 5:
            self.preparar((linha - 1) * 5 + (coluna - 1), cor)

    def todos(self, cor):
        self.preparar_todos(cor)
        self.mostrar()

    # --- desenhos ---
    def _mascara(self, mascara, cor):
        c = self._cor(cor)
        for i in range(self.TOTAL):
            self._np[i] = c if (mascara >> i) & 1 else (0, 0, 0)
        self.mostrar()

    def desenho(self, pontos, cor):
        m = 0
        for i, ch in enumerate(pontos[:25]):
            if ch == "1":
                m |= 1 << i
        self._mascara(m, cor)

    def letra(self, letra, cor):
        self._mascara(LETRAS.get(str(letra)[:1].upper(), 0), cor)

    def numero(self, n, cor):
        self._mascara(NUMEROS[_limitar(n, 0, 9)], cor)

    def simbolo(self, s, cor):
        self._mascara(SIMBOLOS.get(s, 0), cor)

    def emocao(self, e, cor):
        self._mascara(EMOCOES.get(e, 0), cor)

    def texto(self, texto, cor, segundos=0.5):
        for ch in str(texto):
            c = ch.upper()
            if c in LETRAS:
                self.letra(c, cor)
            elif "0" <= c <= "9":
                self.numero(ord(c) - 48, cor)
            elif c in SIMBOLOS:
                self.simbolo(c, cor)
            else:
                self.limpar()
            time.sleep(segundos)
        self.limpar()


# ---------------------------------------------------------------- Sensor
_CTRL1_XL = 0x10
_CTRL2_G = 0x11
_CTRL3_C = 0x12
_CTRL10_C = 0x19
_WAKEUP_SRC = 0x1B
_WHOAMI = 0x0F
_OUT_TEMP_L = 0x20
_OUTX_L_G = 0x22
_OUTX_L_A = 0x28
_STEP_COUNTER_L = 0x4B
_TAP_CFG = 0x58
_WAKEUP_THS = 0x5B
_WAKEUP_DUR = 0x5C
_MD1_CFG = 0x5E

_NOMES = {0x69: "LSM6DS3 or LSM6DS33", 0x6A: "LSM6DSL or LSM6DS3TR-C", 0x6B: "ISM330DHCX", 0x6C: "LSM6DSOX or LSM6DSO32"}
_FAIXA_ACEL = {2: 0x00, 16: 0x01, 4: 0x02, 8: 0x03}
_FAIXA_GIRO = {125: 0x02, 250: 0x00, 500: 0x04, 1000: 0x08, 2000: 0x0C}


def _s16(lo, hi):
    v = lo | (hi << 8)
    return v - 65536 if v & 0x8000 else v


class Sensor:
    def __init__(self, sda=5, scl=4, enderecos=(0x6A, 0x6B)):
        self._i2c = I2C(0, sda=Pin(sda), scl=Pin(scl), freq=400000)
        self._end = None
        self._id = 0
        self.conectado = False
        self._g = 4
        self._dps = 2000
        self._sens_temp = 256.0
        for e in enderecos:
            try:
                ident = self._ler(e, _WHOAMI, 1)[0]
            except OSError:
                continue
            if ident in _NOMES:
                self._end, self._id = e, ident
                break
        if self._end is None:
            return
        self._sens_temp = 16.0 if self._id == 0x69 else 256.0
        self._mascara(_CTRL3_C, 0x01, 0x01)  # reset
        time.sleep_ms(10)
        self._escrever(_CTRL3_C, 0x44)
        self._mascara(_CTRL1_XL, 0xF0, 0x04 << 4)  # 104 Hz
        self.faixa_acelerometro(4)
        self._mascara(_CTRL2_G, 0xF0, 0x04 << 4)  # 104 Hz
        self.faixa_giroscopio(2000)
        self.conectado = True

    # --- I2C ---
    def _ler(self, end, reg, n):
        return self._i2c.readfrom_mem(end, reg, n)

    def _reg(self, reg, n=1):
        if self._end is None:
            return bytes(n)
        try:
            return self._ler(self._end, reg, n)
        except OSError:
            return bytes(n)

    def _escrever(self, reg, valor):
        if self._end is not None:
            try:
                self._i2c.writeto_mem(self._end, reg, bytes([valor & 0xFF]))
            except OSError:
                pass

    def _mascara(self, reg, mascara, valor):
        atual = self._reg(reg)[0]
        self._escrever(reg, (atual & ~mascara) | (valor & mascara))

    # --- configuração ---
    def faixa_acelerometro(self, g):
        g = int(g)
        if g in _FAIXA_ACEL:
            self._g = g
            self._mascara(_CTRL1_XL, 0x0C, _FAIXA_ACEL[g] << 2)

    def faixa_giroscopio(self, dps):
        dps = int(dps)
        if dps in _FAIXA_GIRO:
            self._dps = dps
            self._mascara(_CTRL2_G, 0x0F, _FAIXA_GIRO[dps])

    def nome(self):
        return _NOMES.get(self._id, "not detected")

    # --- leituras (com a mesma correção de orientação da placa) ---
    def _tres(self, reg, escala):
        d = self._reg(reg, 6)
        sx, sy, sz = _s16(d[0], d[1]) * escala, _s16(d[2], d[3]) * escala, _s16(d[4], d[5]) * escala
        return -sy, -sx, sz

    def aceleracao(self):
        return self._tres(_OUTX_L_A, self._g / 32768)

    def giro(self):
        return self._tres(_OUTX_L_G, self._dps / 32768)

    def aceleracao_eixo(self, eixo):
        return self.aceleracao()["xyz".index(eixo)]

    def giro_eixo(self, eixo):
        return self.giro()["xyz".index(eixo)]

    def temperatura(self):
        d = self._reg(_OUT_TEMP_L, 2)
        return 25.0 + _s16(d[0], d[1]) / self._sens_temp

    def angulo(self, lados):
        ax, ay, az = self.aceleracao()
        if lados:
            return math.atan2(ay, az) * 180 / math.pi
        return math.atan2(-ax, math.sqrt(ay * ay + az * az)) * 180 / math.pi

    def inclinacao(self, limite=12.0):
        # 0 nivelada, 1 frente, 2 trás, 3 direita, 4 esquerda
        rol, arf = self.angulo(True), self.angulo(False)
        if abs(rol) < limite and abs(arf) < limite:
            return 0
        if abs(arf) >= abs(rol):
            return 1 if arf < 0 else 2
        return 3 if rol > 0 else 4

    # --- sacudida ---
    def sensibilidade(self, limiar=20):
        self._escrever(_WAKEUP_THS, int(limiar) & 0x3F)
        self._escrever(_WAKEUP_DUR, 0)
        self._mascara(_TAP_CFG, 0x80, 0x80)
        self._mascara(_MD1_CFG, 0x20, 0x20)

    def sacudida(self):
        return (self._reg(_WAKEUP_SRC)[0] & 0x08) != 0

    # --- passos ---
    def ligar_passos(self):
        self.zerar_passos()
        self._mascara(_CTRL10_C, 0x3C, 0x3C)
        self._mascara(_TAP_CFG, 0x40, 0x40)

    def zerar_passos(self):
        self._mascara(_CTRL10_C, 0x02, 0x02)
        time.sleep_ms(1)
        self._mascara(_CTRL10_C, 0x02, 0x00)

    def passos(self):
        d = self._reg(_STEP_COUNTER_L, 2)
        return d[0] | (d[1] << 8)


# ------------------------------------------------- Leitura analógica
# Valor de 0 a 4095 (como o analogRead do Arduino). Pinos que funcionam junto com o Wi-Fi: 1, 2, 3, 6, 7, 8, 9, 10.
_adcs = {}


def leitura_analogica(pino):
    from machine import ADC
    pino = int(pino)
    adc = _adcs.get(pino)
    if adc is None:
        adc = ADC(Pin(pino))
        try:
            adc.atten(ADC.ATTN_11DB)  # faixa de 0 a 3,3 V
        except Exception:
            pass
        _adcs[pino] = adc
    total = 0
    for _ in range(8):
        total += adc.read_u16() >> 4
    return total // 8


# ------------------------------------------------- Pinos digitais, PWM, som, servo, ultrassônico
_pinos = {}
_pwms = {}


def pino_modo(pino, modo):
    # modo: "saida", "entrada" ou "pullup"
    pino = int(pino)
    if modo == "saida":
        _pinos[pino] = Pin(pino, Pin.OUT)
    elif modo == "pullup":
        _pinos[pino] = Pin(pino, Pin.IN, Pin.PULL_UP)
    else:
        _pinos[pino] = Pin(pino, Pin.IN)


def _parar_pwm(pino):
    p = _pwms.pop(pino, None)
    if p is not None:
        try:
            p.deinit()
        except Exception:
            pass


def escrever_digital(pino, valor):
    pino = int(pino)
    _parar_pwm(pino)
    p = _pinos.get(pino)
    if p is None:
        p = _pinos[pino] = Pin(pino, Pin.OUT)
    p.value(1 if valor else 0)


def ler_digital(pino):
    pino = int(pino)
    p = _pinos.get(pino)
    if p is None:
        p = _pinos[pino] = Pin(pino, Pin.IN)
    return p.value() == 1


def botao(pino):
    # botão ligado entre o pino e o GND (usa o resistor interno de pull-up)
    pino = int(pino)
    p = _pinos.get(pino)
    if p is None:
        p = _pinos[pino] = Pin(pino, Pin.IN, Pin.PULL_UP)
    return p.value() == 0


def _pwm(pino, freq):
    from machine import PWM
    pino = int(pino)
    p = _pwms.get(pino)
    if p is None:
        p = _pwms[pino] = PWM(Pin(pino), freq=int(freq), duty_u16=0)
    else:
        p.freq(int(freq))
    return p


def escrever_pwm(pino, valor):
    # valor de 0 a 255, como o analogWrite do Arduino
    _pwm(pino, 1000).duty_u16(_limitar(valor, 0, 255) * 257)


def tom(pino, frequencia):
    f = int(frequencia)
    if f <= 0:
        sem_tom(pino)
        return
    _pwm(pino, f).duty_u16(32768)


def sem_tom(pino):
    p = _pwms.get(int(pino))
    if p is not None:
        p.duty_u16(0)


def tocar(pino, frequencia, segundos):
    tom(pino, frequencia)
    time.sleep(segundos)
    sem_tom(pino)


def servo(pino, angulo):
    # servo comum: pulso de 0,5 ms (0°) a 2,5 ms (180°), 50 Hz
    a = _limitar(angulo, 0, 180)
    pulso_us = 500 + a * 2000 // 180
    _pwm(pino, 50).duty_u16(pulso_us * 65535 // 20000)


def distancia(trig, echo):
    # sensor ultrassônico HC-SR04: distância em centímetros (0 se não houver eco)
    from machine import time_pulse_us
    t = Pin(int(trig), Pin.OUT)
    e = Pin(int(echo), Pin.IN)
    t.value(0)
    time.sleep_us(2)
    t.value(1)
    time.sleep_us(10)
    t.value(0)
    dur = time_pulse_us(e, 1, 30000)
    if dur < 0:
        return 0
    return round(dur / 58.0, 1)


# ------------------------------------------------- Wi-Fi
_wlan = None


def wifi_conectar(rede, senha, segundos=20):
    global _wlan
    import network
    _wlan = network.WLAN(network.STA_IF)
    _wlan.active(True)
    if not _wlan.isconnected():
        print("Conectando ao Wi-Fi", rede, "...")
        _wlan.connect(rede, senha)
        limite = time.ticks_add(time.ticks_ms(), int(segundos * 1000))
        while not _wlan.isconnected() and time.ticks_diff(limite, time.ticks_ms()) > 0:
            time.sleep_ms(250)
    if _wlan.isconnected():
        print("Wi-Fi conectado:", _wlan.ifconfig()[0])
        return True
    print("Não consegui conectar ao Wi-Fi. Confira o nome da rede e a senha.")
    return False


def wifi_conectado():
    return _wlan is not None and _wlan.isconnected()


# ------------------------------------------------- Blynk (Blynk.Cloud, HTTPS API)
_blynk_token = None
_blynk_servidor = "blynk.cloud"


def blynk_conectar(token, servidor="blynk.cloud"):
    global _blynk_token, _blynk_servidor
    _blynk_token = str(token).strip()
    _blynk_servidor = (str(servidor).strip() or "blynk.cloud").replace("https://", "").replace("http://", "").strip("/")


def _url(texto):
    seguro = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.~"
    saida = ""
    for b in str(texto).encode():
        c = chr(b)
        saida += c if c in seguro else "%%%02X" % b
    return saida


def blynk_enviar(pino, valor):
    if not _blynk_token:
        print("Use o bloco 'conectar ao Blynk' antes de enviar.")
        return False
    if not wifi_conectado():
        print("Sem Wi-Fi: use o bloco 'conectar ao Wi-Fi' antes de enviar.")
        return False
    try:
        import requests
    except ImportError:
        import urequests as requests
    if isinstance(valor, float):
        valor = round(valor, 2)
    url = "https://%s/external/api/update?token=%s&%s=%s" % (_blynk_servidor, _url(_blynk_token), pino, _url(valor))
    try:
        r = requests.get(url)
        ok = r.status_code == 200
        if not ok:
            print("Blynk respondeu", r.status_code, r.text)
        r.close()
        return ok
    except Exception as e:
        print("Erro ao enviar para o Blynk:", e)
        return False


# ------------------------------------------------- Rede Wi-Fi da placa
_ap = None


def wifi_criar(nome, senha=""):
    """A placa cria a própria rede Wi-Fi (sem internet). Senha: 8 caracteres ou mais, ou vazia (rede aberta)."""
    global _ap
    import network
    _ap = network.WLAN(network.AP_IF)
    _ap.active(True)
    nome, senha = str(nome), str(senha)
    if len(senha) >= 8:
        try:
            _ap.config(essid=nome, password=senha, security=3)
        except Exception:
            _ap.config(essid=nome, password=senha, authmode=3)
    else:
        if senha:
            print("A senha da rede precisa ter 8 caracteres ou mais. A rede foi criada sem senha.")
        try:
            _ap.config(essid=nome, security=0)
        except Exception:
            _ap.config(essid=nome, authmode=0)
    time.sleep_ms(300)
    print("Rede Wi-Fi da placa criada:", nome)
    return True


def endereco_pagina():
    if _ap is not None and _ap.active():
        return "http://" + _ap.ifconfig()[0]
    if wifi_conectado():
        return "http://" + _wlan.ifconfig()[0]
    return "(sem rede)"


# ------------------------------------------------- Página web da placa
_titulo = "mannaNAUTA"
_nomes = []
_valores = {}
_servidor_ligado = False

_HTML = """<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>mannaNAUTA</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#F5F9FD;color:#111418}
header{background:#fff;padding:16px 18px 10px;border-bottom:1px solid #DCE7F2}
h1{margin:0;font-size:22px;font-weight:900}
.marca{font-weight:900;font-size:13px;color:#076CA9;letter-spacing:.3px}
.pontos{height:10px;margin:8px 0 0;background:radial-gradient(circle at 5px 5px,#1589C6 4px,transparent 4.6px) 0 0/16px 10px repeat-x}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;padding:16px}
.card{background:#fff;border-radius:16px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,.08);border-top:6px solid #1CD3F7}
.card:nth-child(4n+2){border-color:#FFA300}.card:nth-child(4n+3){border-color:#EF466E}.card:nth-child(4n+4){border-color:#44AF69}
.nome{font-size:14px;font-weight:700;color:#5b6672}
.valor{font-size:34px;font-weight:900;margin-top:6px;word-break:break-word}
footer{padding:0 16px 16px;font-size:12px;color:#5b6672}
</style></head><body>
<header><div class="marca">manna team · mannaNAUTA</div><h1 id="t">...</h1><div class="pontos"></div></header>
<main id="m"></main><footer id="f">Atualizando...</footer>
<script>
async function at(){try{const r=await fetch('/dados',{cache:'no-store'});const d=await r.json();
document.getElementById('t').textContent=d.titulo;document.title=d.titulo;
const m=document.getElementById('m');m.innerHTML='';
for(const [n,v] of d.itens){const c=document.createElement('div');c.className='card';
const a=document.createElement('div');a.className='nome';a.textContent=n;
const b=document.createElement('div');b.className='valor';b.textContent=v;c.append(a,b);m.append(c);}
document.getElementById('f').textContent='Atualizado às '+new Date().toLocaleTimeString();}
catch(e){document.getElementById('f').textContent='Sem conexão com a placa...';}}
at();setInterval(at,2000);
</script></body></html>"""


def _texto(v):
    if isinstance(v, bool):
        return "sim" if v else "não"
    if isinstance(v, float):
        v = round(v, 2)
        if v == int(v):
            v = int(v)
    return str(v)


def pagina_mostrar(nome, valor):
    nome = str(nome)
    if nome not in _valores:
        _nomes.append(nome)
    _valores[nome] = _texto(valor)


def _dados():
    import json
    return json.dumps({"titulo": _titulo, "itens": [[n, _valores.get(n, "")] for n in _nomes]})


def _servidor():
    import socket
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("0.0.0.0", 80))
    srv.listen(3)
    while True:
        cli = None
        try:
            cli, _ = srv.accept()
            cli.settimeout(3)
            pedido = cli.recv(1024)
            linha = pedido.split(b"\r\n", 1)[0].decode()
            caminho = linha.split(" ")[1] if " " in linha else "/"
            if caminho.startswith("/dados"):
                corpo, tipo = _dados(), "application/json"
            elif caminho == "/" or caminho.startswith("/?"):
                corpo, tipo = _HTML, "text/html; charset=utf-8"
            else:
                cli.send(b"HTTP/1.0 404 Not Found\r\nContent-Length: 0\r\n\r\n")
                continue
            dados = corpo.encode()
            cli.send(("HTTP/1.0 200 OK\r\nContent-Type: %s\r\nContent-Length: %d\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n" % (tipo, len(dados))).encode())
            for i in range(0, len(dados), 1024):
                cli.send(dados[i:i + 1024])
        except Exception:
            pass
        finally:
            if cli:
                try:
                    cli.close()
                except Exception:
                    pass


def pagina_iniciar(titulo="mannaNAUTA"):
    """Liga a página web da placa. Ela funciona em segundo plano, junto com o programa."""
    global _titulo, _servidor_ligado
    _titulo = str(titulo)
    if _servidor_ligado:
        return
    import _thread
    _thread.start_new_thread(_servidor, ())
    _servidor_ligado = True
    print("Página web ligada! Abra no celular:", endereco_pagina())
