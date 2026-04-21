#!/usr/bin/env python3
import urllib.request
import re
import json
import time
from bs4 import BeautifulSoup

# Configurações do Supabase
SUPABASE_URL = "https://yojodrqykuhytdemmrsr.supabase.co"
SUPABASE_KEY = "sb_publishable_-XDy8m1iTYXlf-hayQzgTQ_agv5OggW" # Chave pública/anon
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal,resolution=ignore-duplicates"
}

# Lista de Leis Estratégicas do TCU
LEIS = [
    ("Lei 8.443/1992", "https://www.planalto.gov.br/ccivil_03/leis/l8443.htm"),
    ("Lei 8.666/1993", "https://www.planalto.gov.br/ccivil_03/leis/l8666cons.htm"),
    ("Lei 8.112/1990", "https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm"),
    ("Lei 13.303/2016", "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13303.htm"),
    ("Constituição Federal", "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm")
]

REQ_HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}

def clean_text(text):
    return re.sub(r'\s+', ' ', text).strip()

def fetch_and_parse(nome_norma, url):
    print(f"\n🌐 Baixando HTML: {nome_norma}...")
    req = urllib.request.Request(url, headers=REQ_HEADERS)
    # Tenta utf-8 primeiro (alguns adendos do planalto são), senão iso-8859-1
    try:
        raw_html = urllib.request.urlopen(req).read()
        try:
            html = raw_html.decode('utf-8')
        except UnicodeDecodeError:
            html = raw_html.decode('iso-8859-1')
    except Exception as e:
        print(f"❌ Falha ao baixar {nome_norma}: {e}")
        return []
    
    print(f"🧹 Passando faxina ({nome_norma})...")
    soup = BeautifulSoup(html, 'html.parser')
    
    for st in soup.find_all('strike'):
        st.extract()
        
    articles = []
    current_art = None
    current_text = []
    
    # O Planalto às vezes tem tabelas anexadas pesadas, então focar em parágrafos e spans
    for p in soup.find_all(['p', 'span', 'div']):
        text = p.get_text(strip=True)
        if not text:
            continue
            
        # Corta no final comum (Assinatura de brasília) para evitar pegar leis anexadas em vetos
        if "Brasília," in text and len(articles) > 50:
            if current_art:
                articles.append({
                    "norma": nome_norma,
                    "identificador": current_art,
                    "texto": "\n".join(current_text)
                })
            break
            
        # Expressão Regular para "Art. X" (captura Art. 1º, Art. 10, Art. 50-A)
        match = re.match(r'^(Art\.\s*\d+[ºoA-Z\-\.]?)\s*(.*)', text, re.IGNORECASE)
        
        if match:
            if current_art:
                articles.append({
                    "norma": nome_norma,
                    "identificador": current_art,
                    "texto": "\n".join(current_text)
                })
            current_art = match.group(1).strip()
            cleaned = clean_text(text)
            current_text = [cleaned]
        elif current_art:
            # Ignora tags de seções genéricas caídas no meio de um artigo
            if re.match(r'^(LIVRO|TÍTULO|CAPÍTULO|Seção|Subseção)\s+', text, re.IGNORECASE):
                continue
            if "Mensagem de veto" in text:
                continue
                
            cleaned = clean_text(text)
            if cleaned:
                current_text.append(cleaned)
                
    return articles

def push_to_supabase(articles, nome_norma):
    print(f"🚀 Enviando {len(articles)} artigos de {nome_norma} para o Supabase...")
    url = f"{SUPABASE_URL}/rest/v1/legislacao"
    batch_size = 50
    inserted = 0
    
    for i in range(0, len(articles), batch_size):
        batch = articles[i:i+batch_size]
        data = json.dumps(batch).encode('utf-8')
        req = urllib.request.Request(
            url + "?on_conflict=identificador,norma", 
            data=data, headers=HEADERS, method='POST'
        )
        try:
            urllib.request.urlopen(req)
            inserted += len(batch)
        except Exception as e:
            print(f"❌ Erro ao enviar lote: {e}")
            time.sleep(2)
            
    print(f"✅ {nome_norma}: {inserted} Artigos sincronizados.")

if __name__ == "__main__":
    print("==================================================")
    print("   INICIANDO DOWNLOAD DE LEGISLAÇÃO COMPLEMENTAR  ")
    print("==================================================")
    total_geral = 0
    for norma, url in LEIS:
        ext = fetch_and_parse(norma, url)
        if ext:
            push_to_supabase(ext, norma)
            total_geral += len(ext)
            
    print("==================================================")
    print(f"🎉 RAG CARREGADO! {total_geral} Artigos totais injetados.")
