#!/usr/bin/env python3
"""
Türkiye arazi verisini hazırlar. Bir kez çalıştırılır; çıktılar repoya dahildir.

Girdiler (scripts/.cache altına):
  earth-bump-10800.jpg      10800x5400 eşdikdörtgen kabartma/yükselti haritası
                            https://raw.githubusercontent.com/franky-adl/threejs-earth/main/src/assets/Bump.jpg
  package/countries-10m.json, package/land-10m.json
                            Natural Earth 1:10m (npm pack world-atlas@2.0.2)

Çıktılar:
  public/data/terrain.png   R = yükselti (0-255), G = Türkiye maskesi, B = kara maskesi
  public/data/contours.bin  eş-yükselti çizgileri + kıyı/sınır çizgileri (bkz. components/canvas/terrain/data.ts)
  lib/terrain-meta.json     coğrafi sınırlar ve ölçek

Kullanım:  python3 scripts/prepare-terrain.py
Gereken paketler: pillow, numpy, scipy, scikit-image
"""
import json
import os
import struct

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter
from skimage.measure import approximate_polygon, find_contours

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "scripts", ".cache")

# Bölge: Türkiye + küçük pay (boylam 25.66–44.83, enlem 35.81–42.11)
LON0, LON1 = 25.0, 45.4
LAT0, LAT1 = 35.3, 42.5
OUT_W = 1024
OUT_H = round(OUT_W * (LAT1 - LAT0) / (LON1 - LON0))  # eşdikdörtgen piksel oranı korunur

LEVELS = [0.06, 0.14, 0.23, 0.32, 0.42, 0.53, 0.66, 0.80]
TURKEY_ID = "792"


def lonlat_to_px(lon, lat):
    x = (lon - LON0) / (LON1 - LON0) * OUT_W
    y = (LAT1 - lat) / (LAT1 - LAT0) * OUT_H
    return x, y


def decode_topology(path):
    with open(path, encoding="utf-8") as f:
        topo = json.load(f)
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    return topo, arcs


def ring_coords(ring, arcs):
    out = []
    for idx in ring:
        pts = arcs[idx] if idx >= 0 else list(reversed(arcs[~idx]))
        if out:
            pts = pts[1:]
        out.extend(pts)
    return out


def geometry_polygons(geom, arcs):
    if geom["type"] == "Polygon":
        return [[ring_coords(r, arcs) for r in geom["arcs"]]]
    if geom["type"] == "MultiPolygon":
        return [[ring_coords(r, arcs) for r in poly] for poly in geom["arcs"]]
    return []


def rasterize(polygons, scale=4):
    """Çokgenleri yüksek çözünürlükte çizip küçülterek yumuşak kenarlı maske üretir."""
    img = Image.new("L", (OUT_W * scale, OUT_H * scale), 0)
    draw = ImageDraw.Draw(img)
    for poly in polygons:
        for i, ring in enumerate(poly):
            pts = [lonlat_to_px(lon, lat) for lon, lat in ring]
            pts = [(x * scale, y * scale) for x, y in pts]
            if len(pts) >= 3:
                draw.polygon(pts, fill=255 if i == 0 else 0)
    return np.asarray(img.resize((OUT_W, OUT_H), Image.LANCZOS)).astype(np.float32) / 255.0


def chaikin(pts, iterations=2):
    """Köşeleri yumuşatır (Chaikin): yakın plandan bakınca çizgiler kırık görünmesin."""
    arr = np.asarray(pts, dtype=np.float64)
    for _ in range(iterations):
        if len(arr) < 3:
            break
        closed = np.allclose(arr[0], arr[-1])
        a, b = arr[:-1], arr[1:]
        q = 0.75 * a + 0.25 * b
        r = 0.25 * a + 0.75 * b
        out = np.empty((len(q) * 2, 2))
        out[0::2], out[1::2] = q, r
        if closed:
            out = np.vstack([out, out[:1]])
        else:
            out = np.vstack([arr[:1], out, arr[-1:]])
        arr = out
    return arr


