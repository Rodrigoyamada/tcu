from bs4 import BeautifulSoup
import re

html_snippet = """
<p><strike>Art. 5º O processo licitatório tem por objetivo:</strike> <a href="#">(Revogado)</a></p>
<p>Art. 5º O processo licitatório...</p>
<p>I - <strike>blabla</strike> (VETADO)</p>
"""
soup = BeautifulSoup(html_snippet, 'html.parser')
for st in soup.find_all('strike'):
    st.extract()

for p in soup.find_all('p'):
    text = p.get_text(strip=True)
    if "VETADO" in text or "Revogado" in text:
        print(f"Bolinha: {text}")

