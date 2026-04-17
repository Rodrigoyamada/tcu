import urllib.request, json
url = "https://yojodrqykuhytdemmrsr.supabase.co/rest/v1/rpc/search_jurisprudencia_rag"
key = "sb_publishable_-XDy8m1iTYXlf-hayQzgTQ_agv5OggW"
headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
body = json.dumps({"query_text": "contrato"}).encode('utf-8')
try:
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=10) as r:
        print("Status (query_text):", r.status)
except urllib.error.HTTPError as e:
    print("ERRO (query_text):", e.code, e.read().decode())
except Exception as e:
    print("ERRO:", e)

# Test with 'query'
body2 = json.dumps({"query": "contrato"}).encode('utf-8')
try:
    req = urllib.request.Request(url, data=body2, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=10) as r:
        print("Status (query):", r.status)
except urllib.error.HTTPError as e:
    print("ERRO (query):", e.code, e.read().decode())
except Exception as e:
    print("ERRO:", e)
