#!/usr/bin/env python3
"""
Lazo — gráficos de rentabilidad (proyecto/07-plan-de-negocio)
=============================================================

Genera SVGs en graficos/ a partir de modelo-v2.py (mismas funciones, mismos
supuestos). Solo librería estándar. Correr: python3 graficos.py

Todo es escenario con supuestos declarados, no una proyección garantizada.
"""

import importlib.util
from dataclasses import replace
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("modelo", HERE / "modelo-v2.py")
m = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(m)

OUT = HERE / "graficos"

FONT = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"
INK, MUTED, GRID = "#1d1b2e", "#6b6880", "#e6e4ef"
PURPLE, GREEN, BLUE, RED, ORANGE, GREY = "#7c3aed", "#0f9d6b", "#0284c7", "#dc2626", "#ea7a0c", "#9ca3af"
W, H = 820, 460
L, R, T, B = 78, 24, 82, 92   # márgenes del área de gráfico


def num(x, dec=1):
    s = f"{x:,.{dec}f}"
    return s.replace(",", "X").replace(".", ",").replace("X", ".")


def esc(t):
    return str(t).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def text(x, y, t, size=13, color=INK, anchor="start", weight="normal"):
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color}" '
            f'text-anchor="{anchor}" font-weight="{weight}">{esc(t)}</text>')


def frame(title, subtitle, note, body):
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
             f'viewBox="0 0 {W} {H}" font-family="{FONT}">',
             f'<rect width="{W}" height="{H}" fill="#ffffff" rx="12"/>',
             text(L - 54, 34, title, 19, INK, weight="700"),
             text(L - 54, 56, subtitle, 13, MUTED)]
    parts += body
    for i, line in enumerate(note.split("\n")):
        parts.append(text(L - 54, H - 22 - 16 * (len(note.split("\n")) - 1 - i), line, 11, MUTED))
    parts.append("</svg>")
    return "\n".join(parts)


