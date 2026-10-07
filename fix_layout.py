# -*- coding: utf-8 -*-
import codecs

filepath = 'c:/Users/teran/Documents/App/AgroControlApp/agro-control/app/_layout.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    text = f.read()

if 'global.css' not in text:
    text = "import '../global.css';\n" + text

with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(text)
