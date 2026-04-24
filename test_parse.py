import urllib.request
import re
from bs4 import BeautifulSoup
import bs4

url = "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm"
headers = {"User-Agent": "Mozilla/5.0"}

req = urllib.request.Request(url, headers=headers)
html = urllib.request.urlopen(req).read().decode('iso-8859-1')
soup = BeautifulSoup(html, 'html.parser')

# Remove strikes and tags that indicate revoked info, but sometimes they keep the text as strike
# Vetoed text is often in strike
for st in soup.find_all('strike'):
    st.extract() # Remove texts that are strikethrough (revogados)

# We want to extract paragraphs
articles = []
current_art = None
current_text = []

# P tags usually have the text
for p in soup.find_all(['p', 'span', 'div']): # Usually text is in p or font inside p
    text = p.get_text(strip=True)
    if not text: continue
    
    # Check if starts with Art. 
    # Planalto often uses "Art. 1º "
    match = re.match(r'^(Art\.\s*\d+[ºo]?\W)(.*)', text, re.IGNORECASE)
    if match:
        # Save previous
        if current_art:
            articles.append((current_art, "\n".join(current_text)))
        current_art = match.group(1).strip()
        current_text = [text] # include the art itself
    elif current_art:
        # We are inside an article
        # Avoid title sections like "CAPÍTULO I", "Seção II"
        if re.match(r'^(LIVRO|TÍTULO|CAPÍTULO|Seção)\s+', text, re.IGNORECASE):
            continue
        # Only add if it's not a generic link
        if "Mensagem de veto" in text or "Vigência" in text:
            continue
        current_text.append(text)

# Append last
if current_art:
    articles.append((current_art, "\n".join(current_text)))

print(f"Total articles found: {len(articles)}")
if len(articles) > 0:
    print(articles[0])
    print(articles[-1])

