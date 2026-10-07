#!/usr/bin/env python3
"""
Lazo — Modelo financiero v2 (proyecto/07-plan-de-negocio)
=========================================================

Parte de proyecto/06-viabilidad/modelo-financiero.py y corrige dos cosas:

1. Desembolso del pool contado dos veces. El v1 calculaba
   K = A·(1 − fee_pool) + fee_co·A, que suma el fee de la empresa dos veces.
   Lo que sale del pool en t=0 es lo que recibe el comercio (A·(1 − fee_total))
   más el fee de la empresa (fee_co·A) = A·(1 − fee_pool).
   Ej. PC US$1.000, escalón 0: el pool desembolsa 665, no 679.
2. Servicing gratis. El v1 sumaba el servicing (5%/año sobre saldo) como ingreso
   de la empresa pero no se lo descontaba al pool. Acá sale de las cuotas
   que cobra el pool.

Agrega además:
- TIR mensual del libro (las cuotas devuelven capital mes a mes) además del ×4
  conservador del v1.
- Esquema "el comercio elige" (modo sin interés vs. modo con costo al comprador).
- Escalera con piso de cobertura y mora que baja por escalón (hipótesis).
- Rail del fiador: tarjeta (π 5%, desconocimiento 5-20%) vs. DEBIN (π 1%).
- Capital necesario del pool, P&L por etapa y necesidad de fondeo (escenarios).

Todo es escenario con supuestos declarados, no una proyección garantizada.
Correr: python3 modelo-v2.py > salida-modelo-v2.md
"""

from dataclasses import dataclass, replace

# ---------------------------------------------------------------------------
# Parámetros
# ---------------------------------------------------------------------------

@dataclass
class Plan:
    price: float = 1000.0      # P — precio de la compra (USD)
    down: float = 0.30         # a — anticipo (fracción del precio), va al comercio
    n: int = 3                 # cuotas mensuales
    interest: float = 0.0      # i — costo total al comprador sobre lo financiado
    fee_total: float = 0.07    # descuento del comercio sobre lo financiado
    fee_co: float = 0.0        # parte del descuento que cobra la EMPRESA (origination)
    penalty: float = 0.05      # punitorio sobre lo que se le cobra al fiador
    svc_yr: float = 0.0        # servicing anual sobre saldo, lo paga el pool a la empresa


@dataclass
class Risk:
    d: float = 0.30            # mora final del plan (pérdida del estudiante, antes del fiador)
    k: float = 1.0             # cuotas pagadas antes de caer en mora
    cov: float = 1.00          # cobertura del fiador (fracción del saldo que garantiza)
    r: float = 0.80            # recupero efectivo del cargo al fiador (bruto)
    cb: float = 0.05           # cargos revertidos por desconocimiento
    pi: float = 0.05           # costo de procesar el cobro al fiador


@dataclass
class Pool:
    utilization: float = 0.80  # fracción del pool prestada
    idle_yield: float = 0.045  # ocioso en Kamino/Jupiter (oct-2026: ~4,5%)
    senior_share: float = 0.80
    senior_rate: float = 0.08


@dataclass
class Co:
    kappa: float = 1.0         # KYC + gas + keeper por plan (USD)
    cac: float = 8.0           # adquisición por plan (USD) — supuesto, a medir
    fx_spread: float = 0.01    # spread si la empresa opera la rampa ARS→USDC
    peso_share: float = 0.60   # fracción de cuotas pagadas en pesos


# ---------------------------------------------------------------------------
# Flujos por plan
# ---------------------------------------------------------------------------

def flows(p: Plan, rk: Risk, co: Co = Co()):
    A = p.price * (1 - p.down)
    fee_pool = p.fee_total - p.fee_co
    q = A * (1 + p.interest) / p.n
    R = A * (1 + p.interest)

    # pool: desembolso t=0 (comercio + fee empresa) = A·(1 − fee_pool)
    K = A * (1 - fee_pool)

    # servicing mensual sobre saldo de capital al inicio de cada mes
    svc = [p.svc_yr / 12 * A * (1 - m / p.n) for m in range(p.n)]

    # recupero del fiador: saldo impago (acotado por cobertura) + punitorio
    U = (p.n - rk.k) * q
    guar_gross = min(U * (1 + p.penalty), rk.cov * R * (1 + p.penalty))
    guar_net = rk.r * (1 - rk.cb) * (1 - rk.pi) * guar_gross

    # flujo esperado mensual del pool (para TIR). El recupero cae en el mes n.
    cf = [-K] + [0.0] * p.n
    for m in range(1, p.n + 1):
        paid_ok = q
        paid_def = q if m <= rk.k else 0.0
        cf[m] += (1 - rk.d) * paid_ok + rk.d * paid_def - svc[m - 1]
    cf[p.n] += rk.d * guar_net

    E = sum(cf[1:])
    G = E - K
    r_cycle = G / K

    # estudiante
    student_total = p.down * p.price + R
    surcharge = student_total / p.price - 1
    surcharge_with_fx = surcharge + co.fx_spread * co.peso_share * R / p.price

    # comercio
    merchant_t0 = p.down * p.price + A * (1 - p.fee_total)
    merchant_cost_pct_price = p.fee_total * A / p.price

    # fiador
    guar_exp_cost = rk.d * rk.r * guar_gross
    guar_cap = rk.cov * R * (1 + p.penalty)

    # empresa
    rev_orig = p.fee_co * A
    rev_svc = sum(svc)
    rev_fx = co.fx_spread * co.peso_share * E
    margin = rev_orig + rev_svc + rev_fx - co.kappa - co.cac

    return dict(A=A, K=K, q=q, E=E, G=G, r_cycle=r_cycle,
                annual=(12 / p.n) * r_cycle,
                irr_annual=irr_annual(cf), cf=cf,
                student_total=student_total, surcharge=surcharge,
                surcharge_fx=surcharge_with_fx,
                merchant_t0=merchant_t0, merchant_pct=merchant_cost_pct_price,
                guar_exp=guar_exp_cost, guar_cap=guar_cap,
                rev_orig=rev_orig, rev_svc=rev_svc, rev_fx=rev_fx, margin=margin)


