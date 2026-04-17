#!/usr/bin/env python3
"""
Importação direta de CSVs do TCU para o Supabase via API REST.
Processa todos os arquivos em ~/Downloads automaticamente.
"""
import csv, json, urllib.request, urllib.error, os, sys, time
from datetime import datetime

csv.field_size_limit(10_000_000)

SUPABASE_URL = "https://yojodrqykuhytdemmrsr.supabase.co"
SUPABASE_KEY = "sb_publishable_-XDy8m1iTYXlf-hayQzgTQ_agv5OggW"
BATCH_SIZE = 25
DOWNLOADS = "/Users/usuario/Downloads"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal,resolution=ignore-duplicates",
}

# Mapeamento de arquivo → tipo e campos
FILE_CONFIGS = {
    "acordao-completo": {
        "tipo": "acordao",
        "map": {
            "KEY": "numero",
            "TITULO": "titulo",
            "RELATOR": "relator",
            "COLEGIADO": "orgao",
            "DATASESSAO": "data_pub",
            "SUMARIO": "ementa",
            "ACORDAO": "conteudo",
            "DECISAO": "decisao",
            "QUORUM": "quorum",
            "RELATORIO": "relatorio",
            "VOTO": "voto",
            "SITUACAO": "situacao",
            "TIPOPROCESSO": "tipo_processo",
            "INTERESSADOS": "interessados",
            "ENTIDADE": "entidade",
            "UNIDADETECNICA": "unidade_tecnica",
            "NUMATA": "num_ata",
        }
    },
    "jurisprudencia-selecionada": {
        "tipo": "jurisprudencia_selecionada",
        "map": {
            "KEY": "numero",
            "ENUNCIADO": "ementa",
            "EXCERTO": "excerto",
            "COLEGIADO": "orgao",
            "DATASESSAOFORMATADA": "data_pub",
            "AREA": "area",
            "TEMA": "tema",
            "TIPOPROCESSO": "tipo_processo",
            "INDEXACAO": "indexacao",
            "REFERENCIALEGAL": "referencia_legal",
        }
    },
    "sumula": {
        "tipo": "sumula",
        "map": {
            "KEY": "numero",         # Ex: SUMULA-8 → KEY
            "NUMERO": "titulo",       # Número da súmula como título
            "ENUNCIADO": "ementa",
            "EXCERTO": "excerto",
            "COLEGIADO": "orgao",
            "DATASESSAOFORMATADA": "data_pub",
            "AREA": "area",
            "TEMA": "tema",
            "TIPOPROCESSO": "tipo_processo",
            "INDEXACAO": "indexacao",
            "REFERENCIALEGAL": "referencia_legal",
        }
    },
    "resposta-consulta": {
        "tipo": "consulta",
        "map": {
            "KEY": "numero",
            "ENUNCIADO": "ementa",
            "EXCERTO": "excerto",
            "COLEGIADO": "orgao",
            "DATASESSAOFORMATADA": "data_pub",
            "AREA": "area",
            "TEMA": "tema",
            "TIPOPROCESSO": "tipo_processo",
            "INDEXACAO": "indexacao",
            "REFERENCIALEGAL": "referencia_legal",
        }
    },
    "boletim-jurisprudencia": {
        "tipo": "publicacao_boletim_jurisprudencia",
        "map": {
            "KEY": "numero",
            "TITULO": "titulo",
            "ENUNCIADO": "ementa",
            "REFERENCIA": "referencia_legal",
            "TEXTOACORDAO": "conteudo",
        }
    },
    "boletim-informativo-lc": {
        "tipo": "publicacao_informativo_licitacoes",
        "map": {
            "KEY": "numero",
            "TITULO": "titulo",
            "ENUNCIADO": "ementa",
            "EXCERTO": "excerto",
            "TEXTOACORDAO": "conteudo",
        }
    },
    "boletim-pessoal": {
        "tipo": "publicacao_boletim_pessoal",
        "map": {
            "KEY": "numero",
            "TITULO": "titulo",
            "ENUNCIADO": "ementa",
            "EXCERTO": "excerto",
        }
    },
}

def detect_encoding(filepath):
    with open(filepath, 'rb') as f:
        raw = f.read(4096)
    try:
        raw.decode('utf-8')
        return 'utf-8'
    except:
        return 'iso-8859-1'

def detect_delimiter(filepath, enc):
    with open(filepath, 'r', encoding=enc, errors='replace') as f:
        first_line = f.readline()
    counts = {
        '|': first_line.count('|'),
        ';': first_line.count(';'),
        ',': first_line.count(','),
        '\t': first_line.count('\t'),
    }
    return max(counts, key=counts.get)

def get_config(filename):
    for key, cfg in FILE_CONFIGS.items():
        if filename.startswith(key):
            return cfg
    return None

def parse_date(val):
    if not val:
        return None
    for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d/%m/%y'):
        try:
            return datetime.strptime(val.strip(), fmt).strftime('%Y-%m-%d')
        except:
            pass
    return None

