FROM node:20-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates python3 \
 && rm -rf /var/lib/apt/lists/*

# arduino-cli
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | BINDIR=/usr/local/bin sh

# Núcleo ESP32 (Espressif) e as bibliotecas livres da mannaNAUTA (wuigor)
RUN arduino-cli config init \
 && arduino-cli config add board_manager.additional_urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json \
 && arduino-cli core update-index \
 && arduino-cli core install esp32:esp32 \
 && arduino-cli lib update-index \
 && arduino-cli lib install "mannaNAUTA WS2812" "mannaNAUTA LSM6DS" \
 && cp "$(find /root/.arduino15 -name boot_app0.bin | head -n 1)" /opt/boot_app0.bin

WORKDIR /app
COPY server.js teste.ino ./

# Compila uma vez durante a montagem para deixar o núcleo em cache
RUN mkdir -p /tmp/teste && cp teste.ino /tmp/teste/teste.ino \
 && arduino-cli compile --fqbn esp32:esp32:esp32s3:CDCOnBoot=cdc /tmp/teste \
 && rm -rf /tmp/teste

ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