def irr_annual(cf):
    lo, hi = -0.99, 1.0
    for _ in range(200):
        mid = (lo + hi) / 2
        npv = sum(c / (1 + mid) ** t for t, c in enumerate(cf))
        if npv > 0:
            lo = mid
        else:
            hi = mid
    m = (lo + hi) / 2
    return (1 + m) ** 12 - 1


def breakeven_d(p, rk, co=Co()):
    lo, hi = 0.0, 1.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if flows(p, replace(rk, d=mid), co)["G"] > 0:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def tranches(asset_annual, pool: Pool = Pool()):
    r_pool = pool.utilization * asset_annual + (1 - pool.utilization) * pool.idle_yield
    js = 1 - pool.senior_share
    jr = (r_pool - pool.senior_rate * pool.senior_share) / js
    sr = pool.senior_rate
    if jr < -1:
        sr = pool.senior_rate + (jr + 1) * js / pool.senior_share
        jr = -1.0
    return r_pool, sr, jr


# ---------------------------------------------------------------------------
# Esquemas de precio
# ---------------------------------------------------------------------------

SCHEMES = {
    "A. Actual (0% comprador, 7% comercio todo al pool)":
        Plan(interest=0.00, fee_total=0.07, fee_co=0.00, svc_yr=0.0),
    "B. Recomendado en 06 (6% comprador, 7% comercio = 5 pool + 2 empresa, svc 5%)":
        Plan(interest=0.06, fee_total=0.07, fee_co=0.02, svc_yr=0.05),
    "H1. El comercio elige — modo SIN INTERÉS (0% comprador, 10% comercio = 8 pool + 2 empresa)":
        Plan(interest=0.00, fee_total=0.10, fee_co=0.02, svc_yr=0.0),
    "H2. El comercio elige — modo CON COSTO (8% comprador, 3% comercio = 1 pool + 2 empresa)":
        Plan(interest=0.08, fee_total=0.03, fee_co=0.02, svc_yr=0.0),
    "M. Mixto suave (3% comprador, 8% comercio = 6 pool + 2 empresa)":
        Plan(interest=0.03, fee_total=0.08, fee_co=0.02, svc_yr=0.0),
}


# ---------------------------------------------------------------------------
# Economía consolidada en régimen estable (empresa + junior)
# ---------------------------------------------------------------------------

def economics(n_plans, mix, avg_A, opex, co: Co = Co(), other_per_plan=0.0,
              pool: Pool = Pool(), junior_share=0.20):
    """Cada mes entran n_plans; mix = [(peso, Plan, Risk)]. Flujos lineales en el precio."""
    fees = var = profit = live = 0.0
    for w, p, rk in mix:
        p2 = replace(p, price=avg_A / (1 - p.down))
        f = flows(p2, rk, co)
        fees += w * (f["rev_orig"] + f["rev_svc"] + f["rev_fx"])
        var += w * (co.kappa + co.cac)
        profit += w * f["G"]                       # ganancia del pool por plan
        live += w * f["A"] * (p.n + 1) / 2         # meses-capital por plan
    pool_cap = n_plans * live / pool.utilization
    senior = pool_cap * (1 - junior_share)
    junior = pool_cap * junior_share
    pool_mo = n_plans * profit + (pool_cap - n_plans * live) * pool.idle_yield / 12
    junior_mo = pool_mo - senior * pool.senior_rate / 12
    fees_mo = n_plans * (fees + other_per_plan)
    var_mo = n_plans * var
    ebitda = fees_mo - var_mo + junior_mo - opex
    return dict(orig=n_plans * avg_A, pool=pool_cap, junior=junior, fees=fees_mo,
                var=var_mo, junior_mo=junior_mo, ebitda=ebitda,
                pool_annual=12 * pool_mo / pool_cap if pool_cap else 0,
                junior_annual=12 * junior_mo / junior if junior else 0)


def pct(x):
    return f"{x * 100:,.1f}%"


def usd(x):
    return f"{x:,.0f}"


# ---------------------------------------------------------------------------
# Rampa de volumen y reparto recomendado (v3: la empresa gana por sí misma)
# ---------------------------------------------------------------------------

def rampa_volumen(month):
    """(planes/mes, opex) — supuestos propios para dimensionar la ronda."""
    if month <= 6:
        return 30 + 10 * month, 6000            # piloto: 40 → 90
    if month <= 18:
        return 100 + 50 * (month - 6), 14000    # Tucumán + 2da ciudad: 150 → 700
    return 700 + 70 * (month - 18), 25000       # 3 ciudades + Tiendanube: 770 → 1.960


