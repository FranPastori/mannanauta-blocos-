// Programa gerado pelo mannaNAUTA Blocos
// Placa: mannaNAUTA (ESP32-S3)

#include <Wire.h>
#include <MannaNAUTA_LSM6DS.h>
#include <mannaNAUTA_WS2812.h>
#include <math.h>

mannaNAUTA_WS2812 strip = mannaNAUTA_WS2812(LEDS_COUNT, LEDS_PIN, CHANNEL, TYPE_GRB);
MannaNAUTA_LSM6DS imu;

float contador = 0;
float posicao = 0;

uint32_t mnCorRGB(int r, int g, int b) {
  r = constrain(r, 0, 255); g = constrain(g, 0, 255); b = constrain(b, 0, 255);
  return ((uint32_t)r << 16) | ((uint32_t)g << 8) | (uint32_t)b;
}

void mnLed(int indice, uint32_t cor) {
  if (indice >= 0 && indice < LEDS_COUNT) strip.setLedColor(indice, cor);
}

void mnDesenho(const char *pontos, uint32_t cor) {
  strip.setAllLedsColorData((uint32_t)0);
  for (int i = 0; i < 25 && pontos[i]; i++) {
    if (pontos[i] == '1') strip.setLedColorData(i, cor);
  }
  strip.show();
}

void mnTexto(const char *texto, uint32_t cor, float segundos) {
  for (int i = 0; texto[i]; i++) {
    char c = texto[i];
    if (c >= 'a' && c <= 'z') c = c - 'a' + 'A';
    if (c >= 'A' && c <= 'Z') strip.writeWord(c, cor);
    else if (c >= '0' && c <= '9') strip.writeNumber(c - '0', cor);
    else strip.clear();
    delay((unsigned long)(segundos * 1000));
  }
  strip.clear();
}

float mnAceleracao(char eixo) {
  float x = 0, y = 0, z = 0;
  imu.readAcceleration(x, y, z);
  return eixo == 'x' ? x : (eixo == 'y' ? y : z);
}

float mnGiro(char eixo) {
  float x = 0, y = 0, z = 0;
  imu.readGyroscope(x, y, z);
  return eixo == 'x' ? x : (eixo == 'y' ? y : z);
}

// lados = true: inclinação para os lados; false: para frente e para trás
float mnAngulo(bool lados) {
  float ax = 0, ay = 0, az = 0;
  imu.readAcceleration(ax, ay, az);
  if (lados) return atan2(ay, az) * 180.0 / PI;
  return atan2(-ax, sqrt(ay * ay + az * az)) * 180.0 / PI;
}

// 0 nivelada, 1 frente, 2 trás, 3 direita, 4 esquerda
int mnInclinacao() {
  const float LIMITE = 12.0;
  float rol = mnAngulo(true), arf = mnAngulo(false);
  if (fabs(rol) < LIMITE && fabs(arf) < LIMITE) return 0;
  if (fabs(arf) >= fabs(rol)) return arf < 0 ? 1 : 2;
  return rol > 0 ? 3 : 4;
}

bool mnSacudida() {
  return imu.shake();
}

void setup() {
  Serial.begin(115200);
  strip.begin();
  strip.setBrightness(20);
  if (!imu.begin()) {
    imu.begin(SDA_PIN, SCL_PIN, 0x6B, &Wire);
  }
  imu.resetPedometer();
  imu.enablePedometer(true);
  imu.enableWakeup(true, 0, 20);
  strip.setBrightness(map(constrain((int)(30), 0, 100), 0, 100, 0, 255));
  Serial.println("Olá \"manna\"");
  imu.resetPedometer();
}

void loop() {
  contador = 0;
  for (int i = 0; i < (int)(3); i++) {
    contador += 1;
    strip.setAllLedsColor(strip.Wheel((byte)((int)(contador * 10) & 0xFF)));
  }
  for (posicao = 1; (1) > 0 ? posicao <= 5 : posicao >= 5; posicao += 1) {
    mnLed(((int)(2) - 1) * 5 + ((int)(posicao) - 1), 0xFF0000);
    mnLed((int)(25) - 1, 0xFF0000);
  }
  strip.writeWord('B', 0xFF0000);
  strip.writeNumber(constrain((int)(random(0, (9) + 1)), 0, 9), 0xFF0000);
  mnTexto("Manna 2026!", 0xFF0000, 0.3);
  strip.writeSymbol('%', 0xFF0000);
  strip.writeEmotion('=S', 0xFF0000);
  mnDesenho("1000001000001000001000001", mnCorRGB(255, 10, 300));
  if ((mnInclinacao() == 3) && !(mnSacudida())) {
    Serial.print("ax");
    Serial.print(" ");
    Serial.println(mnAceleracao('x'));
  } else if (mnGiro('z') > -50) {
    Serial.println(mnAngulo(false));
    // (bloco "sair do laço" fora de um laço foi ignorado)
  } else {
    Serial.println(imu.readTemperature());
    Serial.println((int)imu.readPedometer());
  }
  while (!(millis() > 5000)) {
    delay((unsigned long)(10));
    delay(1);
  }
  Serial.println(((float)(((long)(10) % (long)(3))) / (sqrt(ceil(3.2)))));
  strip.clear();
  delay((unsigned long)((0.5) * 1000));
}

// Atenção: 1 bloco(s) fora de "quando a placa ligar" ou "repetir para sempre" não entraram no programa.
