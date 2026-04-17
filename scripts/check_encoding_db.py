import urllib.request, json
URL = 'https://yojodrqykuhytdemmrsr.supabase.co'
KEY = 'sb_publishable_-XDy8m1iTYXlf-hayQzgTQ_agv5OggW'

req = urllib.request.Request(
    f'{URL}/rest/v1/jurisprudencia?select=numero,tipo,ementa,conteudo&limit=10&order=created_at.desc',
    headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'}
)
with urllib.request.urlopen(req) as r:
    data = json.loads(r.read().decode('utf-8'))
    for d in data:
        print(f"[{d.get('tipo')}] {d.get('numero')}")
        ementa = d.get('ementa') or ''
        conteudo = d.get('conteudo') or ''
        print(f"  Ementa snippet: {ementa[:100]}")
        # print first string of text that has accented characters if possible
        words_with_accents = [w for w in conteudo.split() if any(c in 'áéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ' for c in w)]
        print(f"  Words w/ accents in conteudo: {words_with_accents[:10]}")
        print()
