import csv

csv.field_size_limit(10_000_000)

# Testar exatamente como o PapaParse vai receber: lendo 4MB de bytes, decodificando como ISO-8859-1
with open('/Users/usuario/Downloads/acordao-completo-2023.csv', 'rb') as f:
    raw = f.read(4 * 1024 * 1024)  # 4MB

text = raw.decode('iso-8859-1')

print(f"Texto decodificado: {len(text)} chars")
print()

# Quantas linhas físicas (\\n) existem em 4MB?
lines = text.split('\n')
print(f"Linhas físicas em 4MB: {len(lines)}")
print(f"Tamanho da linha 0 (header): {len(lines[0])} chars")
print(f"Tamanho da linha 1: {len(lines[1])} chars")
print()

# Agora simular o que meu parseCSVPreview faria (estado, char a char)
# Usar Python csv reader na string
import io
reader = csv.reader(io.StringIO(text), delimiter='|', quotechar='"')
count = 0
for row in reader:
    print(f"Linha {count}: {len(row)} campos | col0={row[0][:30]!r}" if row else f"Linha {count}: VAZIA")
    count += 1
    if count > 5:
        break

print()
print("=== Conclusão ===")
print(f"4MB contém {count-1} registros completos parseavéis")
