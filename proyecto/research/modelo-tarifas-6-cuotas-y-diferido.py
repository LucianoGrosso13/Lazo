"""Sensibilidad: interés de 6 cuotas (2,5% vs 3%) y tarifa del comercio por plazo de cobro con tramos.

Reproduce el modelo de contribución por compra de `proyecto/08-minorista-y-economia.md`
(§ Economía reproducible por compra) con sus mismos supuestos hipotéticos, y lo usa para:
  1. comparar 6 cuotas con interés total 2,5% vs 3% (y sensibilidad 0/2/3/4%);
  2. calcular la comisión "neutra" de cobro en tramos a 30/60/90 días: la que deja a Lazo
     (consolidado) con la misma contribución que el cobro inmediato al 7%, trasladando
     al comercio exactamente el ahorro de capital;
  3. validar la política comercial vigente decidida el 2026-10-07:
     - 6 cuotas: 3% total sobre lo financiado, desde US$ 350;
     - cobro del comercio en tramos: hoy 7%, 30 días 6,25%, 60 días 5,75%, 90 días 5,25%.

Todos los parámetros son hipótesis de 08, no métricas de Lazo.
Correr: python3 -I proyecto/research/modelo-tarifas-6-cuotas-y-diferido.py
"""

A_DOWN = 0.30   # anticipo
D_DEF = 0.08    # prob. escenario default
R_REC = 0.80    # recupero efectivo
H_CAP = 0.12    # costo anual simple del capital
PHI = 0.05      # arancel sobre recupero
P_ORD = 0.01    # costo cobros ordinarios (% de P)
X_FX = 0.005    # rampa/FX (% de P)
Z_FRAUD = 0.002 # devoluciones/fraude (% de P)
K_REP, K_NEW = 1.40, 4.00
K_PAID = 1      # cuotas pagadas antes del default (3 y 6 cuotas)


# ---------------------------------------------------------------------------
# Modelo original (bullet / cobro inmediato o diferido en una sola fecha)
# ---------------------------------------------------------------------------

def w_days(n, c, settle_day, d=D_DEF, k=K_PAID):
    j0 = settle_day // 30
    w_normal = 30 * sum(max(1 - c - j / n, 0) for j in range(j0, n))
    w_default = 30 * sum(max(1 - c - min(j, k) / n, 0) for j in range(j0, n + 2))
    return (1 - d) * w_normal + d * w_default


def margin(n, c, i, settle_day, d=D_DEF, r=R_REC, h=H_CAP):
    u = (n - K_PAID) / n
    w = w_days(n, c, settle_day, d)
    return (1 - A_DOWN) * (
        c + i * (1 - d * u * (1 - r)) - d * u * (1 - r) - PHI * d * u * (1 + i) * r - h * w / 365
    ) - P_ORD - X_FX - Z_FRAUD


def contribution(price, n, c, i, settle_day, k_fixed, **kw):
    return price * margin(n, c, i, settle_day, **kw) - k_fixed


def neutral_fee(n, i, settle_day, base_c=0.07, **kw):
    """Comisión diferida bullet con el mismo margen que el cobro inmediato a base_c."""
    target = margin(n, base_c, i, 0, **kw)
    lo, hi = 0.0, base_c
    for _ in range(100):
        mid = (lo + hi) / 2
        if margin(n, mid, i, settle_day, **kw) > target:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


# ---------------------------------------------------------------------------
# Modelo con cobro en TRAMOS mensuales (política vigente 2026-10-07)
# ---------------------------------------------------------------------------

def disbursed_frac(day, settle_day):
    """Fracción acumulada del neto desembolsada al comercio hasta el día `day`.
    - hoy (0d): 100% día 0
    - 30d: 100% día 30
    - 60d: 50% día 30, 50% día 60
    - 90d: 1/3 día 30, 1/3 día 60, 1/3 día 90
    """
    if settle_day == 0:
        return 1.0
    if settle_day == 30:
        return 1.0 if day >= 30 else 0.0
    if settle_day == 60:
        if day < 30:
            return 0.0
        elif day < 60:
            return 0.5
        return 1.0
    if settle_day == 90:
        if day < 30:
            return 0.0
        elif day < 60:
            return 1.0 / 3.0
        elif day < 90:
            return 2.0 / 3.0
        return 1.0
    return 1.0


def w_days_tranches(n, c, settle_day, d=D_DEF, k=K_PAID):
    """Días-capital expuestos con cobro en tramos.
    Mes a mes j=0..n-1 (y hasta n+1 en mora):
    Exposición neta = max(fracción_desembolsada*(1-c) - cuotas_cobradas/n, 0).
    """
    w_normal = 0.0
    for j in range(0, n):
        disb = disbursed_frac(30 * j, settle_day) * (1 - c)
        repaid = j / n
        w_normal += 30 * max(disb - repaid, 0.0)
    w_default = 0.0
    for j in range(0, n + 2):
        disb = disbursed_frac(30 * j, settle_day) * (1 - c)
        repaid = min(j, k) / n
        w_default += 30 * max(disb - repaid, 0.0)
    return (1 - d) * w_normal + d * w_default


def margin_tranches(n, c, i, settle_day, d=D_DEF, r=R_REC, h=H_CAP):
    u = (n - K_PAID) / n
    w = w_days_tranches(n, c, settle_day, d)
    return (1 - A_DOWN) * (
        c + i * (1 - d * u * (1 - r)) - d * u * (1 - r) - PHI * d * u * (1 + i) * r - h * w / 365
    ) - P_ORD - X_FX - Z_FRAUD


