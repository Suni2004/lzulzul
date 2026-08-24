"""Generates the app icon set for Napirend.

Run with:  python3 tools/make-icons.py
Requires:  pip install Pillow
"""

from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

INDIGO = (79, 70, 229)
VIOLET = (124, 58, 237)
CORAL = (251, 113, 133)
WHITE = (255, 255, 255)

SS = 4  # supersampling factor for smooth edges


def gradient(size, top, bottom):
    img = Image.new("RGB", (1, size), top)
    px = img.load()
    for y in range(size):
        t = y / max(size - 1, 1)
        px[0, y] = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom))
    return img.resize((size, size), Image.BILINEAR)


def rounded_mask(size, radius):
    m = Image.new("L", (size * SS, size * SS), 0)
    ImageDraw.Draw(m).rounded_rectangle(
        (0, 0, size * SS - 1, size * SS - 1), radius=radius * SS, fill=255
    )
    return m.resize((size, size), Image.LANCZOS)


def calendar_glyph(size, body=WHITE, header=CORAL, dot_dim=None, dot_hot=None):
    """Draws the calendar mark on a transparent canvas of `size` x `size`."""
    dot_dim = dot_dim or (*INDIGO, 90)
    dot_hot = dot_hot or (*CORAL, 255)

    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Body of the calendar sheet.
    pad_x = round(s * 0.06)
    top = round(s * 0.14)
    bottom = s - round(s * 0.06)
    radius = round(s * 0.11)
    d.rounded_rectangle((pad_x, top, s - pad_x, bottom), radius=radius, fill=(*body, 255))

    # Coloured header band, squared off along its bottom edge.
    band = top + round(s * 0.20)
    d.rounded_rectangle((pad_x, top, s - pad_x, band), radius=radius, fill=(*header, 255))
    d.rectangle((pad_x, band - radius, s - pad_x, band), fill=(*header, 255))

    # The two binder rings poking out above the sheet.
    ring_w = round(s * 0.055)
    ring_h = round(s * 0.16)
    ring_y = round(s * 0.045)
    for cx in (round(s * 0.33), round(s * 0.67)):
        d.rounded_rectangle(
            (cx - ring_w // 2, ring_y, cx + ring_w // 2, ring_y + ring_h),
            radius=ring_w // 2,
            fill=(*body, 255),
        )

    # Grid of day dots, with today highlighted.
    cols, rows = 4, 3
    grid_top = band + round(s * 0.11)
    grid_bottom = bottom - round(s * 0.10)
    grid_left = pad_x + round(s * 0.11)
    grid_right = s - pad_x - round(s * 0.11)
    dot_r = round(s * 0.042)
    step_x = (grid_right - grid_left) / (cols - 1)
    step_y = (grid_bottom - grid_top) / (rows - 1)
    for r in range(rows):
        for c in range(cols):
            cx = grid_left + step_x * c
            cy = grid_top + step_y * r
            hot = (r, c) == (1, 2)
            rr = dot_r * 1.55 if hot else dot_r
            d.ellipse((cx - rr, cy - rr, cx + rr, cy + rr), fill=dot_hot if hot else dot_dim)

    return img.resize((size, size), Image.LANCZOS)


def save(img, name):
    path = os.path.join(OUT, name)
    img.save(path)
    print(f"  {name}  {img.size[0]}x{img.size[1]}")


def main():
    os.makedirs(OUT, exist_ok=True)
    print("writing icons to", OUT)

    # icon.png — full bleed, used for iOS and as the generic fallback.
    size = 1024
    bg = gradient(size, INDIGO, VIOLET).convert("RGBA")
    glyph_size = round(size * 0.56)
    glyph = calendar_glyph(glyph_size)
    bg.paste(glyph, ((size - glyph_size) // 2, (size - glyph_size) // 2), glyph)
    # iOS masks the icon itself, so ship a full-bleed square with no rounding
    # and no transparency — rounded corners here would bake in dark edges.
    icon = bg.convert("RGB")
    save(icon, "icon.png")

    # Android adaptive icon: separate background and foreground layers. The
    # foreground has to stay inside the centre 66% or the launcher crops it.
    save(gradient(size, INDIGO, VIOLET), "android-icon-background.png")

    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    fg_glyph_size = round(size * 0.42)
    fg_glyph = calendar_glyph(fg_glyph_size)
    fg.paste(fg_glyph, ((size - fg_glyph_size) // 2, (size - fg_glyph_size) // 2), fg_glyph)
    save(fg, "android-icon-foreground.png")

    # Monochrome layer for themed icons: flat white silhouette.
    mono = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mono_glyph = calendar_glyph(
        fg_glyph_size, body=WHITE, header=WHITE, dot_dim=(0, 0, 0, 0), dot_hot=(0, 0, 0, 0)
    )
    mono.paste(mono_glyph, ((size - fg_glyph_size) // 2, (size - fg_glyph_size) // 2), mono_glyph)
    save(mono, "android-icon-monochrome.png")

    # Splash mark sits on the themed splash background, so keep it transparent.
    splash = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sp_size = round(size * 0.52)
    sp_glyph = calendar_glyph(sp_size)
    splash.paste(sp_glyph, ((size - sp_size) // 2, (size - sp_size) // 2), sp_glyph)
    save(splash, "splash-icon.png")

    # Android status-bar notification icon: pure white silhouette on
    # transparency at 96x96, which is what expo-notifications expects.
    notif = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    nt_size = round(size * 0.78)
    nt_glyph = calendar_glyph(
        nt_size, body=WHITE, header=WHITE, dot_dim=(0, 0, 0, 0), dot_hot=(0, 0, 0, 0)
    )
    notif.paste(nt_glyph, ((size - nt_size) // 2, (size - nt_size) // 2), nt_glyph)
    save(notif.resize((96, 96), Image.LANCZOS), "notification-icon.png")

    # The favicon is shown unmasked in browser tabs, so round it ourselves.
    fav = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    fav.paste(bg, (0, 0), rounded_mask(size, round(size * 0.22)))
    save(fav.resize((48, 48), Image.LANCZOS), "favicon.png")


if __name__ == "__main__":
    main()
