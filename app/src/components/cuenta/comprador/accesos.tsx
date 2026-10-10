"use client";

// Accesos del comprador: "Ver planes" baja a la lista de esta pantalla y
// "Ver comercios" abre el marketplace. Son tarjetas con icono, no botones
// apagados: los accesos también son parte de la historia de la cuenta.
import Link from "next/link";
import { cuentas } from "@/i18n/dictionaries/cuentas";
import { useT } from "@/i18n/locale";
import styles from "./comprador.module.css";

/** Lista de cuotas en curso: tres filas donde solo la primera está hecha. */
function IconPlanes() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="6" cy="6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="6" cy="18" r="1.6" />
      <path d="M10.5 6h8" />
      <path d="M10.5 12h8" />
      <path d="M10.5 18h8" />
    </svg>
  );
}

/** Fachada de comercio: toldo, cuerpo y puerta. */
function IconComercio() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 9.5 6.2 4.8h11.6l1.7 4.7" />
      <path d="M4.5 9.5h15" />
      <path d="M5.5 9.5v9.7h13V9.5" />
      <path d="M9.8 19.2v-4.4h4.4v4.4" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </svg>
  );
}

export function AccesosComprador() {
  const t = useT(cuentas).student;
  return (
    <nav aria-label={t.accessTitle} className={styles.access}>
      {/* Ancla a la sección de planes de esta misma pantalla */}
      <a href="#planes" className={styles.accessCard}>
        <span className={styles.accessIcon}>
          <IconPlanes />
        </span>
        <span className={styles.accessBody}>
          <span className={styles.accessTitle}>{t.goPlans}</span>
          <span className={styles.accessHint}>{t.goPlansHint}</span>
        </span>
        <span className={styles.accessArrow}>
          <Arrow />
        </span>
      </a>
      <Link href="/comercio" className={styles.accessCard}>
        <span className={styles.accessIcon}>
          <IconComercio />
        </span>
        <span className={styles.accessBody}>
          <span className={styles.accessTitle}>{t.goMerchants}</span>
          <span className={styles.accessHint}>{t.goMerchantsHint}</span>
        </span>
        <span className={styles.accessArrow}>
          <Arrow />
        </span>
      </Link>
    </nav>
  );
}
