with open(r'public/f1/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for idx, line in enumerate(lines):
    # Find all divs and closing tags on this line sequentially
    import re
    # We parse tag by tag
    pos = 0
    line_str = line.strip()
    # Simple regex to find <div or </div
    tokens = re.findall(r'</?div\b[^>]*>', line)
    for tok in tokens:
        if tok.startswith('</'):
            if stack:
                stack.pop()
        else:
            # extract id or class
            id_m = re.search(r'id=["\']([^"\']+)["\']', tok)
            class_m = re.search(r'class=["\']([^"\']+)["\']', tok)
            tag_info = {
                'line': idx + 1,
                'id': id_m.group(1) if id_m else None,
                'class': class_m.group(1) if class_m else None,
                'raw': tok[:60]
            }
            stack.append(tag_info)
    
    if 'id="settings-overlay"' in line:
        print("Ancestors of settings-overlay:")
        for ancestor in stack[:-1]: # exclude itself
            print(f"  Line {ancestor['line']}: ID={ancestor['id']}, Class={ancestor['class']}, Tag={ancestor['raw']}")
        break
