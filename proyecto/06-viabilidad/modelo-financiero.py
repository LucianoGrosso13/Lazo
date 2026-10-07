#!/usr/bin/env python3
"""
Lazo — Modelo financiero y flujos de caja (proyecto/06-viabilidad)
=================================================================

Modelo reproducible de la unidad económica, del pool de liquidez y del P&L de la
empresa. Extiende research/d-modelo-economico-pool.md (03/10/2026) agregando:
- split del fee del comercio entre pool y empresa (origination)
- servicing fee sobre cartera
- spread FX sobre cuotas pagadas en pesos
- waterfall junior/senior con utilización parcial del capital
- P&L de la empresa a escala y punto de equilibrio operativo
- riesgo de desconocimiento de cargo (chargeback) sobre el cobro al fiador

Todo parámetro es explícito y modificable. Los resultados se imprimen como
tablas Markdown listas para pegar en los documentos de `proyecto/06-viabilidad/`.

Autor: análisis de viabilidad 06/10/2026 (Devin + equipo). Nada de esto es
asesoría financiera; son escenarios con supuestos declarados.
"""

from dataclasses import dataclass, field, replace

# ---------------------------------------------------------------------------
# Parámetros por plan
# ---------------------------------------------------------------------------

@dataclass
class PlanParams:
    price: float = 1000.0          # P — precio de la compra (USD)
    down: float = 0.30             # a — anticipo (fracción del precio)
    installments: int = 3          # n — cuotas mensuales
    interest: float = 0.00         # i — interés total sobre lo financiado
    fee_total: float = 0.07        # c_total — descuento del comercio sobre lo financiado
    fee_co: float = 0.00           # c_co — parte del fee que retiene la EMPRESA (origination)
    penalty: float = 0.05          # pun — punitorio fijo sobre cuota vencida
    svc_fee_yr: float = 0.05       # servicing anual sobre saldo vivo → empresa


@dataclass
class RiskParams:
    d: float = 0.30                # probabilidad de default final del plan
    k: float = 1.0                 # cuotas pagadas en promedio antes del default
    f: float = 1.00                # fracción de la cartera con fiador
    r: float = 0.80                # recupero del fiador sobre el saldo impago
    cb: float = 0.05               # desconocimiento del cargo al fiador (chargeback)
    pi: float = 0.05               # costo de procesar el cobro al fiador (Mobbex/MP)


@dataclass
class PoolParams:
    utilization: float = 0.80      # fracción del capital desplegada en crédito
    idle_yield: float = 0.06       # rendimiento del capital ocioso (Kamino ~6%)
    senior_share: float = 0.80     # parte del pool en tramo senior
    senior_rate: float = 0.08      # cupón anual prometido al senior


@dataclass
class CoParams:
    """Costos e ingresos de la empresa (operadora/originadora)."""
    kappa: float = 1.00            # costo unitario por plan: KYC+gas+keeper+ops (USD)
    cac: float = 8.00              # CAC amortizado por plan originado (USD)
    fx_spread: float = 0.01        # spread que retiene la empresa sobre cuotas en pesos
    peso_share: float = 0.60       # fracción de cuotas cobradas en pesos
    fixed_opex_mo: float = 15000.0 # opex fijo mensual (equipo chico + legal + infra)
    plans_per_user_mo: float = 0.5 # planes/mes por usuario activo (para CAC implícito)


# ---------------------------------------------------------------------------
# Núcleo: flujos por plan
# ---------------------------------------------------------------------------

