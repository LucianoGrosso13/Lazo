#!/usr/bin/env python3
"""
Lazo — Modelo financiero v3 (proyecto/07-plan-de-negocio)
=========================================================

Actualizado al 2026-10-07 con la política comercial definitiva decidida para el producto:

1. Política comercial vigente:
   - 3 cuotas: 0% de interés para el estudiante, sin mínimo de compra.
   - 6 cuotas: 3% de interés total sobre lo financiado, desde US$ 350 de compra.
   - Comisión del comercio sobre lo financiado:
     * Hoy (inmediato): 7,00%
     * 30 días (1 tramo): 6,25%
     * 60 días (2 tramos: 50% d30, 50% d60): 5,75% (ajustado desde 5,50% para no subsidiar)
     * 90 días (3 tramos: ⅓ d30, ⅓ d60, ⅓ d90): 5,25%
   - Mecánica de tramos: el anticipo va al comercio el día 0; lo financiado neto se abona
     en tramos mensuales garantizados por Lazo en la cadena (compromiso onchain + chequeo
     de liquidez libre en el pool, sin bóveda escrow inmovilizada).
2. Fianza obligatoria y cobertura 100%:
   - Sin fiador activo no hay plan en ningún tier (Tier 1 a 4).
   - Cobertura 100% del saldo de capital financiado + interés del plan.
   - El punitorio por mora queda fuera de la fianza del fiador (se exige solo al estudiante).
   - Se elimina la idea 11 ("descuentos para el fiador al día").
3. Reparto Lazo (D8):
   - 4% de originación sobre lo financiado (incluido en la comisión del comercio).
   - 2% anual de administración sobre saldo de capital vivo (pagado por el pool a Lazo).
   - El remanente de la comisión y los recuperos quedan íntegramente en el pool.
4. Supuestos:
   - Todos los parámetros son hipótesis de modelado para dimensionar el negocio,
     nunca métricas medidas ni promesas comerciales de Lazo.
   - Corre sobre devnet y tokens simulados.

Correr: python3 -I modelo-v3.py > salida-modelo-v3.md
"""

from dataclasses import dataclass, replace

# ---------------------------------------------------------------------------
# Parámetros del modelo
# ---------------------------------------------------------------------------

@dataclass
class Plan:
    price: float = 1000.0      # P — precio de compra en USD
    down: float = 0.30         # a — anticipo (fracción del precio), va directo al comercio
    n: int = 3                 # cuotas mensuales (3 o 6)
    interest: float = 0.0      # i — costo total al comprador sobre lo financiado (0% o 3%)
    fee_total: float = 0.07    # comisión total del comercio sobre financiado (7%, 6.25%, 5.75%, 5.25%)
    fee_co: float = 0.04       # originación para Lazo (4% sobre financiado D8)
    penalty: float = 0.05      # punitorio al estudiante por mora (no cubierto por fiador)
    svc_yr: float = 0.02       # administración anual sobre saldo que el pool paga a Lazo (2% D8)
    settle_days: int = 0       # 0 (hoy), 30, 60, 90 días
    tranches: int = 0          # cantidad de tramos mensuales (0=inmediato, 1=30d, 2=60d, 3=90d)


@dataclass
class Risk:
    d: float = 0.08            # prob. mora del estudiante (base 8% de doc 08/10; sensibilidad hasta 30%)
    k: float = 1.0             # cuotas pagadas antes del atraso
    cov: float = 1.00          # cobertura del fiador: 100% obligatoria en todos los planes
    r: float = 0.80            # recupero efectivo del cargo al fiador (80%)
    cb: float = 0.05           # desconocimientos de tarjeta del fiador (5%)
    pi: float = 0.05           # arancel de procesamiento de cobro con tarjeta (5%)


@dataclass
class Pool:
    utilization: float = 0.80  # fracción del pool prestada en régimen estable
    idle_yield: float = 0.045  # rendimiento del capital ocioso en DeFi (Kamino/Jupiter ~4,5%)
    senior_share: float = 0.80 # 80% tramo senior
    senior_rate: float = 0.08  # 8% tasa anual fija objetivo del senior


@dataclass
class Co:
    kappa: float = 1.0         # KYC + gas Solana + keeper por plan (USD)
    cac: float = 5.0           # adquisición por plan (USD), considerando recompra en escalera
    fx_spread: float = 0.01    # spread de rampa ARS->USDC si opera la empresa
    peso_share: float = 0.60   # fracción de cuotas pagadas en pesos


