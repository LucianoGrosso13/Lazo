"use client";

import Link from "next/link";
import { useCallback } from "react";
import { landingEquipo } from "@/i18n/dictionaries/landing-equipo";
import { useT } from "@/i18n/locale";
import styles from "./team.module.css";

/**
 * Sección "Probalo en 2 minutos": guía paso a paso para que jurados y visitantes
 * recorran la demo interactiva de Lazo.
 */
export function Probalo() {
  const t = useT(landingEquipo).probalo;

  const handleOpenClock = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // Busca el control flotante del reloj de demo para desplegarlo
    const panel = document.getElementById("demo-clock-panel");
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const clockToggle = document.querySelector<HTMLButtonElement>(
      'button[aria-label*="reloj" i], button[aria-label*="clock" i], button[aria-label*="demo" i]'
    );
    if (clockToggle) {
      e.preventDefault();
      clockToggle.click();
      clockToggle.focus();
    }
  }, []);

  return (
    <section id="probalo" className={styles.section} aria-labelledby="probalo-title">
      <div className={styles.sectionHead}>
        <h2 id="probalo-title" className={styles.h2}>
          {t.title}
        </h2>
        <p className={styles.sectionLede}>{t.lede}</p>
      </div>

      <div className={styles.stepsGrid}>
        {t.steps.map((step) => {
          const isClock = step.href === "#reloj-demo";

          return (
            <article key={step.num} className={styles.stepCard}>
              <div className={styles.stepTop}>
                <span className={styles.stepNum}>{step.num}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>

              {isClock ? (
                <a
                  href={step.href}
                  onClick={handleOpenClock}
                  className={styles.stepLink}
                  aria-label={`${step.title} - ${step.linkText}`}
                >
                  <span>{step.linkText}</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.stepLinkIcon}
                  >
                    <path d="M2.5 6h7" />
                    <path d="M6.5 3l3 3-3 3" />
                  </svg>
                </a>
              ) : (
                <Link
                  href={step.href}
                  className={styles.stepLink}
                  aria-label={`${step.title} - ${step.linkText}`}
                >
                  <span>{step.linkText}</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.stepLinkIcon}
                  >
                    <path d="M2.5 6h7" />
                    <path d="M6.5 3l3 3-3 3" />
                  </svg>
                </Link>
              )}
            </article>
          );
        })}
      </div>

      <div className={styles.devnetFooter}>
        <span aria-hidden="true" className={styles.devnetDot} />
        <span className={styles.devnetText}>{t.devnet}</span>
      </div>
    </section>
  );
}