def build_record(row, cfg, headers_lower):
    mapping = cfg['map']
    # Mapear headers insensível a maiúsculas
    normalized = {h.upper().strip().strip('"'): h for h in row.keys()}
    
    rec = {"tipo": cfg['tipo']}
    meta = {}
    has_data = False
    
    for csv_col, db_col in mapping.items():
        # Procura a coluna no CSV (case insensitive)
        actual_col = normalized.get(csv_col.upper())
        if not actual_col:
            continue
        val = str(row.get(actual_col, '') or '').strip()
        if not val:
            continue
        
        if db_col == 'data_pub':
            val = parse_date(val)
            if not val:
                continue
        
        if db_col == 'numero':
            val = val[:200]
        
        rec[db_col] = val
        has_data = True
    
    if not rec.get('numero'):
        return None
    
    return rec if has_data else None

def insert_batch(batch):
    if not batch:
        return 0, 0
    # PostgREST exige que todos os objetos tenham exatamente as mesmas chaves
    all_keys = set()
    for rec in batch:
        all_keys.update(rec.keys())
    normalized = [{k: rec.get(k, None) for k in all_keys} for rec in batch]
    
    # Upsert com on_conflict=numero — ignora duplicatas sem erro
    url = f"{SUPABASE_URL}/rest/v1/jurisprudencia"
    data = json.dumps(normalized).encode('utf-8')
    headers_upsert = {
        **HEADERS,
        "Prefer": "return=minimal,resolution=ignore-duplicates",
    }
    req = urllib.request.Request(url + "?on_conflict=numero", data=data, headers=headers_upsert, method='POST')
    try:
        with urllib.request.urlopen(req) as r:
            return len(batch), 0
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        # Se falhar por duplicidade ou Timeout (504/500/503), tentar um a um
        if e.code in [409, 500, 503, 504]:
            ok = 0
            for rec in normalized:
                try:
                    r2 = urllib.request.Request(url + "?on_conflict=numero", data=json.dumps([rec]).encode(), headers=headers_upsert, method='POST')
                    with urllib.request.urlopen(r2): pass
                    ok += 1
                except:
                    pass
            return ok, len(batch) - ok
        print(f"\n    ⚠️  HTTP {e.code}: {body[:200]}")
        return 0, len(batch)
    except Exception as ex:
        print(f"\n    ⚠️  Erro: {ex}")
        return 0, len(batch)


def import_file(filepath):
    filename = os.path.basename(filepath)
    cfg = get_config(filename)
    if not cfg:
        print(f"  ⏭️  Sem config para: {filename}")
        return

    enc = detect_encoding(filepath)
    delim = detect_delimiter(filepath, enc)
    size_mb = os.path.getsize(filepath) / 1024 / 1024
    
    print(f"\n📄 {filename} ({size_mb:.0f}MB | {enc} | delim='{delim}')")
    
    total_ok = 0
    total_err = 0
    batch = []
    start = time.time()
    row_count = 0
    
    with open(filepath, 'r', encoding=enc, errors='replace') as f:
        reader = csv.DictReader(f, delimiter=delim)
        headers_lower = [h.upper() for h in (reader.fieldnames or [])]
        
        for row in reader:
            row_count += 1
            rec = build_record(row, cfg, headers_lower)
            if rec:
                batch.append(rec)
            
            if len(batch) >= BATCH_SIZE:
                ok, err = insert_batch(batch)
                total_ok += ok
                total_err += err
                batch = []
                elapsed = time.time() - start
                rate = total_ok / elapsed if elapsed > 0 else 0
                print(f"  ↳ {total_ok:,} inseridos | {row_count:,} lidos | {rate:.0f} rec/s        ", end='\r')
        
        if batch:
            ok, err = insert_batch(batch)
            total_ok += ok
            total_err += err
    
    elapsed = time.time() - start
    print(f"  ✅ {total_ok:,} inseridos, {total_err} erros | {elapsed:.1f}s            ")
    return total_ok

# ─── Main ────────────────────────────────────────────────────────────────────

# Verificar quais já foram importados
def already_imported():
    url = f"{SUPABASE_URL}/rest/v1/importacoes?select=nome_arquivo&status=eq.concluido"
    h = {k: v for k, v in HEADERS.items() if k != "Prefer"}
    try:
        req = urllib.request.Request(url, headers=h)
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read())
            return {d['nome_arquivo'] for d in data}
    except:
        return set()

csv_files = sorted([
    f for f in os.listdir(DOWNLOADS) if f.endswith('.csv')
])

# Prioridade: menores e mais importantes primeiro
priority = ['sumula', 'boletim-pessoal', 'resposta-consulta', 'boletim-jurisprudencia',
            'boletim-informativo-lc', 'jurisprudencia-selecionada']
def sort_key(fn):
    for i, p in enumerate(priority):
        if fn.startswith(p): return (i, fn)
    return (len(priority), fn)

csv_files.sort(key=sort_key)

print("=" * 65)
print("IMPORTAÇÃO AUTOMÁTICA TCU → SUPABASE")
print("=" * 65)
print(f"📁 {len(csv_files)} arquivos encontrados em {DOWNLOADS}")
imported = already_imported()
print(f"✅ {len(imported)} já importados anteriormente\n")

grand_total = 0
for fn in csv_files:
    if fn in imported:
        print(f"  ⏭️  {fn} (já importado)")
        continue
    
    fp = os.path.join(DOWNLOADS, fn)
    result = import_file(fp)
    if result is not None:
        grand_total += result

print(f"\n{'='*65}")
print(f"🏁 CONCLUÍDO: {grand_total:,} registros inseridos no total")
print(f"{'='*65}")
