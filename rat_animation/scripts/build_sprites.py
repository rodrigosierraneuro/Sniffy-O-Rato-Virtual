#!/usr/bin/env python3
"""
Sprite Sheet Generator for Sniffy the Virtual Rat
Packs individual PNG frames into sprite sheets with 2x upscaling + sharpening.
"""

import os
import json
from PIL import Image, ImageFilter
import cv2
import numpy as np

# ─── Configuration ────────────────────────────────────────────────────────────

SRC_DIR   = os.path.join(os.path.dirname(__file__), '../../rat_images/png')
OUT_DIR   = os.path.join(os.path.dirname(__file__), '../sprites')
SCALE     = 2           # upscale factor (1 = no upscale, 2 = 2x)
MAX_SHEET = 4096        # max sprite sheet width (GPU safe)
MAX_FRAME_AREA = 50000  # skip corrupt full-screen frames (510x330 = 168k)

# Frame rate per behavior group
FPS_TABLE = {
    'walk':       8,
    'run':        12,
    'trot':       12,
    'groom':      4,
    'sniff':      6,
    'drink':      6,
    'eat':        6,
    'lever_press':8,
    'rear':       4,
    'explore':    6,
    'turn':       10,
    'freeze':     1,
    'misc':       8,
    'small':      8,
    'head_move':  8,
    'pellet':     4,
    'lever':      8,
    'background': 1,
    'ui':         1,
    'main_screen':1,
}

LOOP_TABLE = {
    'lever_press': False,
    'rear_up':     False,
    'turn':        False,
    'freeze':      False,
    'drink':       False,
    'eat':         False,
}


def get_fps(group_name):
    name = group_name.lstrip('10')
    for key, fps in FPS_TABLE.items():
        if name.startswith(key):
            return fps
    return 8


def get_loop(group_name):
    name = group_name.lstrip('10')
    for key, val in LOOP_TABLE.items():
        if name.startswith(key):
            return val
    return True


def enhance_frame(img, scale):
    """2x LANCZOS upscale + unsharp mask for crisper edges. Alpha upscaled with NEAREST."""
    if scale == 1:
        return img

    w, h = img.size
    new_size = (w * scale, h * scale)

    # Split alpha
    if img.mode == 'RGBA':
        rgb = img.convert('RGB')
        alpha = img.split()[3]
    else:
        rgb = img.convert('RGB')
        alpha = None

    # Upscale RGB with LANCZOS
    rgb_up = rgb.resize(new_size, Image.LANCZOS)

    # Unsharp mask via OpenCV (sharpen without halos)
    arr = np.array(rgb_up, dtype=np.uint8)
    blurred = cv2.GaussianBlur(arr, (0, 0), sigmaX=0.8)
    sharpened = cv2.addWeighted(arr, 1.4, blurred, -0.4, 0)
    rgb_sharp = Image.fromarray(sharpened.astype(np.uint8))

    # Upscale alpha with NEAREST (hard edges preserved)
    if alpha is not None:
        alpha_up = alpha.resize(new_size, Image.NEAREST)
        result = rgb_sharp.copy()
        result.putalpha(alpha_up)
    else:
        result = rgb_sharp

    return result


def build_group(group_name, frames_dir):
    """Build a sprite sheet for one behavior group."""
    files = sorted(f for f in os.listdir(frames_dir) if f.endswith('.png'))
    if not files:
        return None

    # Load and filter frames
    images = []
    for fname in files:
        img = Image.open(os.path.join(frames_dir, fname)).convert('RGBA')
        w, h = img.size
        if w * h > MAX_FRAME_AREA:
            print(f"  Skipping corrupt frame {fname} ({w}x{h})")
            continue
        images.append((fname, img))

    if not images:
        return None

    # Enhance frames
    enhanced = []
    for fname, img in images:
        enhanced.append((fname, enhance_frame(img, SCALE)))

    # Cell dimensions: max of all enhanced frames
    cell_w = max(img.width  for _, img in enhanced)
    cell_h = max(img.height for _, img in enhanced)

    # Check sheet width fits in MAX_SHEET
    n = len(enhanced)
    sheet_w = cell_w * n
    if sheet_w > MAX_SHEET:
        # Use multiple rows
        cols = MAX_SHEET // cell_w
        rows = (n + cols - 1) // cols
    else:
        cols = n
        rows = 1

    sheet_w = cell_w * cols
    sheet_h = cell_h * rows
    sheet = Image.new('RGBA', (sheet_w, sheet_h), (0, 0, 0, 0))

    frame_data = []
    for i, (fname, img) in enumerate(enhanced):
        col = i % cols
        row = i // cols
        # Bottom-center align within cell (ground reference = bottom of cell)
        px = col * cell_w + (cell_w - img.width) // 2
        py = row * cell_h + (cell_h - img.height)   # bottom-align
        sheet.paste(img, (px, py), img)

        frame_data.append({
            'index':    i,
            'file':     fname,
            'srcX':     col * cell_w,
            'srcY':     row * cell_h,
            'cellW':    cell_w,
            'cellH':    cell_h,
            'contentW': img.width,
            'contentH': img.height,
            'offsetX':  (cell_w - img.width) // 2,
            'offsetY':  cell_h - img.height,
        })

    fps  = get_fps(group_name)
    loop = get_loop(group_name)

    metadata = {
        'name':        group_name,
        'frameCount':  n,
        'cols':        cols,
        'rows':        rows,
        'cellWidth':   cell_w,
        'cellHeight':  cell_h,
        'sheetWidth':  sheet_w,
        'sheetHeight': sheet_h,
        'fps':         fps,
        'loop':        loop,
        'scale':       SCALE,
        'anchor':      'bottom-center',
        'frames':      frame_data,
    }

    return sheet, metadata


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    groups = sorted(os.listdir(SRC_DIR))
    skip = {'bmp'}
    groups = [g for g in groups if os.path.isdir(os.path.join(SRC_DIR, g)) and g not in skip]

    manifest = {}

    for group in groups:
        group_dir = os.path.join(SRC_DIR, group)
        print(f"Processing: {group}...")

        result = build_group(group, group_dir)
        if result is None:
            print(f"  Skipped (no valid frames)")
            continue

        sheet, meta = result
        out_png  = os.path.join(OUT_DIR, f'{group}.png')
        out_json = os.path.join(OUT_DIR, f'{group}.json')

        sheet.save(out_png, optimize=True)
        with open(out_json, 'w') as f:
            json.dump(meta, f, indent=2)

        manifest[group] = {
            'png':        f'{group}.png',
            'json':       f'{group}.json',
            'frameCount': meta['frameCount'],
            'fps':        meta['fps'],
            'loop':       meta['loop'],
        }
        print(f"  {meta['frameCount']} frames → {meta['cellWidth']}x{meta['cellHeight']}px cells, sheet {meta['sheetWidth']}x{meta['sheetHeight']}px")

    manifest_path = os.path.join(OUT_DIR, 'manifest.json')
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"\nDone! {len(manifest)} sprite sheets → {OUT_DIR}")
    print(f"Manifest: {manifest_path}")


if __name__ == '__main__':
    main()
