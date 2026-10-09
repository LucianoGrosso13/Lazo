"use client";

import { landingEquipo } from "@/i18n/dictionaries/landing-equipo";
import { useT } from "@/i18n/locale";
import styles from "./team.module.css";

/** El equipo comparte producto y desarrollo; cada biografía cuenta su recorrido. */
export function QuienesSomos() {
  const t = useT(landingEquipo).quienesSomos;

  return (
    <section id="quienes-somos" className={styles.section} aria-labelledby="quienes-somos-title">
      <div className={styles.teamIntro}>
        <div className={styles.sectionHead}>
          <h2 id="quienes-somos-title" className={styles.h2}>
            {t.title}
          </h2>
          <p className={styles.sectionLede}>{t.problem}</p>
        </div>
        <div className={styles.sharedStory}>
          <p className={styles.sharedHeadline}>{t.sharedHeadline}</p>
          <p className={styles.sharedEducation}>{t.education}</p>
          <p className={styles.sharedGraduation}>{t.graduation}</p>
        </div>
      </div>

      <div className={styles.teamGrid}>
        {t.members.map((member) => (
          <article key={member.initials} className={styles.memberCard} aria-labelledby={`member-${member.initials}`}>
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
                  <h3 id={`member-${member.initials}`} className={styles.memberName}>{member.name}</h3>
                  <span className={styles.memberAge}>{member.age} {t.ageUnit}</span>
                </div>
                <p className={styles.memberRole}>{member.role}</p>
              </div>
            </div>

            <div className={styles.memberBio}>
              {member.bio.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