# Lazo cobra en todos los modos 4% de lo financiado (originación) + 2%/año sobre
# saldo (administración). Precios: H1 = 9% del precio en el escalón 0; H2 = 8% al
# comprador + 5% de lo financiado al comercio (3,5% del precio).
REC_CO, REC_SVC = 0.04, 0.02
REC_H1 = Plan(interest=0.00, fee_total=0.09 / 0.70, fee_co=REC_CO, svc_yr=REC_SVC)
REC_H2 = Plan(interest=0.08, fee_total=0.05, fee_co=REC_CO, svc_yr=REC_SVC)
REC_H1_6 = Plan(n=6, interest=0.00, fee_total=0.16, fee_co=REC_CO, svc_yr=REC_SVC)
REC_H2_6 = Plan(n=6, interest=0.14, fee_total=0.04, fee_co=REC_CO, svc_yr=REC_SVC)
REC_CAC = 5.0


def rec_mix(month, rk=Risk()):
    rk6 = replace(rk, d=rk.d + 0.05, k=2)
    if month <= 12:
        return [(0.5, REC_H1, rk), (0.5, REC_H2, rk)]
    return [(0.35, REC_H1, rk), (0.35, REC_H2, rk), (0.15, REC_H1_6, rk6), (0.15, REC_H2_6, rk6)]


def actor_ramp(rk=Risk(), months=36):
    """Por mes: empresa sola (fees − variables − opex), resultado del junior, pool y tramos."""
    rows = []
    for m in range(1, months + 1):
        n, opex = rampa_volumen(m)
        e = economics(n, rec_mix(m, rk), 650.0, opex, Co(cac=REC_CAC))
        empresa = e["fees"] - e["var"] - opex
        rows.append(dict(mes=m, planes=n, opex=opex, pool=e["pool"], junior=e["junior"],
                         empresa=empresa, junior_mo=e["junior_mo"],
                         pool_annual=e["pool_annual"], junior_annual=e["junior_annual"]))
    return rows


def plan_split(p=REC_H1, rk=Risk(), co=Co(cac=REC_CAC)):
    """A dónde va lo que pagan comercio y comprador en un plan (US$)."""
    f = flows(p, rk, co)
    pagado = (p.fee_total + p.interest) * f["A"]
    perdida = pagado - f["rev_orig"] - f["rev_svc"] - f["G"]
    return dict(pagado=pagado, originacion=f["rev_orig"], administracion=f["rev_svc"],
                pool=f["G"], perdida=perdida, rampa=f["rev_fx"])


def empresa_por_plan(rk=Risk(), co=Co(cac=REC_CAC), avg_A=650.0):
    """Ingresos y costos de la empresa por plan, cartera 3 cuotas 50/50 H1/H2."""
    out = dict(originacion=0.0, administracion=0.0, rampa=0.0)
    for w, p, r in rec_mix(1, rk):
        f = flows(replace(p, price=avg_A / (1 - p.down)), r, co)
        out["originacion"] += w * f["rev_orig"]
        out["administracion"] += w * f["rev_svc"]
        out["rampa"] += w * f["rev_fx"]
    out["kyc_gas"] = co.kappa
    out["adquisicion"] = co.cac
    out["margen"] = out["originacion"] + out["administracion"] + out["rampa"] - co.kappa - co.cac
    return out


def tramos_vs(rk_list, month=24):
    """Rendimiento anual del pool, senior y junior en régimen estable para cada riesgo."""
    res = []
    for rk in rk_list:
        e = economics(1, rec_mix(month, rk), 650.0, 0.0, Co(cac=REC_CAC))
        r_pool = e["pool_annual"]
        jr = (r_pool - 0.08 * 0.80) / 0.20
        sr = 0.08
        if jr < -1:
            sr = 0.08 + (jr + 1) * 0.20 / 0.80
            jr = -1.0
        res.append((r_pool, sr, jr))
    return res


def liquidez_si_se_frena(avg_A=650.0, pool=Pool()):
    """% del pool que vuelve a caja mes a mes si se deja de originar (cartera 3 cuotas, régimen estable)."""
    live = cash0 = 0.0
    inflow = [0.0] * 7
    for w, p, rk in rec_mix(1):
        f = flows(replace(p, price=avg_A / (1 - p.down)), rk, Co(cac=REC_CAC))
        live += w * avg_A * (p.n + 1) / 2
        for age in range(p.n):                     # cohortes originadas hace 0..n−1 meses
            for t in range(1, p.n - age + 1):
                inflow[t] += w * f["cf"][age + t]
    cap = live / pool.utilization
    out, acc = [(0, (cap - live) / cap)], cap - live
    for t in range(1, 5):
        acc += inflow[t]
        out.append((t, acc / cap))
    return out


LEGAL = 65000.0          # punto medio de US$50-80k (plan-de-negocio.md §8.1)
COLCHON_MESES = 6        # meses de opex de la etapa 2 (US$14k) como colchón


def ronda(junior_share, rk=Risk(), meses_junior=18):
    """Cuánta plata necesita la empresa: pozo de opex + colchón + legal + su parte del junior."""
    rows = actor_ramp(rk)
    cum = mn = 0.0
    be = None
    for r in rows:
        v = r["empresa"] + junior_share * r["junior_mo"]
        cum += v
        mn = min(mn, cum)
        if be is None and v > 0:
            be = (r["mes"], r["planes"])
    jr = junior_share * max(r["junior"] for r in rows if r["mes"] <= meses_junior)
    colchon = COLCHON_MESES * rampa_volumen(12)[1]
    return dict(pozo=-mn, colchon=colchon, legal=LEGAL, junior=jr,
                total=-mn + colchon + LEGAL + jr, equilibrio=be, acumulado36=cum,
                sponsor_junior=(1 - junior_share) * max(r["junior"] for r in rows if r["mes"] <= meses_junior))


