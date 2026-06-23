from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.firefox.options import Options
from selenium.common.exceptions import TimeoutException
from selenium.common.exceptions import TimeoutException, NoAlertPresentException
import time
import os
import traceback


def emitir_guia(inscricaoEstadual, referencia, codigo, chave_nfe, dataPagamento, vlr_tributo, vlr_correcao, atraso, juros_nota, nome, nfe, caminhoDestino):
    """
    Emite UMA guia abrindo o navegador do ZERO
    Fecha o navegador ao final
    """
    download_dir = os.path.abspath(caminhoDestino)
    
    # Verifica se o caminho existe, se não, retorna erro
    if not os.path.exists(download_dir):
        raise FileNotFoundError(f"O caminho de destino não foi encontrado: {download_dir}")
    
    firefox_options = Options()
    firefox_options.add_argument("--headless")
    firefox_options.add_argument("--window-size=1920,1080")
    firefox_options.add_argument("--start-maximized")
    
    # Configurações de download para Firefox
    firefox_options.set_preference("browser.download.folderList", 2)
    firefox_options.set_preference("browser.download.dir", download_dir)
    firefox_options.set_preference("browser.download.useDownloadDir", True)
    firefox_options.set_preference("browser.helperApps.neverAsk.saveToDisk", "application/pdf")
    firefox_options.set_preference("pdfjs.disabled", True)
    firefox_options.set_preference("browser.download.manager.showWhenStarting", False)
    firefox_options.set_preference("browser.helperApps.alwaysAsk.force", False)
    firefox_options.set_preference("pdfjs.enabledCache.state", False)

    driver = webdriver.Firefox(options=firefox_options)
    wait = WebDriverWait(driver, 45)
    
    try:
        print(f"\n{'='*60}")
        print(f"INICIANDO EMISSÃO DA NFE {nfe}")
        print(f"{'='*60}")
        print("Abrindo navegador Firefox (modo headless)...")
        
        driver.get("https://www.sefaz.mt.gov.br/arrecadacao/darlivre/menudarlivre")
        time.sleep(2)

        print("Clicando em 'Pessoa Jurídica Inscrita'...")
        inscrito = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[normalize-space(text())='Pessoa Jurídica Inscrita']")))
        inscrito.click()
        time.sleep(4)

        print("Preenchendo Inscrição Estadual...")
        inscricao = wait.until(EC.visibility_of_element_located((By.NAME, "inscricaoEstadual")))
        inscricao.send_keys(inscricaoEstadual)
        time.sleep(4)

        print("Clicando em 'Confirmar'...")
        comfirmar = wait.until(EC.element_to_be_clickable((By.ID, "btnConfirmar")))
        comfirmar.click()
        time.sleep(3)

        # Trata popup de aviso (aparece apenas às vezes)
        try:
            alerta = WebDriverWait(driver, 5).until(EC.alert_is_present())
            print(f"[Popup] Aviso detectado: {alerta.text[:80]}")
            alerta.accept()
            print("[Popup] OK clicado.")
        except (TimeoutException, NoAlertPresentException):
            pass  # Popup não apareceu, segue normalmente

        time.sleep(2)


        print("Preenchendo dados da guia...")
        periodo = wait.until(EC.visibility_of_element_located((By.NAME, "periodoReferencia")))
        periodo.send_keys(referencia)
        time.sleep(2)

        # Configuração específica por tipo de código
        if codigo == "1317":
            print("Selecionando o tributo 1317...")
            wait.until(EC.presence_of_element_located((By.ID, "tributo")))
            driver.execute_script("document.getElementById('tributo').value = '1317'; eventoTributo('1317');")
            time.sleep(7)
        else:
            print("Selecionando tipo de venda e tributo 2817...")
            tipo_venda2 = wait.until(EC.element_to_be_clickable((By.ID, "tipoVenda2")))
            tipo_venda2.click()
            driver.execute_script("eventoTipoVenda(2);")
            time.sleep(3)
            
            wait.until(EC.presence_of_element_located((By.ID, "tributo")))
            driver.execute_script("document.getElementById('tributo').value = '2817'; eventoTributo('2817');")
            time.sleep(7)
        
        # Preenchimento comum para ambos os códigos
        print("Preenchendo os campos restantes...")
        inscricao_doc = wait.until(EC.visibility_of_element_located((By.ID, "numrDocumento")))
        inscricao_doc.click()
        inscricao_doc.clear()
        time.sleep(0.5)
        # Digita caractere por caractere para o JavaScript do site reconhecer
        for char in str(inscricaoEstadual):
            inscricao_doc.send_keys(char)
            time.sleep(0.1)
        time.sleep(2)
        
        # Re-executa o script do tributo por segurança
        if codigo == "1317":
            driver.execute_script("document.getElementById('tributo').value = '1317'; eventoTributo('1317');")
        else:
            driver.execute_script("document.getElementById('tributo').value = '2817'; eventoTributo('2817');")
        time.sleep(3)
        
        wait.until(EC.element_to_be_clickable((By.ID, "dataVencimento"))).click()
        time.sleep(2)
        
        chave = wait.until(EC.visibility_of_element_located((By.ID, "numrNota1")))
        chave.send_keys(chave_nfe)
        time.sleep(2)
        
        data_venc = driver.find_element(By.ID, "dataVencimento")
        data_venc.clear()
        data_venc.send_keys(dataPagamento)
        time.sleep(2)
        
        # Preenche campos monetários - limpa e preenche para preservar zeros finais
        print(f"Preenchendo valores: Tributo={vlr_tributo}, Correção={vlr_correcao}, Juros={juros_nota}")
        
        campo_tributo = driver.find_element(By.ID, "valorCampo")
        campo_tributo.clear()
        campo_tributo.click()
        campo_tributo.send_keys(vlr_tributo)
        time.sleep(0.5)
        
        campo_correcao = driver.find_element(By.ID, "valorCorrecao")
        campo_correcao.clear()
        campo_correcao.click()
        campo_correcao.send_keys(vlr_correcao)
        time.sleep(0.5)
        
        driver.find_element(By.ID, "diasAtraso").send_keys(atraso)
        time.sleep(0.5)
        
        campo_juros = driver.find_element(By.ID, "juros")
        campo_juros.clear()
        campo_juros.click()
        campo_juros.send_keys(juros_nota)
        time.sleep(2)
        
        print("Emitindo a guia...")
        emitir = wait.until(EC.element_to_be_clickable((By.ID, "btnIncluir")))
        emitir.click()
        time.sleep(2)

        print("Selecionando a forma de pagamento")
        campo_pagamento = driver.find_element(By.ID, "bntDarPdf")
        campo_pagamento.click()
        time.sleep(2)

        print("Aguardando download do PDF...")
        time.sleep(8)  # Aumentado para garantir o download
        
        # Aguarda até que o arquivo PDF apareça na pasta
        tentativas = 0
        max_tentativas = 20
        while tentativas < max_tentativas:
            arquivos_pdf = [f for f in os.listdir(download_dir) if f.endswith('.pdf')]
            if arquivos_pdf:
                break
            time.sleep(1)
            tentativas += 1
            print(f"Aguardando arquivo PDF... ({tentativas}/{max_tentativas})")
        
        if tentativas >= max_tentativas:
            print(f"\n⚠ AVISO: Timeout ao aguardar download do PDF")
            print(f"Verifique manualmente a pasta: {download_dir}")
        
        time.sleep(2)  # Tempo extra para garantir que o arquivo foi completamente salvo
        
        # Renomeação do arquivo baixado
        arquivos = sorted(
            [f for f in os.listdir(download_dir) if f.endswith('.pdf')],
            key=lambda x: os.path.getmtime(os.path.join(download_dir, x)),
            reverse=True
        )
        
        if arquivos:
            arquivo_mais_recente = arquivos[0]
            print(f"\nArquivo baixado: {arquivo_mais_recente}")
            
            novo_nome = f"{nome} - {nfe}.pdf"
            caminho_antigo = os.path.join(download_dir, arquivo_mais_recente)
            caminho_novo = os.path.join(download_dir, novo_nome)
            
            # Evita sobrescrever arquivo existente
            contador = 1
            while os.path.exists(caminho_novo):
                novo_nome = f"{nome} - {nfe} ({contador}).pdf"
                caminho_novo = os.path.join(download_dir, novo_nome)
                contador += 1
            
            os.rename(caminho_antigo, caminho_novo)
            print(f"Arquivo renomeado para: {novo_nome}")
            print(f"Localização: {caminho_novo}")
        else:
            print(f"\nAVISO: Nenhum arquivo PDF encontrado em: {download_dir}")
        
        print(f"\n{'='*60}")
        print(f"✓ GUIA NFE {nfe} EMITIDA COM SUCESSO")
        print(f"{'='*60}\n")
        
        return True

    except TimeoutException as e:
        print(f"\n✗ ERRO: Timeout ao processar NFE {nfe}")
        print("O site pode estar fora do ar ou muito lento.")
        try:
            # Tira um print da tela para sabermos onde travou
            print_caminho = os.path.join(download_dir, f"ERRO_TELA_{nfe}.png")
            driver.save_screenshot(print_caminho)
            print(f"📸 Print da tela salvo em: {print_caminho}")
        except Exception:
            pass
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"\n✗ ERRO ao processar NFE {nfe}: {e}")
        try:
            print_caminho = os.path.join(download_dir, f"ERRO_TELA_{nfe}.png")
            driver.save_screenshot(print_caminho)
            print(f"📸 Print da tela salvo em: {print_caminho}")
        except Exception:
            pass
        traceback.print_exc()
        return False
    finally:
        print("Fechando o navegador...")
        driver.quit()
        time.sleep(2)  # Pausa entre guias