def plan_flows(pp: PlanParams, rp: RiskParams, co: CoParams):
    """Devuelve los flujos de caja de cada actor para un plan."""
    A = pp.price * (1 - pp.down)                  # financiado por el pool
    fee_pool = pp.fee_total - pp.fee_co           # fee que retiene el pool
    q = A * (1 + pp.interest) / pp.installments   # cuota mensual
    R = A * (1 + pp.interest)                     # total a repagar

    # --- Estudiante ---
    student_t0 = -pp.price * pp.down
    student_per_mo = -q
    student_total = pp.down * pp.price + R        # lo que paga en total
    student_surcharge = student_total / pp.price - 1

    # --- Fiador (esperado) ---
    U = (pp.installments - rp.k) * q              # saldo impago tras default
    guarantor_charge_gross = U * (1 + pp.penalty)
    guarantor_exp_loss = rp.d * rp.r * guarantor_charge_gross  # costo esperado
    guarantor_worst = R * (1 + pp.penalty)        # fianza máxima aprox.

    # --- Comercio ---
    merchant_t0 = pp.down * pp.price + A * (1 - pp.fee_total)
    merchant_discount = pp.fee_total * A
    merchant_discount_pct_price = merchant_discount / pp.price

    # --- Pool ---
    K = A * (1 - fee_pool) + pp.fee_co * A        # cash out: adelanto neto + fee a empresa
    # recaudo esperado
    E = ((1 - rp.d) * R
         + rp.d * (rp.k * q
                   + rp.f * rp.r * (1 - rp.cb) * (1 - rp.pi)
                   * (pp.installments - rp.k) * q * (1 + pp.penalty)))
    G = E - K
    r3m = G / K
    annual_simple = 4 * r3m
    annual_comp = (1 + r3m) ** 4 - 1

    # --- Empresa (por plan) ---
    rev_origination = pp.fee_co * A
    avg_outstanding = A * 0.5 * (pp.installments / pp.installments)  # ~A/2 en promedio
    rev_servicing = pp.svc_fee_yr * avg_outstanding * pp.installments / 12
    collected = E                                  # proxy de cuotas cobradas
    rev_fx = co.fx_spread * co.peso_share * collected
    var_cost = co.kappa + co.cac
    co_margin_plan = rev_origination + rev_servicing + rev_fx - var_cost

    return dict(
        A=A, q=q, R=R, K=K, E=E, G=G, r3m=r3m,
        annual_simple=annual_simple, annual_comp=annual_comp,
        fee_pool=fee_pool,
        student_t0=student_t0, student_per_mo=student_per_mo,
        student_total=student_total, student_surcharge=student_surcharge,
        guarantor_exp_loss=guarantor_exp_loss, guarantor_worst=guarantor_worst,
        merchant_t0=merchant_t0, merchant_discount=merchant_discount,
        merchant_discount_pct_price=merchant_discount_pct_price,
        co_rev_origination=rev_origination, co_rev_servicing=rev_servicing,
        co_rev_fx=rev_fx, co_var_cost=var_cost, co_margin=co_margin_plan,
    )


def breakeven_d(pp: PlanParams, rp: RiskParams, co: CoParams) -> float:
    """Mora a la que la ganancia del pool por plan = 0 (bisección)."""
    lo, hi = 0.0, 1.0
    for _ in range(60):
        mid = (lo + hi) / 2
        g = plan_flows(pp, replace(rp, d=mid), co)["G"]
        if g > 0:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


# ---------------------------------------------------------------------------
# Pool: waterfall junior/senior sobre rendimiento anual
# ---------------------------------------------------------------------------

def tranche_returns(asset_annual: float, pool: PoolParams):
    """Rendimiento anual del pool (con utilización) y split senior/junior."""
    r_pool = pool.utilization * asset_annual + (1 - pool.utilization) * pool.idle_yield
    e = r_pool
    ss, sr, js = pool.senior_share, pool.senior_rate, 1 - pool.senior_share
    junior_ret = (e - sr * ss) / js
    senior_ret = sr
    if junior_ret < -1:  # junior agotado: el senior absorbe el exceso de pérdida
        senior_ret = sr + (junior_ret + 1) * js / ss
        junior_ret = -1.0
    return r_pool, senior_ret, junior_ret


# ---------------------------------------------------------------------------
# Empresa: P&L a escala
# ---------------------------------------------------------------------------

