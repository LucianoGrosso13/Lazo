"""Sensibilidad: interés de 6 cuotas (2% vs 3%) y tarifa del comercio por plazo de cobro.

Reproduce el modelo de contribución por compra de `proyecto/08-minorista-y-economia.md`
(§ Economía reproducible por compra) con sus mismos supuestos hipotéticos, y lo usa para:
  1. comparar 6 cuotas con interés total 0/2/3/4% y comisión 7% cobro inmediato;
  2. calcular la comisión "neutra" de cobro diferido a 30/60/90 días: la que deja a Lazo
     (consolidado) con la misma contribución que el cobro inmediato al 7%, es decir, que
     traslada al comercio exactamente el ahorro de capital y nada más.
Todos los parámetros son hipótesis de 08, no métricas de Lazo. Correr: python3 este_archivo.py
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
    """Comisión diferida con el mismo margen que el cobro inmediato a base_c (bisección)."""
    target = margin(n, base_c, i, 0, **kw)
    lo, hi = 0.0, base_c
    for _ in range(100):
        mid = (lo + hi) / 2
        if margin(n, mid, i, settle_day, **kw) > target:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


def fmt(v):
    return f"{v:+.2f}"


if __name__ == "__main__":
    print("== Verificación contra 08: 3 cuotas / hoy / 7%: m (esperado 0,98384%), C P=100 rep (esperado -0,42)")
    print(f"m={margin(3, .07, 0, 0)*100:.5f}%  C100={contribution(100, 3, .07, 0, 0, K_REP):.2f}  W={w_days(3, .07, 0):.3f}")
    print(f"6/hoy 9%/4%: m={margin(6, .09, .04, 0)*100:.5f}% (esperado 4,01742%)")

    print("\n== 6 cuotas, cobro hoy, comisión 7%: interés total i")
    print("i     | m        | C P=300 rep/nuevo | C P=1000 rep/nuevo | equilibrio rep/nuevo | interés pagado comprador P=1000")
    for i in (0.0, 0.02, 0.03, 0.04):
        m = margin(6, .07, i, 0)
        eq = f"{K_REP/m:.0f} / {K_NEW/m:.0f}" if m > 0 else "no existe"
        print(f"{i*100:.0f}%   | {m*100:7.4f}% | {fmt(contribution(300,6,.07,i,0,K_REP))} / {fmt(contribution(300,6,.07,i,0,K_NEW))}"
              f"    | {fmt(contribution(1000,6,.07,i,0,K_REP))} / {fmt(contribution(1000,6,.07,i,0,K_NEW))}     | {eq:>12} | {1000*(1-A_DOWN)*i:.0f}")
    print("\n   Referencia 3 cuotas / hoy / 7%:", f"m={margin(3,.07,0,0)*100:.4f}%",
          f"C1000 rep={contribution(1000,3,.07,0,0,K_REP):.2f}")

    print("\n== Escenarios de estrés para 6 cuotas (cobro hoy, 7%)")
    scen = {"favorable": (0.02, 0.95, 0.08), "base": (0.08, 0.80, 0.12), "adverso": (0.20, 0.50, 0.20)}
    for name, (d, r, h) in scen.items():
        row = [f"i={i*100:.0f}%: C1000 rep={contribution(1000,6,.07,i,0,K_REP,d=d,r=r,h=h):+.2f}" for i in (0.02, 0.03)]
        print(f"{name:9s} d={d} r={r} h={h} -> " + " | ".join(row))
    print("   3 cuotas mismo estrés:", " | ".join(
        f"{n}: {contribution(1000,3,.07,0,0,K_REP,d=d,r=r,h=h):+.2f}" for n, (d, r, h) in scen.items()))

    print("\n== Comisión neutra por plazo de cobro (misma contribución que hoy al 7%)")
    for n, i in ((3, 0.0), (6, 0.03), (6, 0.02)):
        cells = []
        for day in (0, 30, 60, 90):
            c = neutral_fee(n, i, day) if day else 0.07
            cells.append(f"día {day}: {c*100:.2f}% (W={w_days(n, c, day):.1f})")
        print(f"n={n} i={i*100:.0f}% -> " + " | ".join(cells))

    print("\n== Propuesta redondeada (3 y 6 cuotas): hoy 7% / 30d 6,25% / 60d 5,5% / 90d 5,25%")
    prop = {0: .07, 30: .0625, 60: .055, 90: .0525}
    for n, i in ((3, 0.0), (6, 0.03)):
        for day, c in prop.items():
            print(f"n={n} i={i*100:.0f}% día {day:2d} c={c*100:.2f}%: m={margin(n,c,i,day)*100:.4f}%"
                  f"  C1000 rep={contribution(1000,n,c,i,day,K_REP):+.2f}  C300 rep={contribution(300,n,c,i,day,K_REP):+.2f}"
                  f"  neto comercio P=1000={1000-700*c:.2f}  originación 4% cubierta: {'sí' if c>=0.04 else 'NO'}")
