#!/usr/bin/env python3
"""
Generate per-club OG share card images (1200x630 PNG).

Each card uses the club's primary color (c1) as the background,
secondary color (c2) for the crest circle, and includes:
  - Club initials in a crest circle
  - Club name
  - "Fan Passport" branding
  - "Find your club" tagline

Usage:
  python3 scripts/generate-og-cards.py

Output:
  og/ directory with <club-id>.png for each club
"""

import json
import math
import os
import re
import textwrap

from PIL import Image, ImageDraw, ImageFont

# ── Paths ──
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.dirname(HERE)
CLUBS_PATH = os.path.join(PROJECT, "clubs.json")
OUT_DIR = os.path.join(PROJECT, "og")

W, H = 1200, 630

# Font paths — use system fonts that are broadly available on macOS
FONT_SERIF_BOLD = "/System/Library/Fonts/Supplemental/Georgia Bold.ttf"
FONT_SERIF = "/System/Library/Fonts/Supplemental/Georgia.ttf"
FONT_MONO = "/System/Library/Fonts/Menlo.ttc"
FONT_MONO_BOLD = "/System/Library/Fonts/Menlo.ttc"
FONT_SANS = "/System/Library/Fonts/Helvetica.ttc"


def load_font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def club_initials(name):
    """Extract 2-3 letter initials from club name."""
    cleaned = re.sub(
        r"\b(?:FC|CF|SSC|AC|AS|SC|BC|SS|Ligue\s+1|Liga\s+MX|MLS)\b", "", name
    ).strip()
    words = cleaned.split()
    words = [w for w in words if len(w) > 1 or w == w.upper()]
    if len(words) >= 2:
        return (words[0][0] + words[1][0]).upper()
    return name[:2].upper()


def hex_to_rgb(hex_color):
    """Convert #RRGGBB to (R, G, B) tuple."""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def luminance(rgb):
    """Relative luminance for contrast decisions."""
    r, g, b = [c / 255 for c in rgb]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def lighten(rgb, amount=0.15):
    """Lighten a color toward white."""
    return tuple(min(255, int(c + (255 - c) * amount)) for c in rgb)


def darken(rgb, amount=0.15):
    """Darken a color toward black."""
    return tuple(max(0, int(c * (1 - amount))) for c in rgb)


def generate_card(club):
    c1 = hex_to_rgb(club["c1"])
    c2 = hex_to_rgb(club["c2"])
    initials = club_initials(club["name"])

    img = Image.new("RGB", (W, H), c1)
    draw = ImageDraw.Draw(img)

    # Subtle diagonal stripe pattern using c2
    stripe_color = darken(c1, 0.12)
    for x in range(-H, W, 80):
        draw.polygon(
            [(x, 0), (x + 40, 0), (x + 40 - H, H), (x - H, H)],
            fill=stripe_color,
        )

    # Left panel: crest circle with initials
    crest_r = 110
    cx, cy = 230, H // 2
    # Outer ring
    draw.ellipse(
        [
            cx - crest_r - 8,
            cy - crest_r - 8,
            cx + crest_r + 8,
            cy + crest_r + 8,
        ],
        fill=c2,
    )
    # Inner circle
    inner_r = crest_r - 6
    draw.ellipse(
        [cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r],
        fill=lighten(c2, 0.08) if luminance(c2) < 0.5 else darken(c2, 0.08),
    )

    # Initials text
    font_init = load_font(FONT_SERIF_BOLD, 72)
    text_color = (255, 255, 255) if luminance(c2) < 0.6 else (30, 30, 30)
    bbox = draw.textbbox((0, 0), initials, font=font_init)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text((cx - tw // 2, cy - th // 2 - 6), initials, font=font_init, fill=text_color)

    # Right side: text content
    text_x = 430
    text_color_main = (255, 255, 255) if luminance(c1) < 0.6 else (30, 30, 30)
    text_color_sub = lighten(text_color_main, 0.3) if luminance(c1) < 0.6 else darken(text_color_main, 0.3)

    # "FAN PASSPORT" brand at top
    font_brand = load_font(FONT_MONO_BOLD, 22)
    draw.text((text_x, 80), "FAN PASSPORT", font=font_brand, fill=text_color_main)

    # Club name (large serif)
    font_name = load_font(FONT_SERIF_BOLD, 64)
    name = club["name"]
    # Truncate if too long
    bbox = draw.textbbox((0, 0), name, font=font_name)
    name_w = bbox[2] - bbox[0]
    if name_w > 720:
        font_name = load_font(FONT_SERIF_BOLD, 50)
        bbox = draw.textbbox((0, 0), name, font=font_name)
        name_w = bbox[2] - bbox[0]
    draw.text((text_x, 180), name, font=font_name, fill=text_color_main)

    # Nickname + league
    font_sub = load_font(FONT_MONO, 18)
    sub_text = f"{club['nick']} · {club['league']}, {club['country']}"
    draw.text((text_x, 260), sub_text, font=font_sub, fill=text_color_sub)

    # Divider line
    draw.line([(text_x, 310), (text_x + 520, 310)], fill=text_color_sub, width=2)

    # Tagline
    font_tag = load_font(FONT_SERIF, 28)
    draw.text((text_x, 340), "Your club is waiting to stamp you in.", font=font_tag, fill=text_color_main)

    # URL at bottom
    font_url = load_font(FONT_MONO, 16)
    draw.text((text_x, H - 70), "fanpassport.app", font=font_url, fill=text_color_sub)

    return img


def main():
    with open(CLUBS_PATH) as f:
        clubs = json.load(f)

    os.makedirs(OUT_DIR, exist_ok=True)

    for club in clubs:
        img = generate_card(club)
        out_path = os.path.join(OUT_DIR, f"{club['id']}.png")
        img.save(out_path, "PNG")

    print(f"Generated {len(clubs)} OG card images in {OUT_DIR}/")


if __name__ == "__main__":
    main()