def company_pnl(plans_mo: float, avg_A: float, pp: PlanParams, rp: RiskParams,
                pool: PoolParams, co: CoParams, pool_capital: float):
    """P&L mensual de la empresa a un volumen dado de planes."""
    fl = plan_flows(pp, rp, co)
    scale = avg_A / fl["A"]
    rev_plan = (fl["co_rev_origination"] + fl["co_rev_servicing"]
                + fl["co_rev_fx"]) * scale
    var_plan = fl["co_var_cost"]
    rev_mo = rev_plan * plans_mo
    var_mo = var_plan * plans_mo

    # carry del junior (equity de la empresa/sponsor en el pool)
    asset_annual = fl["annual_simple"]
    _, _, jr = tranche_returns(asset_annual, pool)
    junior_capital = pool_capital * (1 - pool.senior_share)
    jr_mo = junior_capital * jr / 12

    ebitda_mo = rev_mo + jr_mo - var_mo - co.fixed_opex_mo
    return dict(rev_mo=rev_mo, var_mo=var_mo, jr_mo=jr_mo,
                ebitda_mo=ebitda_mo, margin_plan=rev_plan - var_plan)


def breakeven_volume(pp: PlanParams, rp: RiskParams, pool: PoolParams,
                     co: CoParams, avg_A: float):
    """Planes/mes para cubrir opex fijo (sin contar carry del junior)."""
    fl = plan_flows(pp, rp, co)
    scale = avg_A / fl["A"]
    margin_plan = (fl["co_rev_origination"] + fl["co_rev_servicing"]
                   + fl["co_rev_fx"]) * scale - fl["co_var_cost"]
    if margin_plan <= 0:
        return float("inf")
    return co.fixed_opex_mo / margin_plan


# ---------------------------------------------------------------------------
# Reporte
# ---------------------------------------------------------------------------

def usd(x):
    return f"{x:,.2f}"

def pct(x):
    return f"{x*100:,.1f}%"


