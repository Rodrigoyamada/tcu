import urllib.request

urls = [
    ("Lei 8.443/1992", "https://www.planalto.gov.br/ccivil_03/leis/l8443.htm"),
    ("Lei 8.666/1993", "https://www.planalto.gov.br/ccivil_03/leis/l8666cons.htm"),
    ("Lei 8.112/1990", "https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm"),
    ("Lei 13.303/2016", "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13303.htm"),
    ("Constituição Federal", "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm")
]

req_headers = {"User-Agent": "Mozilla/5.0"}
for nome, url in urls:
    try:
        req = urllib.request.Request(url, headers=req_headers)
        res = urllib.request.urlopen(req).status
        print(f"✅ {nome}: {res}")
    except Exception as e:
        print(f"❌ {nome}: ERRO {e}")
