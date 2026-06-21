#!/usr/bin/env bash
# Hook PostToolUse : après l'édition d'un fichier .ts/.tsx, lance `tsc --noEmit`.
# Si la compilation échoue, renvoie les erreurs à Claude (exit 2) pour correction
# immédiate. Sinon silencieux (exit 0) — aucun token consommé.
payload=$(cat)
file=$(printf '%s' "$payload" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch(e){process.stdout.write("")}})')

case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;; # édition non-TypeScript : rien à vérifier
esac

out=$(npx tsc --noEmit 2>&1)
if [ $? -ne 0 ]; then
  printf 'tsc --noEmit a échoué (après édition de %s) :\n%s\n' "$file" "$out" >&2
  exit 2
fi
exit 0
