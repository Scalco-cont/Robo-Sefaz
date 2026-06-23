FROM python:3.11-slim

WORKDIR /app

# Instalar Firefox ESR e wget
RUN apt-get update && apt-get install -y \
    wget \
    firefox-esr \
    && rm -rf /var/lib/apt/lists/*

# O Selenium 4.18+ baixa o geckodriver correto automaticamente usando o Selenium Manager,
# então não precisamos mais baixar manualmente e evitamos erro de versão incompatível!

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3940

# Gunicorn para rodar o Flask
# IMPORTANTE: Usamos --workers 1 para que o dicionário de tarefas na memória seja compartilhado.
# Para suportar multiplos usuarios simultaneos, usamos --threads 4 em vez de multiplos workers.
CMD ["gunicorn", "--bind", "0.0.0.0:3940", "--workers", "1", "--worker-class", "gthread", "--threads", "4", "--timeout", "300", "app:app"]
