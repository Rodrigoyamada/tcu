#!/usr/bin/env python3
"""
Importação direta de CSVs do TCU para o Supabase via API REST.
Usa checkpoint local (import_progress.json) para retomada real.
"""
import csv, json, urllib.request, urllib.error, os, sys, time
from datetime import datetime, timezone

csv.field_size_limit(sys.maxsize)  # sem limite — evita crash em campos grandes

SUPABASE_URL = "https://yojodrqykuhytdemmrsr.supabase.co"
SUPABASE_KEY = "sb_publishable_-XDy8m1iTYXlf-hayQzgTQ_agv5OggW"
BATCH_SIZE   = 100   # aumentado de 25 → 100 (menos roundtrips)
TIMEOUT      = 45    # segundos por requisição
DOWNLOADS    = "/Users/usuario/Downloads"
CHECKPOINT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'import_progress.json')
SAVE_EVERY   = 500   # salva checkpoint a cada N registros inseridos

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal,resolution=ignore-duplicates",
}

FILE_CONFIGS = {
    "acordao-completo": {
        "tipo": "acordao",
        "map": {
            "KEY": "numero", "TITULO": "titulo", "RELATOR": "relator",
            "COLEGIADO": "orgao", "DATASESSAO": "data_pub", "SUMARIO": "ementa",
            "ACORDAO": "conteudo", "DECISAO": "decisao", "QUORUM": "quorum",
            "RELATORIO": "relatorio", "VOTO": "voto", "SITUACAO": "situacao",
            "TIPOPROCESSO": "tipo_processo", "INTERESSADOS": "interessados",
            "ENTIDADE": "entidade", "UNIDADETECNICA": "unidade_tecnica", "NUMATA": "num_ata",
        }
    },
    "jurisprudencia-selecionada": {
        "tipo": "jurisprudencia_selecionada",
        "map": {
            "KEY": "numero", "ENUNCIADO": "ementa", "EXCERTO": "excerto",
            "COLEGIADO": "orgao", "DATASESSAOFORMATADA": "data_pub",
            "AREA": "area", "TEMA": "tema", "TIPOPROCESSO": "tipo_processo",
            "INDEXACAO": "indexacao", "REFERENCIALEGAL": "referencia_legal",
        }
    },
    "sumula": {
        "tipo": "sumula",
        "map": {
            "KEY": "numero", "NUMERO": "titulo", "ENUNCIADO": "ementa",
            "EXCERTO": "excerto", "COLEGIADO": "orgao", "DATASESSAOFORMATADA": "data_pub",
            "AREA": "area", "TEMA": "tema", "TIPOPROCESSO": "tipo_processo",
            "INDEXACAO": "indexacao", "REFERENCIALEGAL": "referencia_legal",
        }
    },
    "resposta-consulta": {
        "tipo": "consulta",
        "map": {
            "KEY": "numero", "ENUNCIADO": "ementa", "EXCERTO": "excerto",
            "COLEGIADO": "orgao", "DATASESSAOFORMATADA": "data_pub",
            "AREA": "area", "TEMA": "tema", "TIPOPROCESSO": "tipo_processo",
            "INDEXACAO": "indexacao", "REFERENCIALEGAL": "referencia_legal",
        }
    },
    "boletim-jurisprudencia": {
        "tipo": "publicacao_boletim_jurisprudencia",
        "map": {
            "KEY": "numero", "TITULO": "titulo", "ENUNCIADO": "ementa",
            "REFERENCIA": "referencia_legal", "TEXTOACORDAO": "conteudo",
        }
    },
    "boletim-informativo-lc": {
        "tipo": "publicacao_informativo_licitacoes",
        "map": {
            "KEY": "numero", "TITULO": "titulo", "ENUNCIADO": "ementa",
            "EXCERTO": "excerto", "TEXTOACORDAO": "conteudo",
        }
    },
    "boletim-pessoal": {
        "tipo": "publicacao_boletim_pessoal",
        "map": {
            "KEY": "numero", "TITULO": "titulo", "ENUNCIADO": "ementa",
            "EXCERTO": "excerto",
        }
    },
}

# ─── Checkpoint ──────────────────────────────────────────────────────────────

def load_checkpoint():
    try:
        with open(CHECKPOINT_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_checkpoint(progress):
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)

# ─── CSV helpers ─────────────────────────────────────────────────────────────

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
    counts = {'|': first_line.count('|'), ';': first_line.count(';'),
              ',': first_line.count(','), '\t': first_line.count('\t')}
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

def build_record(row, cfg):
    mapping = cfg['map']
    normalized = {h.upper().strip().strip('"'): h for h in row.keys()}
    rec = {"tipo": cfg['tipo']}
    has_data = False
    for csv_col, db_col in mapping.items():
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

# ─── Upsert com timeout e retry ──────────────────────────────────────────────