def main():
    os.makedirs(os.path.join(ROOT, "public", "data"), exist_ok=True)

    # --- Yükselti -------------------------------------------------------
    bump = Image.open(os.path.join(CACHE, "earth-bump-10800.jpg")).convert("L")
    W, H = bump.size
    box = (
        (LON0 + 180) / 360 * W,
        (90 - LAT1) / 180 * H,
        (LON1 + 180) / 360 * W,
        (90 - LAT0) / 180 * H,
    )
    crop = bump.resize((OUT_W, OUT_H), Image.BICUBIC, box=box)
    h = np.asarray(crop).astype(np.float32)
    h = gaussian_filter(h, 0.7)  # JPEG bloklarını yumuşat

    # --- Maskeler -------------------------------------------------------
    topo_c, arcs_c = decode_topology(os.path.join(CACHE, "package", "countries-10m.json"))
    turkey_polys = []
    for g in topo_c["objects"]["countries"]["geometries"]:
        if str(g.get("id")) == TURKEY_ID:
            turkey_polys = geometry_polygons(g, arcs_c)
    assert turkey_polys, "Türkiye geometrisi bulunamadı"
    turkey = rasterize(turkey_polys)

    topo_l, arcs_l = decode_topology(os.path.join(CACHE, "package", "land-10m.json"))
    land_polys = []
    for g in topo_l["objects"]["land"]["geometries"]:
        land_polys.extend(geometry_polygons(g, arcs_l))
    land = rasterize(land_polys)

    # Deniz seviyesi: denizdeki ortalama parlaklık
    sea = h[land < 0.05]
    sea_level = float(np.percentile(sea, 60)) if sea.size else float(h.min())
    top = float(np.percentile(h[land > 0.5], 99.97))
    hn = np.clip((h - sea_level) / (top - sea_level), 0.0, 1.0)
    hn *= np.clip(land * 1.5, 0.0, 1.0)  # denizi sıfırla, kıyıda yumuşak geçiş
    hn = np.power(hn, 0.85)  # alçak ovaları biraz kaldır

    rgba = np.zeros((OUT_H, OUT_W, 4), dtype=np.uint8)
    rgba[..., 0] = np.round(hn * 255)
    rgba[..., 1] = np.round(turkey * 255)
    rgba[..., 2] = np.round(land * 255)
    rgba[..., 3] = 255
    Image.fromarray(rgba, "RGBA").save(os.path.join(ROOT, "public", "data", "terrain.png"), optimize=True)

    # --- Çizgiler -------------------------------------------------------
    lines = []  # (level_index, [(u, v), ...])
    # Eş-yükselti çizgileri yalnızca Türkiye içinde (komşular parçacıklarla soluk gösterilir)
    tr_region = gaussian_filter((turkey > 0.5).astype(np.float32), 2.0) > 0.2
    smooth = gaussian_filter(hn, 1.6) * tr_region
    for li, level in enumerate(LEVELS):
        for c in find_contours(smooth, level):
            c = approximate_polygon(c, tolerance=0.8)
            span = np.ptp(c, axis=0)
            if len(c) < 5 or (span[0] + span[1]) < 14:
                continue
            c = chaikin(c, 2)
            lines.append((li, [(p[1] / (OUT_W - 1), p[0] / (OUT_H - 1)) for p in c]))

    def clip_runs(pts):
        """Bölge dışındaki noktalarda çizgiyi böler (kenara yapışan sahte çizgi oluşmasın)."""
        run, out = [], []
        for x, y in pts:
            inside = -1 <= x <= OUT_W and -1 <= y <= OUT_H
            if inside:
                run.append((y, x))
            elif run:
                out.append(run)
                run = []
        if run:
            out.append(run)
        return out

    def add_rings(polys, code, min_pts, tol):
        for poly in polys:
            for ring in poly:
                pts = [lonlat_to_px(lon, lat) for lon, lat in ring]
                for run in clip_runs(pts):
                    if len(run) < 2:
                        continue
                    arr = approximate_polygon(np.array(run), tolerance=tol)
                    span = np.ptp(arr, axis=0)
                    if len(arr) < min_pts or (span[0] + span[1]) < 6:
                        continue
                    arr = chaikin(arr, 1)
                    lines.append((code, [(p[1] / (OUT_W - 1), p[0] / (OUT_H - 1)) for p in arr]))

    add_rings(land_polys, 254, 3, 0.5)    # tüm kıyılar
    add_rings(turkey_polys, 255, 3, 0.3)  # Türkiye sınırı + kıyısı

    buf = bytearray()
    buf += struct.pack("<I", len(lines))
    total = 0
    for code, pts in lines:
        buf += struct.pack("<HHI", code, 0, len(pts))
        for u, v in pts:
            qu = int(round(min(max((u + 0.02) / 1.04, 0.0), 1.0) * 65535))
            qv = int(round(min(max((v + 0.02) / 1.04, 0.0), 1.0) * 65535))
            buf += struct.pack("<HH", qu, qv)
        total += len(pts)
    with open(os.path.join(ROOT, "public", "data", "contours.bin"), "wb") as f:
        f.write(buf)

    meta = {
        "lon0": LON0, "lon1": LON1, "lat0": LAT0, "lat1": LAT1,
        "width": OUT_W, "height": OUT_H,
        "levels": LEVELS,
        "uvPad": 0.02,
        "peakMeters": 5137,
    }
    with open(os.path.join(ROOT, "lib", "terrain-meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"terrain.png {OUT_W}x{OUT_H}, çizgi: {len(lines)}, nokta: {total}, contours.bin {len(buf)/1024:.0f} KB")
    print(f"deniz seviyesi {sea_level:.1f}, tepe {top:.1f}")


if __name__ == "__main__":
    main()
