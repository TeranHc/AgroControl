# -*- coding: utf-8 -*-
import codecs
filepath = 'c:/Users/teran/Documents/App/AgroControlApp/agro-control/app/(tabs)/index.tsx'
with codecs.open(filepath, 'r', 'utf-8') as f:
    text = f.read()

text = text.replace('const { activeFinca, loading: loadingFincas } = useActiveFinca();', 'const { activeFinca, loadingFincas } = useActiveFinca();')
text = text.replace('import { supabase } from', 'import { useRouter } from "expo-router";\nimport { supabase } from')

if 'const router = useRouter();' not in text:
    text = text.replace('const [refreshing, setRefreshing]', 'const router = useRouter();\n  const [refreshing, setRefreshing]')


with codecs.open(filepath, 'w', 'utf-8') as f:
    f.write(text)