def tramos_participacion(r_pool, part=0.20, senior_share=0.80, piso=0.08):
    """Senior con piso de 8% + `part` del excedente del pool sobre el piso. Junior: el resto."""
    sr = piso + part * max(0.0, r_pool - piso)
    jr = (r_pool - sr * senior_share) / (1 - senior_share)
    if jr < -1:
        sr = sr + (jr + 1) * (1 - senior_share) / senior_share
        jr = -1.0
    return sr, jr


# Recupero "fiador ejecutado": la tarjeta se cobra directo y no se puede sacar con planes activos.
RECUPERO_ALTO = dict(r=0.95, cb=0.03)


def precio_vs_recupero(fees_precio=(0.05, 0.06, 0.07, 0.08, 0.09),
                       recuperos=((0.80, 0.05), (0.90, 0.05), (0.95, 0.03))):
    """Rendimiento del pool en régimen estable con 100% modo sin interés a 3 cuotas, por precio y recupero."""
    out = {}
    for fp in fees_precio:
        for r, cb in recuperos:
            rk = replace(Risk(), r=r, cb=cb)
            mix = [(1.0, replace(REC_H1, fee_total=fp / (1 - REC_H1.down)), rk)]
            e = economics(1, mix, 650.0, 0.0, Co(cac=REC_CAC))
            rp = e["pool_annual"]
            out[(fp, r)] = (rp, (rp - 0.08 * 0.80) / 0.20)
    return out


