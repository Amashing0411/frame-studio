#!/usr/bin/env bash
# Downloads (if missing), extracts and converts the itch.io PSX packs into qa/asset-src/itch/glb (gitignored), then
# tools/build-psx.mjs builds the catalog models from there. Needs Python, 7-Zip, Blender 5 and the dev server running.
#   bash tools/convert-itch.sh            then: node tools/build-psx.mjs && node tools/build-manifest.mjs
cd "$(dirname "$0")/.." || exit 1
ITCH=qa/asset-src/itch
BLENDER="${BLENDER:-/c/Program Files/Blender Foundation/Blender 5.2/blender.exe}"
ZIP="${ZIP:-/c/Program Files/7-Zip/7z.exe}"
for pair in elegantcrow:retro-skyscraper-pack ggbot:psx-style-cars elbolilloduro:buildings elbolilloduro:trees-psx elbolilloduro:objetos-low-poly-estilo-psx; do
  a=${pair%%:*}; g=${pair#*:}
  if [ ! -d "$ITCH/$g" ]; then python -I tools/fetch-itch.py "$a" "$g" "$ITCH/$g"; sleep 20; fi
done
# every archive into x/<name>/
for f in "$ITCH"/*/*; do [ -f "$f" ] || continue; d="${f%/*}/x/$(basename "${f%.*}")"; [ -d "$d" ] || { mkdir -p "$d"; "$ZIP" x -y -o"$d" "$f" >/dev/null; }; done
mkdir -p "$ITCH/glb"
# FBX / OBJ / GLB through Blender (the cars as OBJ: their .blend files reference textures by absolute path)
mapfile -t F < <(find "$PWD/$ITCH" -path '*/x/*' -type f \( -iname '*.fbx' -o -iname '*.obj' -o -iname '*.glb' \) | grep -v -i 'Shadow\|/Wheel/')
W=(); for f in "${F[@]}"; do W+=("$(cygpath -w "$f")"); done
"$BLENDER" -b --factory-startup -P "$(cygpath -w tools/blender/convert_itch.py)" -- "$(cygpath -w "$PWD/$ITCH/glb")" "${W[@]}" 2>&1 | grep '^INV' > "$ITCH/inventory.jsonl"
# Collada through three's ColladaLoader (Blender 5 has no Collada importer)
mapfile -t D < <(find "$(cygpath -m "$PWD/$ITCH")" -path '*/x/*' -type f -iname '*.dae' | grep -v 'Buildings/Buildings/Models\|Trees/Trees\|Personajes terror')
node tools/itch-dae2glb.mjs "$(cygpath -m "$PWD/$ITCH/glb")" "${D[@]}" | grep '^INV' >> "$ITCH/inventory.jsonl"
echo "converted: $(grep -vc error "$ITCH/inventory.jsonl") files, errors: $(grep -c error "$ITCH/inventory.jsonl")"