def main():
    co = CoParams()
    rp_base = RiskParams()          # d=30%, r=80%, f=100%
    pool = PoolParams()

    print("# Modelo financiero Lazo — salida del script\n")
    print("```")
    print("Parámetros base riesgo: d=30%, k=1 cuota, f=100% fiador, r=80% recupero,")
    print("cb=5% desconocimiento, pi=5% procesamiento | pool: u=80%, idle 6%,")
    print("senior 80% @ 8% | empresa: κ=US$1, CAC=US$8, fx 1% (60% cuotas en pesos),")
    print("opex fijo US$15k/mes")
    print("```\n")

    # -- Ejemplo trabajado: PC US$1.000 escalón 0 --------------------------
    ex = PlanParams(price=1000, down=0.30, interest=0.0,
                    fee_total=0.07, fee_co=0.02)   # fee split: 5% pool + 2% empresa
    fl = plan_flows(ex, rp_base, co)
    print("## 1. Flujos por actor — PC US$1.000, escalón 0 (anticipo 30%, 3 cuotas, i=0, fee comercio 7%: 5% pool + 2% empresa)\n")
    print("| Actor | t=0 | Mes 1 | Mes 2 | Mes 3 | Total |")
    print("|---|---|---|---|---|---|")
    print(f"| Estudiante | −{usd(-fl['student_t0'])} (anticipo) | −{usd(-fl['student_per_mo'])} | −{usd(-fl['student_per_mo'])} | −{usd(-fl['student_per_mo'])} | −{usd(fl['student_total'])} |")
    print(f"| Comercio | +{usd(fl['merchant_t0'])} | 0 | 0 | 0 | +{usd(fl['merchant_t0'])} (−{usd(fl['merchant_discount'])} = {pct(fl['merchant_discount_pct_price'])} del precio) |")
    print(f"| Pool | −{usd(fl['K'])} (adelanto −{usd(fl['fee_pool']*fl['A'])} fee + fee empresa {usd(ex.fee_co*fl['A'])}) | +cuota | +cuota | +cuota | esperado {usd(fl['E'])} |")
    print(f"| Empresa | +{usd(fl['co_rev_origination'])} (origination 2%) | +servicing+fx | +servicing+fx | +servicing+fx | {usd(fl['co_rev_origination']+fl['co_rev_servicing']+fl['co_rev_fx'])} bruto |")
    print(f"| Fiador | 0 | 0 | solo si default | cargo {pct(rp_base.r)}·(1−{pct(rp_base.cb)}−{pct(rp_base.pi)})·saldo | costo esperado {usd(fl['guarantor_exp_loss'])} / peor caso {usd(fl['guarantor_worst'])} |\n")

    # -- Comparación de esquemas de precio ---------------------------------
    print("## 2. Rendimiento del libro con-fiador (f=100%, r=80%, cb=5%) según esquema de precio\n")
    print("| Esquema | i est. | fee comercio | d=20% | d=30% | d=40% | break-even d | Costo real estudiante |")
    print("|---|---|---|---|---|---|---|---|")
    esquemas = [
        ("A. Actual (0% est, 7% com → todo al pool)", PlanParams(interest=0.00, fee_total=0.07, fee_co=0.00)),
        ("B. v2 recomendado (6% est, 7% com: 5% pool + 2% empresa)", PlanParams(interest=0.06, fee_total=0.07, fee_co=0.02)),
        ("C. Interés est + fee bajo (10% est, 1,5% com)", PlanParams(interest=0.10, fee_total=0.015, fee_co=0.0)),
        ("D. Comercio-friendly (6% est, 3% com: 2% pool + 1% empresa)", PlanParams(interest=0.06, fee_total=0.03, fee_co=0.01)),
    ]
    for nombre, pp in esquemas:
        row = [nombre, pct(pp.interest), pct(pp.fee_total)]
        for d in (0.20, 0.30, 0.40):
            f2 = plan_flows(pp, replace(rp_base, d=d), co)
            row.append(pct(f2["annual_simple"]))
        row.append(pct(breakeven_d(pp, rp_base, co)))
        row.append(pct(plan_flows(pp, rp_base, co)["student_surcharge"]))
        print("| " + " | ".join(row) + " |")
    print()

    # -- Escalones ---------------------------------------------------------
    print("## 3. Libro por escalón (esquema B: i decreciente, fee 7% → 5% pool + 2% empresa)\n")
    print("| Escalón | anticipo | cobertura fiador | i | pool anual d=30% | break-even d | costo real est. |")
    print("|---|---|---|---|---|---|---|")
    tiers = [
        ("0", 0.30, 1.00, 0.06), ("1", 0.20, 0.90, 0.05),
        ("2", 0.10, 0.80, 0.04), ("3", 0.00, 0.70, 0.03),
    ]
    for nombre, a, cov, i in tiers:
        pp = PlanParams(down=a, interest=i, fee_total=0.07, fee_co=0.02)
        rp = replace(rp_base, r=0.80 * cov)  # recupero efectivo acotado por cobertura
        f2 = plan_flows(pp, rp, co)
        print(f"| {nombre} | {pct(a)} | {pct(cov)} | {pct(i)} | {pct(f2['annual_simple'])} | {pct(breakeven_d(pp, rp, co))} | {pct(f2['student_surcharge'])} |")
    print()

    # -- Sensibilidad d × r (esquema B) ------------------------------------
    print("## 4. Sensibilidad rendimiento anual del libro (esquema B, f=100%) — d × recupero r\n")
    print("| d \\ r | 50% | 65% | 80% | 90% |")
    print("|---|---|---|---|---|")
    pp_b = PlanParams(interest=0.06, fee_total=0.07, fee_co=0.02)
    for d in (0.15, 0.25, 0.30, 0.35, 0.45):
        row = [pct(d)]
        for r in (0.50, 0.65, 0.80, 0.90):
            f2 = plan_flows(pp_b, replace(rp_base, d=d, r=r), co)
            row.append(pct(f2["annual_simple"]))
        print("| " + " | ".join(row) + " |")
    print()

    # -- Waterfall ----------------------------------------------------------
    print("## 5. Waterfall del pool (u=80%, ocioso en Kamino 6%, senior 80% @ 8% anual)\n")
    print("| Escenario del activo (anual) | Pool total | Senior | Junior |")
    print("|---|---|---|---|")
    for label, asset in [("d=20% esquema B", plan_flows(pp_b, replace(rp_base, d=0.20), co)["annual_simple"]),
                         ("d=30% esquema B", plan_flows(pp_b, replace(rp_base, d=0.30), co)["annual_simple"]),
                         ("d=40% esquema B", plan_flows(pp_b, replace(rp_base, d=0.40), co)["annual_simple"]),
                         ("d=30% esquema A (actual)", plan_flows(esquemas[0][1], rp_base, co)["annual_simple"]),
                         ("catástrofe sin fiador d=30%, esq. B", plan_flows(pp_b, replace(rp_base, f=0.0), co)["annual_simple"])]:
        rp_pool, s, j = tranche_returns(asset, pool)
        print(f"| {label} ({pct(asset)}) | {pct(rp_pool)} | {pct(s)} | {pct(j)} |")
    print()

    # -- Mezcla de cartera --------------------------------------------------
    print("## 6. Mezcla: qué pasa si parte del libro no tiene fiador (esquema B, d=30%)\n")
    print("| % del capital con fiador | rendimiento anual libro |")
    print("|---|---|")
    for f in (1.0, 0.9, 0.74, 0.6, 0.5):
        f2 = plan_flows(pp_b, replace(rp_base, f=f), co)
        print(f"| {pct(f)} | {pct(f2['annual_simple'])} |")
    print()

    # -- P&L empresa --------------------------------------------------------
    print("## 7. P&L mensual de la empresa (esquema B; financiado medio A=US$500; pool US$1M, junior 20% del equipo)\n")
    print("| Planes/mes | Ingresos (orig+svc+fx) | Costos variables | Carry junior | Opex fijo | EBITDA mes |")
    print("|---|---|---|---|---|---|")
    for v in (50, 200, 500, 1000, 3000):
        pnl = company_pnl(v, 500, pp_b, rp_base, pool, co, pool_capital=1_000_000)
        print(f"| {v} | {usd(pnl['rev_mo'])} | {usd(pnl['var_mo'])} | {usd(pnl['jr_mo'])} | {usd(co.fixed_opex_mo)} | {usd(pnl['ebitda_mo'])} |")
    print()
    be = breakeven_volume(pp_b, rp_base, pool, co, avg_A=500)
    print(f"**Punto de equilibrio operativo (sin carry del junior): {be:,.0f} planes/mes.**\n")

    # -- Unit economics resumen --------------------------------------------
    print("## 8. Unit economics por plan (esquema B, d=30%)\n")
    print("| Concepto | Empresa | Pool |")
    print("|---|---|---|")
    for avg_A in (500.0, 700.0):
        price = avg_A / (1 - pp_b.down)
        pp_avg = replace(pp_b, price=price)
        fa = plan_flows(pp_avg, rp_base, co)
        rev = fa["co_rev_origination"] + fa["co_rev_servicing"] + fa["co_rev_fx"]
        print(f"| **A={usd(avg_A)}** ingreso | orig {usd(fa['co_rev_origination'])} + svc {usd(fa['co_rev_servicing'])} + fx {usd(fa['co_rev_fx'])} = **{usd(rev)}** | fee {usd(fa['fee_pool']*avg_A)} + interés/recuperos |")
        print(f"| {(' '*7)}costo variable | κ {usd(co.kappa)} + CAC {usd(co.cac)} = {usd(fa['co_var_cost'])} | pérdidas esperadas (en E) |")
        print(f"| {(' '*7)}**margen/plan** | **{usd(rev - fa['co_var_cost'])}** | {pct(fa['r3m'])} por ciclo → {pct(fa['annual_simple'])}/año |")
    print()

    print("---")
    print("Notas: d = pérdida final del plan (conservador: irregularidad BCRA 34% incluye")
    print("curas). E incluye punitorio cobrado al fiador. Servicing = 5%/año sobre saldo")
    print("vivo medio (~A/2 por 3 meses). FX = 1% sobre cuotas cobradas en pesos (60%).")
    print("Todo es escenario, no proyección garantizada.")


if __name__ == "__main__":
    main()