def main():
    base = Risk()
    print("# Lazo — salida del modelo v2\n")
    print("Base: PC US$1.000, escalón 0 (anticipo 30%), 3 cuotas, mora d=30%, k=1,")
    print("cobertura 100%, recupero r=80%, desconocimiento 5%, procesamiento 5%.")
    print("Pool: 80% prestado, ocioso 4,5%, senior 80% al 8%. Escenarios, no promesas.\n")

    # 0. Corrección del v1
    p_b = list(SCHEMES.values())[1]
    fb = flows(p_b, base)
    print("## 0. Corrección del modelo v1 (esquema B)\n")
    print("| Concepto | v1 (06-viabilidad) | v2 corregido |")
    print("|---|---|---|")
    print(f"| Desembolso del pool t=0 | 679 | {usd(fb['K'])} |")
    print(f"| Servicing pagado por el pool | 0 (no se descontaba) | {fb['rev_svc']:.2f} |")
    print(f"| Rendimiento anual del libro (×4) | 16,0% | {pct(fb['annual'])} |")
    print(f"| TIR anual del libro (cuotas mensuales) | — | {pct(fb['irr_annual'])} |\n")

    # 1. Esquemas
    print("## 1. Esquemas de precio — libro con fiador al 100%\n")
    print("| Esquema | Costo real comprador | Costo comercio (% precio) | Libro d=20% | Libro d=30% | Libro d=40% | Mora de equilibrio | TIR d=30% | Senior / Junior d=30% | Empresa por plan* |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    for name, p in SCHEMES.items():
        f30 = flows(p, base)
        row = [name, pct(f30["surcharge"]), pct(f30["merchant_pct"])]
        for d in (0.20, 0.30, 0.40):
            row.append(pct(flows(p, replace(base, d=d))["annual"]))
        row.append(pct(breakeven_d(p, base)))
        row.append(pct(f30["irr_annual"]))
        _, s, j = tranches(f30["annual"])
        row.append(f"{pct(s)} / {pct(j)}")
        row.append(f"{f30['margin']:+.2f}")
        print("| " + " | ".join(row) + " |")
    print("\n\\* margen de la empresa por plan (US$) = origination + servicing + FX − KYC/gas (US$1) − CAC (US$8).\n")

    # 1b. Comisión del comercio fija en % del precio (referencia banco vs. MP)
    print("## 1b. Comisión del comercio en % del precio: entre el banco y Mercado Pago\n")
    print("Modo sin interés, origination 3%. La comisión se fija en % del precio (como la publican")
    print("banco y MP); el programa la traduce a % de lo financiado según el anticipo del escalón.")
    print("Referencia (tabla de Google modo IA, SIN VERIFICAR): banco ~8,5% + IVA a 8 días hábiles;")
    print("MP ~18-19% + IVA al instante, ambos con tarjeta del comprador.\n")
    print("| Comisión (% precio) | Sobre financiado (esc. 0) | Libro d=30% | Junior d=30% | Mora de equilibrio | Estrés d=40% r=65% | Tarjeta 20% desconoc. | Lazo + junior por plan** | Planes/mes opex US$20k |")
    print("|---|---|---|---|---|---|---|---|---|")
    for price_fee in (0.07, 0.09, 0.126):
        p = Plan(interest=0.0, fee_total=price_fee / (1 - 0.30), fee_co=0.03)
        f = flows(p, base)
        _, _, j = tranches(f["annual"])
        stress = flows(p, replace(base, d=0.40, r=0.65))["annual"]
        cb20 = flows(p, replace(base, cb=0.20))["annual"]
        per_plan = economics(1, [(1.0, p, base)], 650.0, 0.0, Co(cac=5.0))["ebitda"]
        print(f"| {pct(price_fee)} | {pct(p.fee_total)} | {pct(f['annual'])} | {pct(j)} | "
              f"{pct(breakeven_d(p, base))} | {pct(stress)} | {pct(cb20)} | {per_plan:+.2f} | {usd(20000 / per_plan)} |")
    print("\n\\*\\* economía consolidada empresa + junior, A=650 financiado, CAC US$5: no depende del reparto pool/empresa.\n")

    print("**Comisión fija del 9% del precio en la escalera v2**\n")
    print("| Escalón | Anticipo | Cobertura | Sobre financiado | Libro d=30% plano | Libro si d baja 30/25/20/15% |")
    print("|---|---|---|---|---|---|")
    for t, (a, cov) in enumerate([(0.30, 1.00), (0.20, 1.00), (0.15, 0.95), (0.10, 0.90)]):
        p = Plan(down=a, interest=0.0, fee_total=0.09 / (1 - a), fee_co=0.03)
        rk = replace(base, cov=cov, r=0.80 * cov)
        flat = flows(p, rk)["annual"]
        drop = flows(p, replace(rk, d=[0.30, 0.25, 0.20, 0.15][t]))["annual"]
        print(f"| {t} | {pct(a)} | {pct(cov)} | {pct(p.fee_total)} | {pct(flat)} | {pct(drop)} |")
    print()

    # 2. Mezcla H1/H2 por comercio
    print("## 2. Cartera mixta H1/H2 (qué pasa según cuántos comercios eligen \"sin interés\")\n")
    print("| % ventas en modo SIN INTERÉS | Libro d=30% | Junior d=30% | Margen empresa/plan |")
    print("|---|---|---|---|")
    h1, h2 = list(SCHEMES.values())[2], list(SCHEMES.values())[3]
    f1, f2 = flows(h1, base), flows(h2, base)
    for w in (1.0, 0.7, 0.5, 0.3, 0.0):
        ann = w * f1["annual"] + (1 - w) * f2["annual"]
        _, _, j = tranches(ann)
        mg = w * f1["margin"] + (1 - w) * f2["margin"]
        print(f"| {pct(w)} | {pct(ann)} | {pct(j)} | {mg:+.2f} |")
    print()

    # 3. Escaleras
    print("## 3. Escalera de escalones (precio H1 = modo sin interés)\n")
    ladders = {
        "Actual (cobertura baja 100→70%)": [(0.30, 1.00), (0.20, 0.90), (0.10, 0.80), (0.00, 0.70)],
        "v2 (piso de anticipo 10%, cobertura ≥90%)": [(0.30, 1.00), (0.20, 1.00), (0.15, 0.95), (0.10, 0.90)],
    }
    for lname, tiers in ladders.items():
        print(f"**{lname}**\n")
        print("| Escalón | Anticipo | Cobertura | Exposición máx. fiador (% precio) | Costo comercio (% precio) | Libro d=30% plano | Libro si d baja 30/25/20/15% |")
        print("|---|---|---|---|---|---|---|")
        for t, (a, cov) in enumerate(tiers):
            p = replace(h1, down=a)
            rk = replace(base, cov=cov, r=0.80 * cov)
            f_flat = flows(p, rk)
            f_drop = flows(p, replace(rk, d=[0.30, 0.25, 0.20, 0.15][t]))
            print(f"| {t} | {pct(a)} | {pct(cov)} | {pct(f_flat['guar_cap'] / p.price)} | {pct(f_flat['merchant_pct'])} | {pct(f_flat['annual'])} | {pct(f_drop['annual'])} |")
        print()

    # 4. Sensibilidad recupero y rail del fiador
    print("## 4. Sensibilidad: recupero del fiador y rail de cobro (H1, d=30%)\n")
    print("| Rail / supuesto | r | desconocimiento | procesamiento | Libro anual | Mora de equilibrio |")
    print("|---|---|---|---|---|---|")
    rails = [
        ("Tarjeta, caso base", 0.80, 0.05, 0.05),
        ("Tarjeta, muchos desconocimientos", 0.80, 0.20, 0.05),
        ("Tarjeta, recupero pobre", 0.60, 0.15, 0.05),
        ("DEBIN/CBU del fiador", 0.75, 0.02, 0.01),
        ("Fiador paga en USDC (mandato)", 0.70, 0.00, 0.002),
    ]
    for name, r, cb, pi in rails:
        rk = replace(base, r=r, cb=cb, pi=pi)
        print(f"| {name} | {pct(r)} | {pct(cb)} | {pct(pi)} | {pct(flows(h1, rk)['annual'])} | {pct(breakeven_d(h1, rk))} |")
    print()

    print("| d \\ r (H1) | 50% | 65% | 80% | 90% |")
    print("|---|---|---|---|---|")
    for d in (0.15, 0.25, 0.30, 0.35, 0.45):
        cells = [pct(flows(h1, replace(base, d=d, r=r))["annual"]) for r in (0.5, 0.65, 0.8, 0.9)]
        print(f"| {pct(d)} | " + " | ".join(cells) + " |")
    print()

    # 5. Tramo sin fiador
    print("## 5. Tramo sin fiador (S0: anticipo 50%, tope US$150, modo H1)\n")
    print("| Mora | Resultado por plan (US$) | Anual |")
    print("|---|---|---|")
    s0 = replace(h1, price=150, down=0.50)
    for d in (0.10, 0.20, 0.30):
        f = flows(s0, replace(base, d=d, cov=0.0, r=0.0))
        print(f"| {pct(d)} | {f['G']:+.2f} | {pct(f['annual'])} |")
    print()

    # 6. Capital y P&L por etapa (régimen estable)
    print("## 6. Capital necesario y P&L mensual por etapa (régimen estable)\n")
    print("Economía consolidada empresa + tramo junior (la empresa/sponsor pone el junior).")
    print("Cartera: 3 cuotas, 50% modo sin interés (H1) / 50% con costo (H2), financiado medio US$500.\n")
    base_mix = [(0.5, h1, base), (0.5, h2, base)]
    stages = [
        ("Piloto (2-3 comercios)", 50, 6000),
        ("Ciudad 1 (Tucumán, 10-20 comercios)", 300, 12000),
        ("3 ciudades + Tiendanube", 1000, 20000),
        ("Escala nacional", 3000, 35000),
    ]
    print("| Etapa | Planes/mes | Originado/mes | Pool necesario | Junior 20% | Fees empresa | Variables | Resultado junior | Opex | EBITDA/mes |")
    print("|---|---|---|---|---|---|---|---|---|---|")
    for name, n, opex in stages:
        e = economics(n, base_mix, 500.0, opex)
        print(f"| {name} | {n} | {usd(e['orig'])} | {usd(e['pool'])} | {usd(e['junior'])} | {usd(e['fees'])} | {usd(e['var'])} | {usd(e['junior_mo'])} | {usd(opex)} | {usd(e['ebitda'])} |")
    e1 = economics(1000, base_mix, 500.0, 0)
    print(f"\nRendimiento anual del pool en régimen estable: {pct(e1['pool_annual'])}; junior: {pct(e1['junior_annual'])}.")
    print("Cartera viva = (n+1)/2 meses de originación. Opex por etapa: supuesto propio.\n")

    # 6b. Palancas para llegar al equilibrio
    print("## 6b. Palancas: planes/mes para cubrir el opex (EBITDA = 0)\n")
    h1_6 = Plan(n=6, interest=0.00, fee_total=0.16, fee_co=0.03)
    h2_6 = Plan(n=6, interest=0.14, fee_total=0.04, fee_co=0.03)
    rk6 = replace(base, d=0.35, k=2)
    h1_o3, h2_o3 = replace(h1, fee_co=0.03), replace(h2, fee_co=0.03)
    levers = [
        ("Base: 3 cuotas, A=500, CAC 8, origination 2%", base_mix, 500.0, Co(), 0.0),
        ("+ ticket medio A=650 (notebooks/PC)", base_mix, 650.0, Co(), 0.0),
        ("+ origination 3% (en vez de 2%)", [(0.5, h1_o3, base), (0.5, h2_o3, base)], 650.0, Co(), 0.0),
        ("+ CAC US$5/plan (recompra: US$15 por usuario, 3 planes)", [(0.5, h1_o3, base), (0.5, h2_o3, base)], 650.0, Co(cac=5.0), 0.0),
        ("+ 40% de la originación en 6 cuotas (mora 35%)", [(0.3, h1_o3, base), (0.3, h2_o3, base), (0.2, h1_6, rk6), (0.2, h2_6, rk6)], 650.0, Co(cac=5.0), 0.0),
        ("+ otros ingresos US$3/plan (graduación/datos/SaaS — hipótesis)", [(0.3, h1_o3, base), (0.3, h2_o3, base), (0.2, h1_6, rk6), (0.2, h2_6, rk6)], 650.0, Co(cac=5.0), 3.0),
    ]
    print("| Configuración | Margen fees/plan | Resultado junior/plan | Equilibrio opex US$20k | Equilibrio opex US$35k | Pool a US$35k |")
    print("|---|---|---|---|---|---|")
    for name, mix, A_avg, co_, other in levers:
        e = economics(1, mix, A_avg, 0.0, co_, other)
        per_plan = e["ebitda"]
        be20 = 20000 / per_plan if per_plan > 0 else float("inf")
        be35 = 35000 / per_plan if per_plan > 0 else float("inf")
        pool35 = economics(be35, mix, A_avg, 0.0, co_, other)["pool"]
        print(f"| {name} | {e['fees'] - e['var'] + other:+.2f} | {e['junior_mo']:+.2f} | {usd(be20)} | {usd(be35)} | {usd(pool35)} |")
    print()

    # 6c. Rampa a 36 meses y necesidad de fondeo (escenario)
    print("## 6c. Rampa a 36 meses y cuánta plata hace falta (escenario, no pronóstico)\n")
    print("Mix: 3 cuotas 50/50 H1/H2 + desde el mes 13, 30% en 6 cuotas; A=650; CAC US$5; origination 3%.")
    print("Volumen y opex por mes: supuestos propios para dimensionar la ronda.\n")
    mix3 = [(0.5, replace(h1, fee_co=0.03), base), (0.5, replace(h2, fee_co=0.03), base)]
    mix36 = [(0.35, replace(h1, fee_co=0.03), base), (0.35, replace(h2, fee_co=0.03), base),
             (0.15, Plan(n=6, interest=0.00, fee_total=0.16, fee_co=0.03), replace(base, d=0.35, k=2)),
             (0.15, Plan(n=6, interest=0.14, fee_total=0.04, fee_co=0.03), replace(base, d=0.35, k=2))]

    ramp = rampa_volumen

    for label, rk_override in (("Base (d=30%, r=80%)", None),
                               ("Estrés (d=40%, r=65%)", dict(d=0.40, r=0.65))):
        cum = min_cum = 0.0
        max_junior = 0.0
        be_month = None
        rows = []
        for m in range(1, 37):
            n, opex = ramp(m)
            mix = mix3 if m <= 12 else mix36
            if rk_override:
                mix = [(w, p, replace(rk, **rk_override)) for w, p, rk in mix]
            e = economics(n, mix, 650.0, opex, Co(cac=5.0))
            cum += e["ebitda"]
            min_cum = min(min_cum, cum)
            max_junior = max(max_junior, e["junior"])
            if be_month is None and e["ebitda"] > 0:
                be_month = m
            if m in (6, 12, 18, 24, 30, 36):
                rows.append((m, n, e["orig"], e["pool"], e["ebitda"], cum))
        print(f"**{label}**\n")
        print("| Mes | Planes/mes | Originado/mes | Pool | EBITDA/mes | Acumulado |")
        print("|---|---|---|---|---|---|")
        for m, n, orig, poolc, eb, c in rows:
            print(f"| {m} | {n} | {usd(orig)} | {usd(poolc)} | {usd(eb)} | {usd(c)} |")
        be_txt = f"mes {be_month}" if be_month else "no llega en 36 meses"
        print(f"\nEquilibrio mensual: {be_txt}. Pérdida acumulada máxima: US${usd(-min_cum)}. "
              f"Junior máximo a fondear: US${usd(max_junior)}.\n")

    # 7. Flujos por actor del caso PC (H1 y H2)
    print("## 7. Caso PC US$1.000, escalón 0 — cada actor\n")
    for name, f in (("H1 sin interés", f1), ("H2 con costo", f2)):
        print(f"**{name}**: comprador paga {usd(f['student_total'])} (+{pct(f['surcharge'])}); "
              f"comercio cobra hoy {usd(f['merchant_t0'])} ({pct(f['merchant_pct'])} del precio); "
              f"pool desembolsa {usd(f['K'])} y espera recuperar {usd(f['E'])}; "
              f"empresa cobra {f['rev_orig']:.2f} de origination; fiador: costo esperado {usd(f['guar_exp'])}, máximo {usd(f['guar_cap'])}.\n")

    # 8. Reparto recomendado: la empresa gana por sí misma
    print("## 8. Reparto recomendado (v3): rentabilidad de la empresa, el pool y los inversores\n")
    print("Lazo cobra 4% de lo financiado (originación) + 2%/año sobre saldo (administración) en todos los modos.")
    print("H1 = 9% del precio; H2 = 8% al comprador + 5% de lo financiado al comercio. CAC US$5. Desde el mes 13, 30% en 6 cuotas.\n")
    print("| Modo | Costo comprador | Costo comercio (% precio) | Libro d=30% | Junior d=30% |")
    print("|---|---|---|---|---|")
    for name, p, rk in (("H1 3 cuotas", REC_H1, base), ("H2 3 cuotas", REC_H2, base),
                        ("H1 6 cuotas (d=35%)", REC_H1_6, replace(base, d=0.35, k=2)),
                        ("H2 6 cuotas (d=35%)", REC_H2_6, replace(base, d=0.35, k=2))):
        f = flows(p, rk)
        _, _, j = tranches(f["annual"])
        print(f"| {name} | {pct(f['surcharge'])} | {pct(f['merchant_pct'])} | {pct(f['annual'])} | {pct(j)} |")
    sp = plan_split()
    print(f"\n**PC US$1.000 en H1:** comercio paga {sp['pagado']:.2f}; originación {sp['originacion']:.2f}; "
          f"administración {sp['administracion']:.2f}; pérdida esperada neta de mora y cobro {sp['perdida']:.2f}; "
          f"ganancia esperada del pool {sp['pool']:.2f}. Rampa (lo paga el estudiante aparte): {sp['rampa']:.2f}.\n")
    ep = empresa_por_plan()
    print("**Empresa por plan (ticket financiado medio US$650, 3 cuotas 50/50):** "
          + ", ".join(f"{k} {v:+.2f}" for k, v in ep.items()) + "\n")
    print("| d | Pool | Senior | Junior |")
    print("|---|---|---|---|")
    for d, (rp, sr, jr) in zip((0.10, 0.20, 0.30, 0.40, 0.50),
                               tramos_vs([replace(base, d=d) for d in (0.10, 0.20, 0.30, 0.40, 0.50)])):
        print(f"| {pct(d)} | {pct(rp)} | {pct(sr)} | {pct(jr)} |")
    print()
    for label, rk in (("Base (d=30%, r=80%)", base), ("Estrés (d=40%, r=65%)", replace(base, d=0.40, r=0.65))):
        rows = actor_ramp(rk)
        print(f"**Rampa 36 meses, {label}**\n")
        print("| Mes | Planes | Empresa sola | Junior (resultado) | Empresa + 50% junior | Empresa + 100% junior | Pool anual | Junior anual |")
        print("|---|---|---|---|---|---|---|---|")
        for r in rows:
            if r["mes"] in (6, 12, 18, 24, 30, 36):
                print(f"| {r['mes']} | {r['planes']} | {usd(r['empresa'])} | {usd(r['junior_mo'])} | "
                      f"{usd(r['empresa'] + 0.5 * r['junior_mo'])} | {usd(r['empresa'] + r['junior_mo'])} | "
                      f"{pct(r['pool_annual'])} | {pct(r['junior_annual'])} |")
        for key, share in (("sola", 0.0), ("+50% junior", 0.5), ("+100% junior", 1.0)):
            cum = mn = 0.0
            be = None
            for r in rows:
                v = r["empresa"] + share * r["junior_mo"]
                cum += v
                mn = min(mn, cum)
                if be is None and v > 0:
                    be = r["mes"]
            print(f"\n- Empresa {key}: equilibrio mensual {'mes ' + str(be) if be else 'no llega'}; "
                  f"pozo máximo US${usd(-mn)}; acumulado a 36 meses US${usd(cum)}.", end="")
        print("\n")

    # 9. Liquidez del pool y tamaño de la ronda
    print("## 9. Liquidez del pool y cuánta plata necesita la empresa\n")
    print("**Si se deja de originar, cuánto del pool vuelve a caja** (cartera 3 cuotas, régimen estable):\n")
    print("| Mes | % del pool en caja (acumulado) |")
    print("|---|---|")
    for t, v in liquidez_si_se_frena():
        print(f"| {t} | {pct(v)} |")
    print("\n**Rendimiento según cuánto del pool se presta** (el resto queda en caja/Kamino al 4,5%):\n")
    print("| Prestado | Pool | Junior |")
    print("|---|---|---|")
    for u in (0.6, 0.7, 0.8, 0.9):
        e = economics(1, rec_mix(24), 650.0, 0.0, Co(cac=REC_CAC), pool=Pool(utilization=u))
        print(f"| {pct(u)} | {pct(e['pool_annual'])} | {pct(e['junior_annual'])} |")
    print("\n**Senior y junior en años buenos y malos** (régimen estable):\n")
    print("| Año | Mora | Recupero | Pool | Senior | Junior |")
    print("|---|---|---|---|---|---|")
    for lab, d, r in (("Bueno", 0.20, 0.80), ("Normal", 0.30, 0.80), ("Malo", 0.40, 0.65), ("Muy malo", 0.50, 0.50)):
        rp, sr, jr = tramos_vs([replace(base, d=d, r=r)])[0]
        print(f"| {lab} | {pct(d)} | {pct(r)} | {pct(rp)} | {pct(sr)} | {pct(jr)} |")
    print(f"\n**Ronda de la empresa** (legal US${usd(LEGAL)}, colchón {COLCHON_MESES} meses de opex de US$14k, junior al mes 18):\n")
    print("| Parte del junior que pone Lazo | Pozo de opex | Colchón | Legal | Junior propio | Total | Equilibrio mensual | Junior que pone el sponsor | Acumulado 36 meses |")
    print("|---|---|---|---|---|---|---|---|---|")
    for sh in (0.0, 0.25, 0.5, 1.0):
        rd = ronda(sh)
        print(f"| {pct(sh)} | {usd(rd['pozo'])} | {usd(rd['colchon'])} | {usd(rd['legal'])} | {usd(rd['junior'])} | "
              f"**{usd(rd['total'])}** | mes {rd['equilibrio'][0]} ({rd['equilibrio'][1]} planes/mes) | "
              f"{usd(rd['sponsor_junior'])} | {usd(rd['acumulado36'])} |")
    print()

    # 10. Recupero alto del fiador, precio al comercio y estructura del senior
    print("## 10. Si el fiador paga casi siempre: precio al comercio y reparto entre tramos\n")
    print("**Pérdida por mora en una PC de US$1.000 (H1, 9% del precio, mora 30%) según el recupero del fiador:**\n")
    print("| Recupero del fiador | Desconocimientos | Pérdida neta | Ganancia del pool |")
    print("|---|---|---|---|")
    for r, cb in ((0.0, 0.05), (0.5, 0.05), (0.8, 0.05), (0.9, 0.05), (0.95, 0.03)):
        sp = plan_split(rk=replace(base, r=r, cb=cb))
        print(f"| {pct(r)} | {pct(cb)} | {sp['perdida']:.2f} | {sp['pool']:+.2f} |")
    print("\n**Pool / junior en régimen estable, todo modo sin interés a 3 cuotas, según la comisión (% del precio) y el recupero:**\n")
    grid = precio_vs_recupero()
    print("| Comisión | Recupero 80% | Recupero 90% | Recupero 95% (tarjeta ejecutada) |")
    print("|---|---|---|---|")
    for fp in (0.05, 0.06, 0.07, 0.08, 0.09):
        cells = [f"{pct(grid[(fp, r)][0])} / {pct(grid[(fp, r)][1])}" for r in (0.80, 0.90, 0.95)]
        print(f"| {pct(fp)} | " + " | ".join(cells) + " |")
    print("\n**Tres formas de repartir entre senior y junior** (régimen estable, cartera recomendada):\n")
    print("| Año | Pool | A. Senior fijo 8% / junior | B. Senior 8% + 20% del excedente / junior | C. Un solo tramo |")
    print("|---|---|---|---|---|")
    for lab, d, r in (("Bueno", 0.20, 0.80), ("Normal", 0.30, 0.80), ("Malo", 0.40, 0.65), ("Muy malo", 0.50, 0.50)):
        rp, sr, jr = tramos_vs([replace(base, d=d, r=r)])[0]
        sb, jb = tramos_participacion(rp)
        print(f"| {lab} | {pct(rp)} | {pct(sr)} / {pct(jr)} | {pct(sb)} / {pct(jb)} | {pct(rp)} |")
    print()


if __name__ == "__main__":
    main()