def nice_ticks(lo, hi, n=6):
    span = hi - lo
    raw = span / n
    mag = 10 ** len(str(int(raw))) / 10 if raw >= 1 else 1
    for step in (1, 2, 2.5, 5, 10, 20, 25, 50, 100):
        st = step * mag
        if span / st <= n:
            break
    start = int(lo // st) * st
    ticks, v = [], start
    while v <= hi + 1e-9:
        if v >= lo - 1e-9:
            ticks.append(v)
        v += st
    return ticks


def line_chart(name, title, subtitle, note, xs, series, ylo, yhi, xlabel, ylabel,
               yfmt=lambda v: num(v, 0), xfmt=lambda v: num(v, 0), refs=(), legend_cols=3):
    rows = -(-len(series) // legend_cols)
    top = 80 + rows * 18 + 10
    pw, ph = W - L - R, H - top - B
    sx = lambda x: L + (x - xs[0]) / (xs[-1] - xs[0]) * pw
    sy = lambda y: top + (1 - (y - ylo) / (yhi - ylo)) * ph
    body = []
    for t in nice_ticks(ylo, yhi):
        body.append(f'<line x1="{L}" x2="{L + pw}" y1="{sy(t):.1f}" y2="{sy(t):.1f}" '
                    f'stroke="{INK if abs(t) < 1e-9 else GRID}" stroke-width="{1.2 if abs(t) < 1e-9 else 1}"/>')
        body.append(text(L - 8, sy(t) + 4, yfmt(t), 11, MUTED, "end"))
    step = max(1, len(xs) // 8)
    for i, x in enumerate(xs):
        if i % step == 0 or i == len(xs) - 1:
            body.append(text(sx(x), top + ph + 18, xfmt(x), 11, MUTED, "middle"))
    body.append(text(L + pw / 2, top + ph + 38, xlabel, 12, MUTED, "middle"))
    body.append(f'<text x="{L - 56}" y="{top + ph / 2}" font-size="12" fill="{MUTED}" text-anchor="middle" '
                f'transform="rotate(-90 {L - 56} {top + ph / 2})">{esc(ylabel)}</text>')
    for label, y, color in refs:
        body.append(f'<line x1="{L}" x2="{L + pw}" y1="{sy(y):.1f}" y2="{sy(y):.1f}" stroke="{color}" '
                    f'stroke-dasharray="3 4" stroke-width="1.2"/>')
        body.append(text(L + 8, sy(y) - 5, label, 11, color, "start", "600"))
    for label, ys, color, dash in series:
        pts = " ".join(f"{sx(x):.1f},{sy(max(ylo, min(yhi, y))):.1f}" for x, y in zip(xs, ys))
        dash_attr = 'stroke-dasharray="7 5"' if dash else ""
        body.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2.6" '
                    f'stroke-linejoin="round" {dash_attr}/>')
    lx, ly = L - 54, 84
    colw = (W - lx - R) / legend_cols
    for i, (label, _, color, dash) in enumerate(series):
        x0 = lx + (i % legend_cols) * colw
        y0 = ly + (i // legend_cols) * 18 + 4
        dash_attr = 'stroke-dasharray="6 4"' if dash else ""
        body.append(f'<line x1="{x0}" x2="{x0 + 22}" y1="{y0 - 4}" y2="{y0 - 4}" stroke="{color}" stroke-width="3" '
                    f'{dash_attr}/>')
        body.append(text(x0 + 28, y0, label, 12, INK))
    (OUT / name).write_text(frame(title, subtitle, note, body))


def hbar_chart(name, title, subtitle, note, rows, xmax, xfmt):
    """rows: (label, value, color, detalle)"""
    pw = W - 280 - R - 64
    top, rh = T + 6, (H - T - B) / len(rows)
    body = []
    for i, (label, v, color, det) in enumerate(rows):
        y = top + i * rh
        bh = rh * 0.56
        body.append(text(L - 54, y + bh / 2 + 4, label, 13, INK, weight="600"))
        body.append(text(L - 54, y + bh / 2 + 20, det, 11, MUTED))
        x0 = 280
        body.append(f'<rect x="{x0}" y="{y:.1f}" width="{v / xmax * pw:.1f}" height="{bh:.1f}" rx="4" fill="{color}"/>')
        body.append(text(x0 + v / xmax * pw + 8, y + bh / 2 + 5, xfmt(v), 13, INK, weight="700"))
    (OUT / name).write_text(frame(title, subtitle, note, body))


def waterfall(name, title, subtitle, note, steps, ymax, yfmt):
    """steps: (label, delta, color); el último es total si delta is None."""
    pw, ph = W - L - R, H - T - B
    n = len(steps)
    bw = pw / n * 0.62
    sy = lambda y: T + (1 - y / ymax) * ph
    body = []
    for t in nice_ticks(0, ymax):
        body.append(f'<line x1="{L}" x2="{L + pw}" y1="{sy(t):.1f}" y2="{sy(t):.1f}" stroke="{GRID}"/>')
        body.append(text(L - 8, sy(t) + 4, yfmt(t), 11, MUTED, "end"))
    acc = 0.0
    for i, (label, delta, color) in enumerate(steps):
        cx = L + (i + 0.5) * pw / n
        if delta is None:
            a, b = 0.0, acc
            val = acc
        else:
            a, b = acc, acc + delta
            acc = b
            val = delta
        y1, y2 = sy(max(a, b)), sy(min(a, b))
        body.append(f'<rect x="{cx - bw / 2:.1f}" y="{y1:.1f}" width="{bw:.1f}" height="{max(1, y2 - y1):.1f}" '
                    f'rx="3" fill="{color}"/>')
        sign = "" if delta is None else ("+" if val >= 0 else "−")
        body.append(text(cx, y1 - 7, f"{sign}US${num(abs(val), 2)}", 12, INK, "middle", "700"))
        for j, part in enumerate(label.split("\n")):
            body.append(text(cx, T + ph + 18 + 14 * j, part, 11, MUTED, "middle"))
    (OUT / name).write_text(frame(title, subtitle, note, body))


def stacked_bar(name, title, subtitle, note, parts, total):
    """Una barra horizontal partida en segmentos: (label, valor, color)."""
    pw = W - 2 * (L - 54)
    x, y, bh = L - 54, T + 40, 70
    body = [text(x, y - 12, f"Lo que paga el comercio por una PC de US$1.000: US${num(total, 2)}", 13, INK, weight="600")]
    for i, (label, v, color) in enumerate(parts):
        w = v / total * pw
        body.append(f'<rect x="{x:.1f}" y="{y}" width="{w:.1f}" height="{bh}" fill="{color}"/>')
        if w > 80:
            body.append(text(x + w / 2, y + bh / 2 + 5, f"US${num(v, 2)}", 14, "#ffffff", "middle", "700"))
        ly = y + bh + 34 + i * 34
        body.append(f'<rect x="{L - 54}" y="{ly - 12}" width="14" height="14" rx="3" fill="{color}"/>')
        body.append(text(L - 32, ly, f"{label} — US${num(v, 2)} ({num(v / total * 100, 0)}%)", 13, INK))
        x += w
    (OUT / name).write_text(frame(title, subtitle, note, body))


def vbars(name, title, subtitle, note, cats, series, ylo, yhi, yfmt, vfmt, sign_colors=False,
          label_every=1, marks=(), stacked=False, totals_fmt=None):
    """Barras verticales agrupadas (o apiladas). series: (label, valores, color)."""
    legend = len(series) > 1 or stacked
    top = 80 + (26 if legend else 0) + 12
    pw, ph = W - L - R, H - top - B
    sy = lambda y: top + (1 - (y - ylo) / (yhi - ylo)) * ph
    n, k = len(cats), (1 if stacked else len(series))
    slot = pw / n
    bw = slot * (0.78 if n > 12 else 0.64) / k
    body = []
    for t in nice_ticks(ylo, yhi):
        body.append(f'<line x1="{L}" x2="{L + pw}" y1="{sy(t):.1f}" y2="{sy(t):.1f}" '
                    f'stroke="{INK if abs(t) < 1e-9 else GRID}" stroke-width="{1.2 if abs(t) < 1e-9 else 1}"/>')
        body.append(text(L - 8, sy(t) + 4, yfmt(t), 11, MUTED, "end"))
    for i, c in enumerate(cats):
        cx = L + (i + 0.5) * slot
        if i % label_every == 0 or i == n - 1:
            for j, part in enumerate(str(c).split("\n")):
                body.append(text(cx, top + ph + 18 + 14 * j, part, 11, MUTED, "middle"))
        acc = 0.0
        for si, (label, vals, color) in enumerate(series):
            v = vals[i]
            if stacked:
                a, b = acc, acc + v
                acc = b
                x = cx - bw / 2
            else:
                a, b = 0.0, v
                x = cx - k * bw / 2 + si * bw
            col = (GREEN if v >= 0 else RED) if sign_colors else color
            y1, y2 = sy(max(a, b)), sy(min(a, b))
            body.append(f'<rect x="{x + 1:.1f}" y="{y1:.1f}" width="{bw - 2:.1f}" height="{max(1, y2 - y1):.1f}" '
                        f'rx="3" fill="{col}"/>')
            if vfmt and not stacked:
                ty = y1 - 6 if v >= 0 else y2 + 14
                body.append(text(x + bw / 2, ty, vfmt(v), 12 if n <= 12 else 9, INK, "middle", "700"))
            elif vfmt and stacked and (y2 - y1) > 18:
                body.append(text(cx, (y1 + y2) / 2 + 4, vfmt(v), 11, "#ffffff", "middle", "700"))
        if stacked and totals_fmt:
            body.append(text(cx, sy(acc) - 8, totals_fmt(acc), 14, INK, "middle", "700"))
    for idx, label, color in marks:
        cx = L + (idx + 0.5) * slot
        body.append(f'<line x1="{cx:.1f}" x2="{cx:.1f}" y1="{top}" y2="{top + ph}" stroke="{color}" '
                    f'stroke-dasharray="4 4" stroke-width="1.5"/>')
        for j, part in enumerate(label.split("\n")):
            body.append(text(cx - 6, top + 14 + 15 * j, part, 12, color, "end", "700"))
    if legend:
        x0 = L - 54
        for label, _, color in series:
            body.append(f'<rect x="{x0}" y="{86}" width="14" height="14" rx="3" fill="{color}"/>')
            body.append(text(x0 + 20, 98, label, 12, INK))
            x0 += 34 + len(label) * 6.6
    (OUT / name).write_text(frame(title, subtitle, note, body))


def pitch_charts():
    base = m.Risk()
    usdk = lambda v: "US$" + num(v / 1000, 0) + "k"
    nota = "Escenario de modelo-v2.py §8-9: mora 30%, recupero del fiador 80%. No es un pronóstico. Todo corre en devnet."

    # P1. Cuánto se queda la empresa de cada venta, frente a la industria
    sp = m.plan_split()
    lazo = (sp["originacion"] + sp["administracion"] + sp["rampa"]) / 10
    hbar_chart(
        "pitch-1-take-rate.svg",
        "De cada US$100 vendidos, cuánto se queda la empresa",
        "Lazo frente a los dos BNPL más grandes del mundo",
        "Klarna: ingresos / volumen 2024 (US$2.810M / US$105.000M, vía Sacra). Affirm: ingresos menos costos de transacción / volumen,\n"
        "FY2025 (carta a accionistas, SEC). Lazo: originación + administración + rampa de una PC de US$1.000; la mora la absorbe el pool.",
        [("Klarna", 2.7, GREY, "ingresos sobre volumen, 2024"),
         ("Lazo", lazo, PURPLE, "ingresos de la empresa, escenario"),
         ("Affirm", 4.0, GREY, "ingresos − costos de transacción, FY2025")],
        5, lambda v: "US$" + num(v, 1))

    # P2. Cuándo es rentable
    rows = m.actor_ramp(base)
    rd = m.ronda(0.25)
    vals = [(r["empresa"] + 0.25 * r["junior_mo"]) / 1000 for r in rows]
    be = rd["equilibrio"][0]
    vbars(
        "pitch-2-cuando-es-rentable.svg",
        f"Lazo empieza a ganar plata en el mes {be}",
        "Resultado mensual de la empresa, en miles de US$ (comisiones + 25% del junior, después de opex)",
        "Meses 7 y 19: cambio de etapa, sube el opex (US$6k → 14k → 25k por mes) y el 19 queda en cero. Volumen y opex: supuestos propios.\n" + nota,
        list(range(1, 37)), [("Resultado", vals, GREEN)], -10, 40, lambda v: num(v, 0) + "k", None,
        sign_colors=True, label_every=3,
        marks=[(be - 1, f"Equilibrio: mes {be}\n{rd['equilibrio'][1]} planes/mes", PURPLE)])

    # P3. Cuánta plata hace falta
    opts = [(0.0, "Lazo no pone\njunior"), (0.25, "Lazo pone 25%\n(recomendado)"),
            (0.5, "Lazo pone 50%"), (1.0, "Lazo pone\ntodo el junior")]
    rds = [m.ronda(sh) for sh, _ in opts]
    vbars(
        "pitch-3-cuanta-plata.svg",
        f"La ronda: ~{usdk(rds[1]['total'])} para llegar a ser rentable",
        "Plata que necesita la empresa, según cuánto del tramo junior pone ella (miles de US$)",
        "Pozo = pérdidas hasta el equilibrio. Colchón = 6 meses de opex de US$14k. Legal = PNFC, contratos, AAIP, UIF (US$50-80k).\n"
        "El resto del junior lo pone un sponsor del ecosistema. El senior (80% del pool) lo ponen inversores calificados, no la empresa.",
        [lab for _, lab in opts],
        [("Pozo hasta el equilibrio", [r["pozo"] / 1000 for r in rds], RED),
         ("Colchón", [r["colchon"] / 1000 for r in rds], ORANGE),
         ("Legal y estructura", [r["legal"] / 1000 for r in rds], GREY),
         ("Junior propio", [r["junior"] / 1000 for r in rds], PURPLE)],
        0, 500, lambda v: num(v, 0) + "k", lambda v: num(v, 0) + "k", stacked=True,
        totals_fmt=lambda v: "US$" + num(v, 0) + "k")

    # P4. Cuántos planes por mes para cubrir los gastos
    e = m.economics(1, m.rec_mix(24), 650.0, 0.0, m.Co(cac=m.REC_CAC))
    solo = e["fees"] - e["var"]
    con = solo + 0.25 * e["junior_mo"]
    opex = [6000, 14000, 25000, 35000]
    vbars(
        "pitch-4-planes-para-equilibrio.svg",
        "Cuántas compras en cuotas por mes hacen falta para no perder plata",
        f"Cada plan le deja a Lazo US${num(solo, 0)} (solo comisiones) o US${num(con, 0)} (con 25% del junior)",
        "Ticket financiado medio US$650 (notebooks, PC). Opex por etapa: piloto, Tucumán, 3 ciudades, escala nacional.\n" + nota,
        ["Piloto\nUS$6k/mes", "Tucumán\nUS$14k/mes", "3 ciudades\nUS$25k/mes", "Nacional\nUS$35k/mes"],
        [("Solo comisiones", [o / solo for o in opex], PURPLE),
         ("Comisiones + 25% del junior", [o / con for o in opex], GREEN)],
        0, 1400, lambda v: num(v, 0), lambda v: num(v, 0))

    # P5. Senior vs. junior
    esc = [("Año bueno\nmora 20%", 0.20, 0.80), ("Año normal\nmora 30%", 0.30, 0.80),
           ("Año malo\nmora 40%, recupero 65%", 0.40, 0.65), ("Año muy malo\nmora 50%, recupero 50%", 0.50, 0.50)]
    tv = [m.tramos_vs([replace(base, d=d, r=r)])[0] for _, d, r in esc]
    vbars(
        "pitch-5-senior-vs-junior.svg",
        "Senior: cobra seguro. Junior: gana más, pero pierde primero",
        "Rendimiento anual de cada tramo del pool según cómo salga el año",
        "Senior = 80% del pool, 8% fijo, cobra primero (como un préstamo). Junior = 20%, se queda con lo que sobra (como un socio).\n"
        "Si el junior ganara menos que el senior, nadie lo pondría, y sin junior no hay protección para el senior. " + nota.split(". ")[1] + ".",
        [lab for lab, _, _ in esc],
        [("Senior (tramo protegido)", [t[1] * 100 for t in tv], BLUE),
         ("Junior (tramo de primera pérdida)", [t[2] * 100 for t in tv], GREEN)],
        -110, 110, lambda v: num(v, 0) + "%", lambda v: num(v, 0) + "%")

    # P6. Liquidez
    liq = m.liquidez_si_se_frena()
    vbars(
        "pitch-6-liquidez.svg",
        "Si los inversores quieren retirar: en 2 meses vuelve el 85% a caja",
        "% del pool disponible en efectivo si Lazo deja de prestar hoy (planes de 3 cuotas)",
        "Mes 0 = el 20% que siempre queda en caja. Después entran las cuotas: los planes son cortos, la plata vuelve rápido.\n"
        "Por eso alcanza con aviso de 30 días y un tope de retiros por mes (plan-de-negocio.md §9.1). " + nota.split(". ")[1] + ".",
        ["Hoy", "Mes 1", "Mes 2", "Mes 3"],
        [("En caja", [min(100, v * 100) for _, v in liq[:4]], BLUE)],
        0, 110, lambda v: num(v, 0) + "%", lambda v: num(v, 0) + "%")

    # P7. Cuánta plata dejar quieta
    us = [0.6, 0.7, 0.8, 0.9]
    eu = [m.economics(1, m.rec_mix(24), 650.0, 0.0, m.Co(cac=m.REC_CAC), pool=m.Pool(utilization=u)) for u in us]
    vbars(
        "pitch-7-caja-vs-rendimiento.svg",
        "Más plata quieta para retiros = menos rendimiento",
        "Rendimiento anual según qué parte del pool está prestada (el resto queda en caja o en Kamino al ~4,5%)",
        "Propuesta: 80% prestado, 20% en caja. El senior cobra 8% en todos los casos; lo que cambia es lo que le queda al junior.\n" + nota,
        [f"{num(u * 100, 0)}% prestado" for u in us],
        [("Pool total", [x["pool_annual"] * 100 for x in eu], PURPLE),
         ("Junior", [x["junior_annual"] * 100 for x in eu], GREEN),
         ("Senior", [8.0] * 4, BLUE)],
        0, 80, lambda v: num(v, 0) + "%", lambda v: num(v, 1) + "%")


    # P8. Tres formas de repartir entre senior y junior
    esc2 = [("Año bueno\nmora 20%", 0.20, 0.80), ("Año normal\nmora 30%", 0.30, 0.80),
            ("Año malo\nmora 40%, recupero 65%", 0.40, 0.65)]
    rp = [m.tramos_vs([replace(base, d=d, r=r)])[0] for _, d, r in esc2]
    part = [m.tramos_participacion(x[0]) for x in rp]
    vbars(
        "pitch-8-estructuras-senior.svg",
        "Que el senior también gane en los años buenos",
        "Rendimiento anual según cómo se reparte el pool (A: senior fijo · B: senior con participación · C: un solo tramo)",
        "B = el senior cobra un piso de 8% y además 20% de lo que el pool gane por encima de ese 8%. El junior cobra el resto.\n"
        "En un año malo, A y B son iguales: el junior pierde primero y el senior cobra su 8%. En C pierden todos por igual. " + nota.split(". ")[1] + ".",
        [lab for lab, _, _ in esc2],
        [("A. Senior fijo", [x[1] * 100 for x in rp], "#93c5fd"),
         ("B. Senior con participación", [x[0] * 100 for x in part], BLUE),
         ("B. Junior", [x[1] * 100 for x in part], GREEN),
         ("C. Un solo tramo", [x[0] * 100 for x in rp], GREY)],
        -70, 100, lambda v: num(v, 0) + "%", lambda v: num(v, 0) + "%")

    # P9. Precio al comercio vs. recupero del fiador
    grid = m.precio_vs_recupero()
    fps = [0.05, 0.06, 0.07, 0.08, 0.09]
    line_chart(
        "pitch-9-precio-vs-recupero.svg",
        "Si el fiador paga siempre, el comercio puede pagar menos",
        "Rendimiento anual del pool según la comisión del comercio (% del precio) y cuánto se le cobra al fiador",
        "Modo sin interés, 3 cuotas, mora 30%. Recupero 95% = tarjeta del fiador ejecutada directo y que no se puede sacar con planes activos.\n"
        "Debajo de la línea del 8%, el junior gana menos que el senior; más abajo (~6%), pierde. Es un escenario, no un pronóstico.",
        [f * 100 for f in fps],
        [("Recupero 80% (base)", [grid[(f, 0.80)][0] * 100 for f in fps], RED, False),
         ("Recupero 90%", [grid[(f, 0.90)][0] * 100 for f in fps], ORANGE, False),
         ("Recupero 95% (tarjeta ejecutada)", [grid[(f, 0.95)][0] * 100 for f in fps], GREEN, False)],
        -10, 40, "Comisión del comercio (% del precio)", "Rendimiento anual del pool",
        yfmt=lambda v: num(v, 0) + "%", xfmt=lambda v: num(v, 0) + "%",
        refs=[("Senior: 8%", 8.0, BLUE)])


def main():
    OUT.mkdir(exist_ok=True)
    base = m.Risk()
    pctf = lambda v: num(v, 0) + "%"
    nota_base = "Escenario del modelo (modelo-v2.py §8): mora 30%, recupero del fiador 80%. No es un pronóstico. Todo corre en devnet."

    # 1. Precio para el comercio
    hbar_chart(
        "01-precio-comercio.svg",
        "Cuánto paga el comercio por vender en 3 cuotas sin interés",
        "Costo en % del precio de venta. Banco y Mercado Pago exigen que el comprador tenga tarjeta",
        "Banco y Mercado Pago: tabla de Google modo IA, SIN VERIFICAR, + IVA. Lazo: propuesta (plan-de-negocio.md §3.4),\n"
        "+ IVA a confirmar con un contador. El comprador de Lazo no necesita tarjeta.",
        [("Mercado Pago", 18.5, RED, "al instante · con tarjeta · ~18-19% + IVA"),
         ("Banco (Posnet)", 8.5, GREY, "a 8 días hábiles · con tarjeta · + alquiler"),
         ("Lazo propuesto", 9.0, PURPLE, "al instante · sin tarjeta · sin Posnet"),
         ("Lazo cobrando a 30 días", 7.0, BLUE, "propuesta, sin modelar todavía"),
         ("Lazo hoy (programa)", 4.9, GREEN, "7% de lo financiado: Lazo no gana nada")],
        20, lambda v: num(v, 1) + "%")

    # 2. A dónde va la comisión
    sp = m.plan_split()
    stacked_bar(
        "02-a-donde-va-la-comision.svg",
        "A dónde va la comisión del comercio",
        "PC de US$1.000, escalón 0 (anticipo 30%, financiado US$700), modo sin interés al 9% del precio",
        "Valores esperados por plan. La pérdida es lo que no se recupera del estudiante ni del fiador, más los costos de cobro.\n" + nota_base,
        [("Lazo: originación (4% de lo financiado)", sp["originacion"], PURPLE),
         ("Lazo: administración (2%/año sobre saldo)", sp["administracion"], BLUE),
         ("Pérdida esperada por mora, neta del fiador", sp["perdida"], RED),
         ("Ganancia del pool (inversores)", sp["pool"], GREEN)],
        sp["pagado"])

    # 3. La empresa por plan
    ep = m.empresa_por_plan()
    waterfall(
        "03-empresa-por-plan.svg",
        "Cuánto gana la empresa por cada plan, sin poner capital",
        "Ticket financiado medio US$650, 3 cuotas, mitad modo sin interés y mitad con costo",
        "Rampa = 1% sobre las cuotas pagadas en pesos (60%), lo paga el estudiante y necesita un socio. Adquisición US$5 por plan:\n"
        "supuesto a medir en el piloto. " + nota_base.split(". ")[1] + ".",
        [("Originación\n(4% financiado)", ep["originacion"], PURPLE),
         ("Administración\n(2%/año)", ep["administracion"], BLUE),
         ("Rampa\npesos→USDC", ep["rampa"], "#8b5cf6"),
         ("KYC + gas", -ep["kyc_gas"], RED),
         ("Adquisición", -ep["adquisicion"], RED),
         ("Margen\npor plan", None, GREEN)],
        35, lambda v: "US$" + num(v, 0))

    # 4 y 5. Empresa a 36 meses
    rb = m.actor_ramp(base)
    rs = m.actor_ramp(replace(base, d=0.40, r=0.65))
    months = [r["mes"] for r in rb]
    k = 1 / 1000
    line_chart(
        "04-empresa-mensual.svg",
        "Resultado mensual de la empresa (36 meses)",
        "Miles de US$ por mes, después de opex. ¿Cuánto del tramo junior pone la empresa?",
        "Opex: US$6k (piloto), 14k (Tucumán + 2.ª ciudad), 25k (3 ciudades + Tiendanube). Volumen: supuesto propio.\n"
        "Los saltos de los meses 7 y 19 son cambios de etapa (sube el opex). Punteado: estrés (mora 40%, recupero 65%). No es un pronóstico.",
        months,
        [("Solo comisiones", [r["empresa"] * k for r in rb], PURPLE, False),
         ("+ 50% del junior", [(r["empresa"] + 0.5 * r["junior_mo"]) * k for r in rb], BLUE, False),
         ("+ 100% del junior", [(r["empresa"] + r["junior_mo"]) * k for r in rb], GREEN, False),
         ("Solo comisiones, estrés", [r["empresa"] * k for r in rs], PURPLE, True),
         ("+ 50% del junior, estrés", [(r["empresa"] + 0.5 * r["junior_mo"]) * k for r in rs], BLUE, True),
         ("+ 100% del junior, estrés", [(r["empresa"] + r["junior_mo"]) * k for r in rs], GREEN, True)],
        -20, 70, "Mes", "Miles de US$ por mes", yfmt=lambda v: num(v, 0) + "k")

    def cum(rows, share):
        out, c = [], 0.0
        for r in rows:
            c += r["empresa"] + share * r["junior_mo"]
            out.append(c * k)
        return out

    line_chart(
        "05-empresa-acumulado.svg",
        "Resultado acumulado de la empresa (36 meses)",
        "Miles de US$. El punto más bajo de cada curva es la plata que hay que tener para aguantar",
        "Sin contar el capital del junior, que se pone aparte (plan-de-negocio.md §8.1).\n"
        "Línea punteada: estrés (mora 40%, recupero 65%). " + nota_base.split(". ")[1] + ".",
        months,
        [("Solo comisiones", cum(rb, 0), PURPLE, False),
         ("+ 50% del junior", cum(rb, 0.5), BLUE, False),
         ("+ 100% del junior", cum(rb, 1), GREEN, False),
         ("Solo comisiones, estrés", cum(rs, 0), PURPLE, True),
         ("+ 50% del junior, estrés", cum(rs, 0.5), BLUE, True),
         ("+ 100% del junior, estrés", cum(rs, 1), GREEN, True)],
        -450, 750, "Mes", "Miles de US$ acumulados", yfmt=lambda v: num(v, 0) + "k")

    # 6. Inversores vs. mora
    ds = [0.10 + 0.025 * i for i in range(17)]
    tv = m.tramos_vs([replace(base, d=d) for d in ds])
    line_chart(
        "06-inversores-vs-mora.svg",
        "Rendimiento anual del pool y de cada tramo según la mora",
        "Régimen estable, cartera con 6 cuotas. Recupero del fiador 80%",
        "Senior = 80% del pool, cobra 8% fijo y primero. Junior = 20%, absorbe las primeras pérdidas.\n"
        "Referencia: Kamino ~4,5% (USDC en Solana, oct-2026). Comparación completa en el gráfico 08. " + nota_base.split(". ")[1] + ".",
        [d * 100 for d in ds],
        [("Pool total", [t[0] * 100 for t in tv], PURPLE, False),
         ("Senior (8% fijo)", [t[1] * 100 for t in tv], BLUE, False),
         ("Junior (primera pérdida)", [t[2] * 100 for t in tv], GREEN, False)],
        -20, 130, "Mora final (% de planes que no terminan de pagar)", "Rendimiento anual",
        yfmt=pctf, xfmt=pctf,
        refs=[("Kamino ~4,5%", 4.5, GREY)])

    # 7. Inversores vs. recupero del fiador
    rs_ = [0.50 + 0.025 * i for i in range(19)]
    tr = m.tramos_vs([replace(base, r=r) for r in rs_])
    line_chart(
        "07-inversores-vs-recupero.svg",
        "El riesgo que más pesa: cuánto se le cobra de verdad al fiador",
        "Rendimiento anual con mora del 30%, según el recupero real del fiador",
        "Recupero = % de lo impago que efectivamente se le cobra al fiador. Es la métrica #1 del piloto (umbral ≥70%).\n"
        "Por eso DEBIN como medio principal (plan-de-negocio.md §6.2). " + nota_base.split(". ")[1] + ".",
        [r * 100 for r in rs_],
        [("Pool total", [t[0] * 100 for t in tr], PURPLE, False),
         ("Senior", [t[1] * 100 for t in tr], BLUE, False),
         ("Junior", [t[2] * 100 for t in tr], GREEN, False)],
        -105, 140, "Recupero del fiador", "Rendimiento anual",
        yfmt=pctf, xfmt=pctf, refs=[("Kamino ~4,5%", 4.5, GREY)])

    # 8. Comparación de rendimientos para el inversor
    tb = m.tramos_vs([base])[0]
    hbar_chart(
        "08-rendimientos-comparados.svg",
        "Qué gana un inversor en USDC: Lazo frente a lo que hay en Solana",
        "Rendimiento anual en dólares",
        "Kamino, Jupiter y Huma: referencias de oct-2026 citadas en plan-de-negocio.md §6.4. Lazo: escenario del modelo,\n"
        "con riesgo de crédito (ver gráficos 06 y 07). El senior solo se ofrece a inversores calificados o del exterior.",
        [("Kamino", 4.5, GREY, "préstamo DeFi, sin riesgo de consumo"),
         ("Jupiter", 5.0, GREY, "~4-5,4%"),
         ("Huma PST", 7.7, ORANGE, "crédito de pagos"),
         ("Lazo senior", tb[1] * 100, BLUE, "cobra primero, 80% del pool"),
         ("Lazo pool total", tb[0] * 100, PURPLE, "escenario mora 30%"),
         ("Lazo junior", tb[2] * 100, GREEN, "primera pérdida: −55% en estrés")],
        65, lambda v: num(v, 1) + "%")

    pitch_charts()
    print("Gráficos en", OUT)
    for f in sorted(OUT.glob("*.svg")):
        print(" -", f.name)


if __name__ == "__main__":
    main()