# ---------------------------------------------------------------------------
# Flujos por plan
# ---------------------------------------------------------------------------

def flows(p: Plan, rk: Risk, co: Co = Co()):
    A = p.price * (1 - p.down)
    fee_pool = p.fee_total - p.fee_co
    q = A * (1 + p.interest) / p.n
    R = A * (1 + p.interest)

    # Servicio mensual sobre saldo de capital al inicio de cada mes
    svc = [p.svc_yr / 12 * A * (1 - m / p.n) for m in range(p.n)]

    # Fiador cubre 100% de capital + interés contractual impago (punitorio queda afuera)
    U = (p.n - rk.k) * q
    guar_gross = min(U, rk.cov * R)
    guar_net = rk.r * (1 - rk.cb) * (1 - rk.pi) * guar_gross

    # Desembolsos y cronograma de cobro del comercio
    merchant_net_financed = A * (1 - p.fee_total)
    cf = [0.0] * (p.n + 1)
    if p.settle_days == 0:
        K = A * (1 - fee_pool)
        cf[0] = -K
    else:
        # En liquidación diferida en tramos, en t=0 solo se paga la originación a Lazo
        cf[0] = -(p.fee_co * A)
        K = p.fee_co * A
        n_tranches = p.tranches if p.tranches > 0 else (p.settle_days // 30)
        tranche_amt = merchant_net_financed / n_tranches
        for m in range(1, n_tranches + 1):
            cf[m] -= tranche_amt

    # Cobranzas de cuotas a estudiantes
    for m in range(1, p.n + 1):
        paid_ok = q
        paid_def = q if m <= rk.k else 0.0
        cf[m] += (1 - rk.d) * paid_ok + rk.d * paid_def - svc[m - 1]
    cf[p.n] += rk.d * guar_net

    # Ganancia neta G del pool y métrica de ciclo anualizada
    G = sum(cf)
    K_ref = A * (1 - fee_pool)
    r_cycle = G / K_ref
    annual = (12 / p.n) * r_cycle

    # Estudiante
    student_total = p.down * p.price + R
    surcharge = student_total / p.price - 1
    surcharge_with_fx = surcharge + co.fx_spread * co.peso_share * R / p.price

    # Comercio
    merchant_t0 = p.down * p.price + (merchant_net_financed if p.settle_days == 0 else 0.0)
    merchant_cost_pct_price = p.fee_total * A / p.price

    # Fiador
    guar_exp_cost = rk.d * rk.r * guar_gross
    guar_cap = rk.cov * R

    # Empresa (Lazo)
    rev_orig = p.fee_co * A
    rev_svc = sum(svc)
    E_coll = sum(cf[1:]) + (merchant_net_financed if p.settle_days > 0 else 0.0) + (p.fee_co * A)
    rev_fx = co.fx_spread * co.peso_share * E_coll
    margin = rev_orig + rev_svc + rev_fx - co.kappa - co.cac

    return dict(A=A, K=K_ref, q=q, E=E_coll, G=G, r_cycle=r_cycle,
                annual=annual, irr_annual=irr_annual(cf), cf=cf,
                student_total=student_total, surcharge=surcharge,
                surcharge_fx=surcharge_with_fx,
                merchant_t0=merchant_t0, merchant_pct=merchant_cost_pct_price,
                guar_exp=guar_exp_cost, guar_cap=guar_cap,
                rev_orig=rev_orig, rev_svc=rev_svc, rev_fx=rev_fx, margin=margin)


def irr_annual(cf):
    """Calcula la TIR anual de un vector de flujos mensuales por bisección."""
    if cf[0] >= 0:
        return 0.0
    lo, hi = -0.99, 2.0
    for _ in range(120):
        mid = (lo + hi) / 2
        npv = sum(c / (1 + mid) ** t for t, c in enumerate(cf))
        if npv > 0:
            lo = mid
        else:
            hi = mid
    m = (lo + hi) / 2
    try:
        return (1 + m) ** 12 - 1
    except OverflowError:
        return 2.0


def breakeven_d(p, rk, co=Co()):
    """Mora máxima del estudiante que tolera el plan antes de que el pool dé pérdida."""
    lo, hi = 0.0, 1.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if flows(p, replace(rk, d=mid), co)["G"] > 0:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def tranches(asset_annual, pool: Pool = Pool()):
    """Reparto de rendimientos entre tramo senior y junior."""
    r_pool = pool.utilization * asset_annual + (1 - pool.utilization) * pool.idle_yield
    js = 1 - pool.senior_share
    jr = (r_pool - pool.senior_rate * pool.senior_share) / js
    sr = pool.senior_rate
    if jr < -1:
        sr = pool.senior_rate + (jr + 1) * js / pool.senior_share
        jr = -1.0
    return r_pool, sr, jr


# ---------------------------------------------------------------------------
# Planes base vigentes (2026-10-07)
# ---------------------------------------------------------------------------

REC_CO, REC_SVC = 0.04, 0.02
REC_CAC = 5.0

P3_HOY = Plan(n=3, interest=0.00, fee_total=0.07, fee_co=REC_CO, svc_yr=REC_SVC, settle_days=0, tranches=0)
P3_30D = Plan(n=3, interest=0.00, fee_total=0.0625, fee_co=REC_CO, svc_yr=REC_SVC, settle_days=30, tranches=1)
P3_60D = Plan(n=3, interest=0.00, fee_total=0.0575, fee_co=REC_CO, svc_yr=REC_SVC, settle_days=60, tranches=2)
P3_90D = Plan(n=3, interest=0.00, fee_total=0.0525, fee_co=REC_CO, svc_yr=REC_SVC, settle_days=90, tranches=3)

P6_HOY = Plan(n=6, interest=0.03, fee_total=0.07, fee_co=REC_CO, svc_yr=REC_SVC, settle_days=0, tranches=0)
P6_30D = Plan(n=6, interest=0.03, fee_total=0.0625, fee_co=REC_CO, svc_yr=REC_SVC, settle_days=30, tranches=1)
P6_60D = Plan(n=6, interest=0.03, fee_total=0.0575, fee_co=REC_CO, svc_yr=REC_SVC, settle_days=60, tranches=2)
P6_90D = Plan(n=6, interest=0.03, fee_total=0.0525, fee_co=REC_CO, svc_yr=REC_SVC, settle_days=90, tranches=3)

SCHEMES = {
    "1. 3 cuotas, cobro hoy (7% comercio, 0% comprador) [Base actual]": P3_HOY,
    "2. 3 cuotas, 30 días (6,25% comercio, 0% comprador, 1 tramo)": P3_30D,
    "3. 3 cuotas, 60 días (5,75% comercio, 0% comprador, 2 tramos)": P3_60D,
    "4. 3 cuotas, 90 días (5,25% comercio, 0% comprador, 3 tramos)": P3_90D,
    "5. 6 cuotas, cobro hoy (7% comercio, 3% comprador, desde US$ 350)": P6_HOY,
    "6. 6 cuotas, 30 días (6,25% comercio, 3% comprador, 1 tramo)": P6_30D,
    "7. 6 cuotas, 60 días (5,75% comercio, 3% comprador, 2 tramos)": P6_60D,
    "8. 6 cuotas, 90 días (5,25% comercio, 3% comprador, 3 tramos)": P6_90D,
}


# ---------------------------------------------------------------------------
# Economía consolidada y proyecciones
# ---------------------------------------------------------------------------

def economics(n_plans, mix, avg_A, opex, co: Co = Co(), other_per_plan=0.0,
              pool: Pool = Pool(), junior_share=0.20):
    """Cada mes entran n_plans; mix = [(peso, Plan, Risk)]. Flujos lineales en precio."""
    fees = var = profit = live = 0.0
    for w, p, rk in mix:
        p2 = replace(p, price=avg_A / (1 - p.down))
        f = flows(p2, rk, co)
        fees += w * (f["rev_orig"] + f["rev_svc"] + f["rev_fx"])
        var += w * (co.kappa + co.cac)
        profit += w * f["G"]
        live += w * f["A"] * (p.n + 1) / 2
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


def rampa_volumen(month):
    """(planes/mes, opex) por mes según etapa."""
    if month <= 6:
        return 30 + 10 * month, 6000            # piloto: 40 -> 90 planes/mes
    if month <= 18:
        return 100 + 50 * (month - 6), 14000    # Tucumán + 2da ciudad: 150 -> 700
    return 700 + 70 * (month - 18), 25000       # 3 ciudades + Tiendanube: 770 -> 1.960


def rec_mix(month, rk=Risk()):
    """Mezcla ponderada de planes de la cartera según el mes de evolución."""
    if month <= 12:
        # En el primer año predomina 3 cuotas
        return [
            (0.50, P3_HOY, rk),
            (0.25, P3_30D, rk),
            (0.15, P3_60D, rk),
            (0.10, P3_90D, rk)
        ]
    # Desde mes 13 entra 6 cuotas (30% de las ventas en tickets > US$ 350)
    rk6 = replace(rk, d=min(1.0, rk.d + 0.02), k=2)
    return [
        (0.35, P3_HOY, rk),
        (0.175, P3_30D, rk),
        (0.105, P3_60D, rk),
        (0.07, P3_90D, rk),
        (0.15, P6_HOY, rk6),
        (0.075, P6_30D, rk6),
        (0.045, P6_60D, rk6),
        (0.03, P6_90D, rk6),
    ]


def actor_ramp(rk=Risk(), months=36):
    """Evolución mensual a 36 meses."""
    rows = []
    for m in range(1, months + 1):
        n, opex = rampa_volumen(m)
        e = economics(n, rec_mix(m, rk), 650.0, opex, Co(cac=REC_CAC))
        empresa = e["fees"] - e["var"] - opex
        rows.append(dict(mes=m, planes=n, opex=opex, pool=e["pool"], junior=e["junior"],
                         empresa=empresa, junior_mo=e["junior_mo"],
                         pool_annual=e["pool_annual"], junior_annual=e["junior_annual"]))
    return rows


def plan_split(p=P3_HOY, rk=Risk(), co=Co(cac=REC_CAC)):
    """Desglose de a dónde va lo que paga el comercio en una venta representativa."""
    f = flows(p, rk, co)
    pagado = (p.fee_total + p.interest) * f["A"]
    perdida = pagado - f["rev_orig"] - f["rev_svc"] - f["G"]
    return dict(pagado=pagado, originacion=f["rev_orig"], administracion=f["rev_svc"],
                pool=f["G"], perdida=perdida, rampa=f["rev_fx"])


def empresa_por_plan(rk=Risk(), co=Co(cac=REC_CAC), avg_A=650.0):
    """Ingresos y costos unitarios de Lazo por cada compra financiada."""
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
    """Rendimiento anual del pool, senior y junior según distintos perfiles de riesgo."""
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
    """Porcentaje del pool que regresa a caja si se frena la originación."""
    live = 0.0
    inflow = [0.0] * 8
    for w, p, rk in rec_mix(1):
        f = flows(replace(p, price=avg_A / (1 - p.down)), rk, Co(cac=REC_CAC))
        live += w * avg_A * (p.n + 1) / 2
        for age in range(p.n):
            for t in range(1, p.n - age + 1):
                inflow[t] += w * f["cf"][age + t]
    cap = live / pool.utilization
    out, acc = [(0, (cap - live) / cap)], cap - live
    for t in range(1, 5):
        acc += inflow[t]
        out.append((t, acc / cap))
    return out


LEGAL = 65000.0          # estructura legal, licencias y asesoramiento
COLCHON_MESES = 6        # 6 meses de opex etapa 2 (US$14k)


def ronda(junior_share, rk=Risk(), meses_junior=18):
    """Dimensionamiento de la ronda de financiamiento necesaria."""
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
    """Senior con tasa mínima garantizada de 8% + participación en ganancias extraordinarias."""
    sr = piso + part * max(0.0, r_pool - piso)
    jr = (r_pool - sr * senior_share) / (1 - senior_share)
    if jr < -1:
        sr = sr + (jr + 1) * (1 - senior_share) / senior_share
        jr = -1.0
    return sr, jr


def precio_vs_recupero(fees_comercio=(0.05, 0.06, 0.07, 0.08, 0.09),
                       recuperos=((0.80, 0.05), (0.90, 0.05), (0.95, 0.03))):
    """Sensibilidad del rendimiento del pool según tarifa del comercio y recupero del fiador."""
    out = {}
    for fc in fees_comercio:
        for r, cb in recuperos:
            rk = replace(Risk(), r=r, cb=cb)
            mix = [(1.0, replace(P3_HOY, fee_total=fc), rk)]
            e = economics(1, mix, 650.0, 0.0, Co(cac=REC_CAC))
            rp = e["pool_annual"]
            out[(fc, r)] = (rp, (rp - 0.08 * 0.80) / 0.20)
    return out


# ---------------------------------------------------------------------------
# Reporte principal por consola (Markdown)
# ---------------------------------------------------------------------------

def main():
    base = Risk(d=0.08)
    print("# Lazo — Modelo Financiero y Plan de Negocio v3\n")
    print("**Fecha de actualización:** 2026-10-07 · **Entorno:** devnet / mock.")
    print("Todos los parámetros representan hipótesis de trabajo y calibración económica, no métricas históricas.\n")

    print("## 1. Planes vigentes y economía unitaria (PC US$ 1.000, Tier 1 · Starter)")
    print("Anticipo 30% (US$ 300), financiado US$ 700. Fianza obligatoria al 100% (capital + interés).")
    print("Reparto Lazo (D8): originación 4% sobre financiado (US$ 28) + administración 2% anual (US$ 2,33 a 3 cuotas).\n")

    print("| Plan / Plazo | Anticipo | Financiado | Total Comprador | Comisión Comercio | Neto Comercio | Pool Ganancia (G) | Retorno Anual Pool | Margen Lazo |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|---:|")
    for name, p in SCHEMES.items():
        f = flows(p, base)
        print(f"| {name.split('[')[0].strip()} | {usd(p.down*p.price)} | {usd(f['A'])} | {usd(f['student_total'])} | "
              f"{pct(p.fee_total)} | {usd(f['merchant_t0'] if p.settle_days==0 else p.down*p.price + f['A']*(1-p.fee_total))} | "
              f"{f['G']:+.2f} | {pct(f['annual'])} | {f['margin']:+.2f} |")
    print()

    print("## 2. Sensibilidad de riesgo de mora (Escenarios base y de estrés)")
    print("| Escenario | Mora Estudiante (d) | Recupero Fiador (r) | 3 cuotas hoy (Retorno) | 6 cuotas hoy (Retorno) | Senior | Junior |")
    print("|---|---:|---:|---:|---:|---:|---:|")
    for label, d, r in (("Favorable", 0.04, 0.90),
                        ("Base doc 08/10", 0.08, 0.80),
                        ("Moderado", 0.15, 0.75),
                        ("Estrés severo", 0.30, 0.65)):
        rk = replace(base, d=d, r=r)
        f3 = flows(P3_HOY, rk)
        f6 = flows(P6_HOY, rk)
        rp, sr, jr = tramos_vs([rk])[0]
        print(f"| {label} | {pct(d)} | {pct(r)} | {pct(f3['annual'])} | {pct(f6['annual'])} | {pct(sr)} | {pct(jr)} |")
    print()

    print("## 3. Rampa de crecimiento a 36 meses")
    print("Ticket financiado promedio: US$ 650. Rampa: piloto -> Tucumán -> 3 ciudades -> nacional.\n")
    rows = actor_ramp(base)
    print("| Mes | Planes/mes | Opex/mes | Pool Necesario | Junior (20%) | EBITDA Lazo (sola) | EBITDA Lazo (+25% junior) |")
    print("|---|---:|---:|---:|---:|---:|---:|")
    for r in rows:
        if r["mes"] in (1, 6, 12, 18, 24, 30, 36):
            eb_sola = r["empresa"]
            eb_con = r["empresa"] + 0.25 * r["junior_mo"]
            print(f"| {r['mes']} | {r['planes']} | {usd(r['opex'])} | {usd(r['pool'])} | {usd(r['junior'])} | "
                  f"{usd(eb_sola)} | {usd(eb_con)} |")
    print()

    print("## 4. Estructura de la ronda de financiamiento")
    print("Legal: US$ 65k · Colchón: 6 meses de opex (US$ 84k) · Tramo junior fondeado hasta mes 18.\n")
    print("| Participación Junior | Pozo de Pérdida | Colchón | Legal | Junior Propio | Ronda Total | Mes Equilibrio |")
    print("|---|---:|---:|---:|---:|---:|---|")
    for sh in (0.0, 0.25, 0.50, 1.0):
        rd = ronda(sh, base)
        print(f"| {pct(sh)} | {usd(rd['pozo'])} | {usd(rd['colchon'])} | {usd(rd['legal'])} | {usd(rd['junior'])} | "
              f"**{usd(rd['total'])}** | Mes {rd['equilibrio'][0]} ({rd['equilibrio'][1]} planes/mes) |")
    print()


if __name__ == "__main__":
    main()