def insert_batch(batch, retries=3):
    if not batch:
        return 0, 0
    all_keys = set()
    for rec in batch:
        all_keys.update(rec.keys())
    normalized = [{k: rec.get(k, None) for k in all_keys} for rec in batch]

    url = f"{SUPABASE_URL}/rest/v1/jurisprudencia"
    headers_upsert = {**HEADERS, "Prefer": "return=minimal,resolution=ignore-duplicates"}

    for attempt in range(retries):
        try:
            data = json.dumps(normalized).encode('utf-8')
            req = urllib.request.Request(url + "?on_conflict=numero", data=data,
                                         headers=headers_upsert, method='POST')
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                return len(batch), 0
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', errors='replace')
            if e.code in [409, 500, 503, 504]:
                ok = 0
                for rec in normalized:
                    for _ in range(2):
                        try:
                            r2 = urllib.request.Request(url + "?on_conflict=numero",
                                                        data=json.dumps([rec]).encode(),
                                                        headers=headers_upsert, method='POST')
                            with urllib.request.urlopen(r2, timeout=TIMEOUT): pass
                            ok += 1
                            break
                        except:
                            time.sleep(2)
                return ok, len(batch) - ok
            print(f"\n    ⚠️  HTTP {e.code}: {body[:200]}")
            return 0, len(batch)
        except Exception as ex:
            wait = 5 * (attempt + 1)
            print(f"\n    ⚠️  Timeout/erro (tentativa {attempt+1}/{retries}): {ex} — aguardando {wait}s...")
            time.sleep(wait)

    return 0, len(batch)

# ─── Import de arquivo com suporte a retomada ────────────────────────────────

def import_file(filepath, start_row=0, progress=None):
    filename = os.path.basename(filepath)
    cfg = get_config(filename)
    if not cfg:
        print(f"  ⏭️  Sem config para: {filename}")
        return None

    enc = detect_encoding(filepath)
    delim = detect_delimiter(filepath, enc)
    size_mb = os.path.getsize(filepath) / 1024 / 1024

    if start_row > 0:
        print(f"\n📄 {filename} ({size_mb:.0f}MB) — retomando da linha {start_row:,}")
    else:
        print(f"\n📄 {filename} ({size_mb:.0f}MB | {enc} | delim='{delim}')")

    total_ok = 0
    total_err = 0
    batch = []
    start = time.time()
    row_count = 0
    last_save = 0

    with open(filepath, 'r', encoding=enc, errors='replace') as f:
        reader = csv.DictReader(f, delimiter=delim)

        for row in reader:
            row_count += 1

            # Pula linhas já processadas
            if row_count <= start_row:
                if row_count % 5000 == 0:
                    print(f"  ⏩ pulando linha {row_count:,}/{start_row:,}...", end='\r')
                continue

            try:
                rec = build_record(row, cfg)
            except Exception as e:
                print(f"\n  ⚠️  Linha {row_count} ignorada (erro: {e})")
                continue
            if rec:
                batch.append(rec)

            if len(batch) >= BATCH_SIZE:
                ok, err = insert_batch(batch)
                total_ok += ok
                total_err += err
                batch = []
                elapsed = time.time() - start
                rate = total_ok / elapsed if elapsed > 0 else 0
                print(f"  ↳ {total_ok:,} inseridos | linha {row_count:,} | {rate:.0f} rec/s        ", end='\r')

                # Salva checkpoint incremental
                if progress is not None and total_ok - last_save >= SAVE_EVERY:
                    progress[filename] = {
                        "status": "partial",
                        "rows_done": start_row + row_count,
                        "total_ok": total_ok,
                        "ts": datetime.now(timezone.utc).isoformat()
                    }
                    save_checkpoint(progress)
                    last_save = total_ok

        # Último batch
        if batch:
            ok, err = insert_batch(batch)
            total_ok += ok
            total_err += err

    elapsed = time.time() - start
    print(f"  ✅ {total_ok:,} inseridos, {total_err} erros | {elapsed:.1f}s            ")

    # Marca como concluído
    if progress is not None:
        progress[filename] = {
            "status": "done",
            "total": total_ok,
            "ts": datetime.now(timezone.utc).isoformat()
        }
        save_checkpoint(progress)

    return total_ok

# ─── Main ────────────────────────────────────────────────────────────────────

csv_files = sorted([f for f in os.listdir(DOWNLOADS) if f.endswith('.csv')])

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

# Carrega checkpoint local
progress = load_checkpoint()
done_count = sum(1 for v in progress.values() if v.get('status') == 'done')
partial_count = sum(1 for v in progress.values() if v.get('status') == 'partial')
print(f"✅ {done_count} concluídos | ⏸ {partial_count} parciais (checkpoint local)\n")

grand_total = 0
for fn in csv_files:
    info = progress.get(fn, {})
    status = info.get('status', 'pending')

    if status == 'done':
        print(f"  ⏭️  {fn} (já concluído — {info.get('total', 0):,} registros)")
        continue

    fp = os.path.join(DOWNLOADS, fn)
    start_row = info.get('rows_done', 0) if status == 'partial' else 0
    result = import_file(fp, start_row=start_row, progress=progress)
    if result is not None:
        grand_total += result

print(f"\n{'='*65}")
print(f"🏁 CONCLUÍDO: {grand_total:,} registros inseridos nesta sessão")
print(f"{'='*65}")
