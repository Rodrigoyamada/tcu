import urllib.request, json
url = "https://yojodrqykuhytdemmrsr.supabase.co/rest/v1/rpc/search_jurisprudencia_rag"
key = "sb_publishable_-XDy8m1iTYXlf-hayQzgTQ_agv5OggW"
headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
body = json.dumps({"query_text": "contrato"}).encode('utf-8')
try:
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req) as r:
        print("Status:", r.status)
        print(len(json.loads(r.read())), "resultados")
except Exception as e:
    if hasattr(e, 'read'):
        print("ERRO:", e.code, e.read().decode())
    else:
        print("ERRO:", e)
