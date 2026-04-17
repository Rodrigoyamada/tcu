#!/usr/bin/env python3
"""
Diagnóstico completo: compara arquivos disponíveis vs registros no banco
"""
import urllib.request, json, os, subprocess

SUPABASE_URL = "https://yojodrqykuhytdemmrsr.supabase.co"
SUPABASE_KEY = "sb_publishable_-XDy8m1iTYXlf-hayQzgTQ_agv5OggW"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "count=exact",
    "Range": "0-0",
}

def count(endpoint, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}?{params}"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req) as r:
            cr = r.headers.get("Content-Range", "*/0")
            total = cr.split("/")[-1]
            return int(total) if total != "*" else 0
    except Exception as e:
        return f"ERR: {e}"

def get(endpoint, params=""):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}?{params}"
    h = {k: v for k, v in HEADERS.items() if k != "Prefer" and k != "Range"}
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

print("=" * 65)
print("DIAGNÓSTICO COMPLETO — BANCO vs ARQUIVOS")
print("=" * 65)

# 1. Estado atual do banco
total = count("jurisprudencia")
total_str = f"{total:,}" if isinstance(total, int) else str(total)
print(f"\n📊 TOTAL NO BANCO: {total_str}")

print("\n📁 POR TIPO:")
tipos = {
    'acordao': 'Acórdãos',
    'jurisprudencia_selecionada': 'Jurisprudência Selecionada',
    'sumula': 'Súmulas',
    'consulta': 'Consultas',
    'publicacao_boletim_jurisprudencia': 'Boletim Jurisprudência',
    'publicacao_boletim_pessoal': 'Boletim Pessoal',
}
for tipo, label in tipos.items():
    c = count("jurisprudencia", f"tipo=eq.{tipo}")
    status = "✅" if isinstance(c, int) and c > 0 else "❌"
    print(f"  {status} {label:<40} {c:>8,}" if isinstance(c, int) else f"  ❌ {label}: {c}")

# 2. Histórico de importações
print("\n📋 HISTÓRICO DE IMPORTAÇÕES:")
imps = get("importacoes", "select=nome_arquivo,status,total_linhas,inicio_em&order=inicio_em.desc&limit=20")
for imp in imps:
    s = imp.get("status", "?")
    icon = "✅" if s == "concluido" else "❌" if s == "erro" else "⏳"
    total_l = imp.get("total_linhas") or 0
    print(f"  {icon} {imp.get('nome_arquivo','?'):<45} {total_l:>8,}  ({imp.get('inicio_em','?')[:10]})")

# 3. Arquivos disponíveis em Downloads
print("\n📂 ARQUIVOS CSV EM DOWNLOADS:")
folder = "/Users/usuario/Downloads"
csv_files = sorted([f for f in os.listdir(folder) if f.endswith(".csv")])
imported_names = {imp.get("nome_arquivo", "") for imp in imps if imp.get("status") == "concluido"}

for fn in csv_files:
    fp = os.path.join(folder, fn)
    size_mb = os.path.getsize(fp) / 1024 / 1024
    is_imported = fn in imported_names
    icon = "✅" if is_imported else "⚠️"
    print(f"  {icon} {fn:<45} {size_mb:>8.1f} MB")

print(f"\n  Total arquivos: {len(csv_files)} | Importados: {len(imported_names)}")
print("=" * 65)

# 4. Verificar conteudo da última importação
print("\n🔍 AMOSTRA DOS DADOS MAIS RECENTES (3 registros):")
sample = get("jurisprudencia", "select=numero,tipo,ementa,conteudo&order=created_at.desc&limit=3")
for rec in sample:
    e = rec.get("ementa") or ""
    c = rec.get("conteudo") or ""
    print(f"\n  [{rec.get('tipo')}] {rec.get('numero','?')}")
    print(f"    ementa  ({len(e):,} chars): {e[:80]!r}")
    print(f"    conteudo({len(c):,} chars): {c[:80]!r}")