def processar_lote_guias(inscricaoEstadual, notas_list, caminhoDestino, callback_progresso=None):
    resultados = {'sucesso': 0, 'falhas': 0, 'total': len(notas_list)}
    
    print(f"\n{'#'*60}")
    print(f"# PROCESSAMENTO EM LOTE: {len(notas_list)} GUIA(S)")
    print(f"# MODO: Reabertura do navegador para cada guia")
    print(f"{'#'*60}\n")
    
    for idx, nota in enumerate(notas_list, 1):
        print(f"\n>>> Processando guia {idx} de {len(notas_list)} <<<")
        
        if callback_progresso:
            callback_progresso(idx, len(notas_list), 'processing')
        
        try:
            # Chama a função original que abre/fecha o navegador
            sucesso = emitir_guia(
                inscricaoEstadual=nota['inscricaoEstadual'],
                referencia=nota['referencia'],
                codigo=nota['codigo'],
                chave_nfe=nota['chave'],
                dataPagamento=nota['dataPagamento'],
                vlr_tributo=nota['vlr_tributo'],
                vlr_correcao=nota['vlr_correcao'],
                atraso=nota['atraso'],
                juros_nota=nota['juros_nota'],
                nome=nota['nome'],
                nfe=nota['nfe'],
                caminhoDestino=caminhoDestino
            )
            
            if sucesso:
                resultados['sucesso'] += 1
            else:
                resultados['falhas'] += 1
        except FileNotFoundError as e:
            # Propaga o erro de caminho não encontrado
            raise e
        except Exception as e:
            print(f"Erro ao processar guia {idx}: {e}")
            resultados['falhas'] += 1
        
        # Pausa entre guias (já tem 2s no finally, mas pode adicionar mais se necessário)
        if idx < len(notas_list):
            print(f"Aguardando antes da próxima guia...")
            time.sleep(1)
    
    print(f"\n{'#'*60}")
    print(f"# RESULTADO FINAL")
    print(f"# Sucesso: {resultados['sucesso']} | Falhas: {resultados['falhas']} | Total: {resultados['total']}")
    print(f"{'#'*60}\n")
    
    return resultados