def contribution_tranches(price, n, c, i, settle_day, k_fixed, **kw):
    return price * margin_tranches(n, c, i, settle_day, **kw) - k_fixed


def neutral_fee_tranches(n, i, settle_day, base_c=0.07, **kw):
    """Comisión con tramos que iguala la contribución del cobro inmediato al 7%."""
    target = margin_tranches(n, base_c, i, 0, **kw)
    lo, hi = 0.0, base_c
    for _ in range(100):
        mid = (lo + hi) / 2
        if margin_tranches(n, mid, i, settle_day, **kw) > target:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


def fmt(v):
    return f"{v:+.2f}"


if __name__ == "__main__":
    # Asserts de reproducibilidad contra 08
    m_3_0 = margin(3, .07, 0, 0)
    c_100 = contribution(100, 3, .07, 0, 0, K_REP)
    m_6_ref = margin(6, .09, .04, 0)
    assert abs(m_3_0 - 0.0098384) < 1e-6, f"Error m_3_0: {m_3_0}"
    assert abs(c_100 - (-0.42)) < 1e-2, f"Error c_100: {c_100}"
    assert abs(m_6_ref - 0.0401742) < 1e-6, f"Error m_6_ref: {m_6_ref}"

    print("== Verificación contra 08: 3 cuotas / hoy / 7%: m (esperado 0,98384%), C P=100 rep (esperado -0,42)")
    print(f"m={m_3_0*100:.5f}%  C100={c_100:.2f}  W={w_days(3, .07, 0):.3f}")
    print(f"6/hoy 9%/4%: m={m_6_ref*100:.5f}% (esperado 4,01742%)")
    print("✓ Todos los asserts contra 08 pasaron correctamente.")

    print("\n== Comparación 6 cuotas: 2,5% vs 3% (cobro hoy, 7%)")
    print("| Interés | Margen | US$ 1.000, cliente que repite | Escenario malo | Un cliente nuevo da ganancia desde |")
    print("|---|---:|---:|---:|---:|")
    for i in (0.025, 0.03):
        m = margin(6, 0.07, i, 0)
        c_rep = contribution(1000, 6, 0.07, i, 0, K_REP)
        c_bad = contribution(1000, 6, 0.07, i, 0, K_REP, d=0.20, r=0.50, h=0.20)
        be_new = K_NEW / m
        print(f"| {i*100:.1f}% | {m*100:.2f}% | {c_rep:+.2f} | {c_bad:+.2f} | US$ {be_new:.0f} |")

    print("\n== 6 cuotas, cobro hoy, comisión 7%: sensibilidad completa")
    print("i     | m        | C P=300 rep/nuevo | C P=1000 rep/nuevo | equilibrio rep/nuevo | interés pagado comprador P=1000")
    for i in (0.0, 0.02, 0.025, 0.03, 0.04):
        m = margin(6, .07, i, 0)
        eq = f"{K_REP/m:.0f} / {K_NEW/m:.0f}" if m > 0 else "no existe"
        print(f"{i*100:4.1f}% | {m*100:7.4f}% | {fmt(contribution(300,6,.07,i,0,K_REP))} / {fmt(contribution(300,6,.07,i,0,K_NEW))}"
              f"    | {fmt(contribution(1000,6,.07,i,0,K_REP))} / {fmt(contribution(1000,6,.07,i,0,K_NEW))}     | {eq:>12} | {1000*(1-A_DOWN)*i:.0f}")

    print("\n== Escenarios de estrés para 6 cuotas (cobro hoy, 7%)")
    scen = {"favorable": (0.02, 0.95, 0.08), "base": (0.08, 0.80, 0.12), "adverso": (0.20, 0.50, 0.20)}
    for name, (d, r, h) in scen.items():
        row = [f"i={i*100:.1f}%: C1000 rep={contribution(1000,6,.07,i,0,K_REP,d=d,r=r,h=h):+.2f}" for i in (0.025, 0.03)]
        print(f"{name:9s} d={d} r={r} h={h} -> " + " | ".join(row))

    print("\n== Comisión neutra con TRAMOS mensuales (misma contribución que hoy al 7%)")
    print("| Modalidad | día 0 (inmediato) | día 30 (1 tramo) | día 60 (2 tramos) | día 90 (3 tramos) |")
    print("|---|---:|---:|---:|---:|")
    for n, i in ((3, 0.0), (6, 0.03)):
        cells = [f"{neutral_fee_tranches(n, i, day)*100:.2f}% (W={w_days_tranches(n, neutral_fee_tranches(n, i, day), day):.1f}d)"
                 for day in (0, 30, 60, 90)]
        print(f"| {n} cuotas (i={i*100:.1f}%) | " + " | ".join(cells) + " |")

    print("\n== Propuesta decidida con TRAMOS: hoy 7% / 30d 6,25% / 60d 5,75% / 90d 5,25%")
    prop_tramos = {0: .07, 30: .0625, 60: .0575, 90: .0525}
    for n, i in ((3, 0.0), (6, 0.03)):
        for day, c in prop_tramos.items():
            m_tr = margin_tranches(n, c, i, day)
            c1000_rep = contribution_tranches(1000, n, c, i, day, K_REP)
            c300_rep = contribution_tranches(300, n, c, i, day, K_REP)
            print(f"n={n} i={i*100:.0f}% día {day:2d} c={c*100:.2f}%: m={m_tr*100:.4f}%"
                  f"  C1000 rep={c1000_rep:+.2f}  C300 rep={c300_rep:+.2f}"
                  f"  neto comercio P=1000={1000-700*c:.2f}  originación 4% cubierta: {'sí' if c>=0.04 else 'NO'}")
