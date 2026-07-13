import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'public/f1/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if 'id="settings-overlay"' in line:
        # Trace backwards to find open divs
        print(f"settings-overlay is at line {idx+1}")
        open_tags = []
        for back_idx in range(idx - 1, -1, -1):
            l = lines[back_idx]
            if '<div' in l:
                # Find all id/class
                import re
                m = re.search(r'<div\s+([^>]+)>', l)
                if m:
                    attrs = m.group(1)
                    # count how many times it was closed in the range [back_idx, idx]
                    # very simplified tag matching
                    # let's just print the tag
                    print(f"Parent candidate line {back_idx+1}: {l.strip()[:100]}")
        break
