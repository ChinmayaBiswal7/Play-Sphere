import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'public/f1/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
counting = False
open_divs = 0
for idx, line in enumerate(lines):
    if 'id="hud-layer"' in line:
        counting = True
        open_divs = 0
    if counting:
        opens = line.count('<div')
        closes = line.count('</div')
        open_divs += opens - closes
        clean_line = line.strip().encode('ascii', 'ignore').decode('ascii')
        if open_divs <= 0:
            print(f'hud-layer ends at line {idx+1}: {clean_line}')
            break
