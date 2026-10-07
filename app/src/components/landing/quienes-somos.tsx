"use client";

import { landingEquipo } from "@/i18n/dictionaries/landing-equipo";
import { useT } from "@/i18n/locale";
import styles from "./team.module.css";

/**
 * Sección "Quiénes somos": el equipo detrás de Lazo.
 * Enfoque serio y pulido en el problema de acceso al crédito para jóvenes sin tarjeta,
 * sin fotos (monogramas Prisma) y sin datos inventados.
 */
export function QuienesSomos() {
  const t = useT(landingEquipo).quienesSomos;

  return (
    <section id="quienes-somos" className={styles.section} aria-labelledby="quienes-somos-title">
      <div className={styles.sectionHead}>
        <h2 id="quienes-somos-title" className={styles.h2}>
          {t.title}
        </h2>
        <p className={styles.sectionLede}>{t.problem}</p>
      </div>

      <div className={styles.problemPanel}>
        <p className={styles.sharedHeadline}>{t.sharedHeadline}</p>
        <div className={styles.sharedBanner}>
          <div className={styles.tagsRow}>
            <span className={styles.infoTag}>{t.university}</span>
            <span className={styles.infoTag}>{t.graduation}</span>
            <span className={styles.infoTag}>{t.friendship}</span>
          </div>
        </div>
      </div>

      <div className={styles.teamGrid}>
        {t.members.map((member) => (
          <article key={member.name} className={styles.memberCard}>
            <div>
              <div className={styles.memberHeader}>
                <span
                  aria-hidden="true"
                  className={styles.monogram}
                  style={{ ["--mg" as string]: member.gradient }}
                >
                  {member.initials}
                </span>
                <div className={styles.memberMeta}>
                  <div className={styles.memberNameRow}>
                    <h3 className={styles.memberName}>{member.name}</h3>
                    <span className={styles.memberAge}>{member.age}</span>
                  </div>
                  <span className={styles.memberRole}>{member.role}</span>
                </div>
              </div>

              <p className={styles.memberInterest}>{member.interest}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
