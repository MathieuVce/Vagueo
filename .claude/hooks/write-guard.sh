#!/usr/bin/env bash
# Hook PreToolUse (Write) : empêche de réécrire intégralement un fichier existant
# de plus de 30 lignes. On privilégie Edit/MultiEdit (diff ciblé) pour économiser
# des tokens et garder des diffs lisibles.
#   - fichier inexistant (création)      -> autorisé
#   - fichier existant <= 30 lignes      -> autorisé
#   - fichier existant  > 30 lignes      -> bloqué (exit 2), message renvoyé à Claude
payload=$(cat)
file=$(printf '%s' "$payload" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch(e){process.stdout.write("")}})')

[ -z "$file" ] && exit 0
[ ! -f "$file" ] && exit 0   # nouveau fichier : la création par Write est légitime

lines=$(wc -l < "$file" 2>/dev/null | tr -d ' ')
if [ "${lines:-0}" -gt 30 ]; then
  printf 'Write refusé : %s existe déjà (%s lignes). Utilise Edit/MultiEdit pour un diff ciblé au lieu de réécrire tout le fichier (tokens + lisibilité). Réécriture complète réellement voulue ? procède par éditions successives ou demande confirmation à l'\''utilisateur.\n' "$file" "$lines" >&2
  exit 2
fi
exit 0
