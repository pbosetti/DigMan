#!/bin/sh
# Regenerate the SVG figures in images-1/ from the sources in this folder.
# Requires graphviz (dot), a TeX distribution with TikZ, standalone and dvisvgm
# (e.g. TinyTeX + `tlmgr install dvisvgm standalone`), and python3 (stdlib only).
# Usage: ./build.sh [name ...]   (no arguments: rebuild everything)
set -e
cd "$(dirname "$0")"
want() { [ $# -eq 0 ] && return 0; return 1; }
targets="$*"
build() {  # build <source file>
  f=$1; n=${f%.*}
  case "$f" in
    *.dot) dot -Tsvg "$f" -o "../$n.svg" ;;
    *.py)  python3 "$f" ;;
    *.tex)
      tmp=$(mktemp -d)
      latex -interaction=nonstopmode -halt-on-error -output-directory="$tmp" "$f" >"$tmp/log.txt" 2>&1 \
        || { grep -A4 "^!" "$tmp/log.txt"; exit 1; }
      dvisvgm --no-fonts --exact-bbox --verbosity=1 "$tmp/$n.dvi" -o "../$n.svg"
      rm -rf "$tmp" ;;
  esac
  echo "built $n"
}
for f in *.dot *.py *.tex; do
  case "$f" in svgkit.py|preamble.tex|*-common.tex|*-common2.tex) continue ;; esac
  n=${f%.*}
  if [ -z "$targets" ] || echo " $targets " | grep -q " $n "; then build "$f"; fi
done
