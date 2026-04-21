#!/usr/bin/env python3
import urllib.request
import re
import json
import time
from bs4 import BeautifulSoup

# Configurações do Supabase (Mesmas do import_all.py)
SUPABASE_URL = "https://yojodrqykuhytdemmrsr.supabase.co"
SUPABASE_KEY = "sb_publishable_-XDy8m1iTYXlf-hayQzgTQ_agv5OggW" # Chave pública/anon
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal,resolution=ignore-duplicates"
}

# Planalto URL
URL = "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm"
REQ_HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}

def clean_text(text):
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def fetch_and_parse():
    print("🌐 Baixando HTML do site do Planalto (Lei 14.133/2021)...")
    req = urllib.request.Request(URL, headers=REQ_HEADERS)
    html = urllib.request.urlopen(req).read().decode('iso-8859-1')
    
    print("🧹 Omitindo tags vetadas e fazendo limpeza...")
    soup = BeautifulSoup(html, 'html.parser')
    
    for st in soup.find_all('strike'):
        st.extract()
        
    articles = []
    current_art = None
    current_text = []
    
    # Busca todas as tags
    for p in soup.find_all(['p', 'span', 'div']):
        text = p.get_text(strip=True)
        if not text:
            continue
            
        # O Planalto anexa arquivos de veto no fim do documento.
        # Nós encerramos a coleta quando encontramos "Brasília, 1º de abril de 2021" (final da lei)
        if "Brasília, 1º de abril de 2021" in text and len(articles) > 100:
            if current_art:
                articles.append({
                    "norma": "Lei 14.133/2021",
                    "identificador": current_art,
                    "texto": "\n".join(current_text)
                })
            break
            
        # Verifica se começa com um Artigo novo (Ex: Art. 1º, Art. 75.)
        match = re.match(r'^(Art\.\s*\d+[ºo\-\.]?)\s*(.*)', text, re.IGNORECASE)
        
        if match:
            # Salvar o anterior
            if current_art:
                articles.append({
                    "norma": "Lei 14.133/2021",
                    "identificador": current_art,
                    "texto": "\n".join(current_text)
                })
            current_art = match.group(1).strip()
            # Limpa o texto original
            cleaned = clean_text(text)
            current_text = [cleaned]
        elif current_art:
            # Ignorar cabeçalhos
            if re.match(r'^(LIVRO|TÍTULO|CAPÍTULO|Seção|Subseção)\s+', text, re.IGNORECASE):
                continue
            if "Mensagem de veto" in text:
                continue
                
            cleaned = clean_text(text)
            if cleaned:
                current_text.append(cleaned)
                
    return articles

def push_to_supabase(articles):
    print(f"\n🚀 Iniciando upload de {len(articles)} artigos para o Supabase (tabela legislacao)...")
    url = f"{SUPABASE_URL}/rest/v1/legislacao"
    
    batch_size = 50
    inserted = 0
    
    for i in range(0, len(articles), batch_size):
        batch = articles[i:i+batch_size]
        data = json.dumps(batch).encode('utf-8')
        
        req = urllib.request.Request(
            url + "?on_conflict=identificador,norma", 
            data=data, 
            headers=HEADERS, 
            method='POST'
        )
        try:
            urllib.request.urlopen(req)
            inserted += len(batch)
            print(f"✅ Lote enviado: {inserted}/{len(articles)}")
        except Exception as e:
            print(f"❌ Erro ao enviar lote: {e}")
            if hasattr(e, 'read'):
                print("Detalhes:", e.read().decode('utf-8'))
            time.sleep(2)
            
    print(f"\n🎉 Concluído! {inserted} 'chunks' (Artigos) inseridos no Supabase.")

if __name__ == "__main__":
    extracted = fetch_and_parse()
    print(f"📊 Foram fatiados {len(extracted)} artigos válidos no total (1 a 194).")
    if len(extracted) > 0:
        push_to_supabase(extracted)
