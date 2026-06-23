FROM python:3.11-slim

WORKDIR /app

# Instalar Firefox ESR e wget
RUN apt-get update && apt-get install -y \
    wget \
    firefox-esr \
    && rm -rf /var/lib/apt/lists/*

# Instalar geckodriver (Motorista do Firefox para o Selenium)
RUN wget -q "https://github.com/mozilla/geckodriver/releases/download/v0.34.0/geckodriver-v0.34.0-linux64.tar.gz" -O /tmp/geckodriver.tar.gz \
    && tar -xzf /tmp/geckodriver.tar.gz -C /usr/local/bin/ \
    && rm /tmp/geckodriver.tar.gz \
    && chmod +x /usr/local/bin/geckodriver

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3940

# Gunicorn para rodar o Flask
# --workers 2: Cada instancia do Firefox consome RAM. Mantemos 2 workers para evitar sobrecarga no servidor.
# --timeout 300: O site da SEFAZ pode demorar, damos ate 5 minutos para o timeout.
CMD ["gunicorn", "--bind", "0.0.0.0:3940", "--workers", "2", "--timeout", "300", "app:app"]
