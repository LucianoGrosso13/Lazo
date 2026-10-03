import { defineDict } from "../locale";

export const demoClock = defineDict({
  es: {
    toggle: (days: string) => `Día ${days}`,
    expand: "Abrir el reloj de demo",
    collapse: "Cerrar el reloj de demo",
    title: "Reloj de demo",
    simulated: "simulado",
    advancedCaption: (days: string) =>
      days === "1" ? "día adelantado" : "días adelantados",
    advanceGroup: "Adelantar el tiempo",
    advance: (n: number) => `+${n} ${n === 1 ? "día" : "días"}`,
    reset: "Reiniciar demo",
    resetConfirm: "Tocá de nuevo para confirmar",
    moraTitle: "Línea de mora",
    noLate: "Sin cuotas vencidas",
    daysLate: (days: string) =>
      `${days} ${days === "1" ? "día" : "días"} de atraso`,
    stages: {
      grace: "gracia",
      notice: "aviso al fiador",
      penalty: "punitorio",
      charge: "cobro al fiador",
    },
    stageDay: {
      grace: (graceDays: number) => `días 1–${graceDays}`,
      notice: (day: number) => `día ${day}`,
      penalty: (fromDay: number) => `desde el día ${fromDay}`,
      charge: (day: number) => `día ${day}`,
    },
    rulerAria: (daysLate: string, stage: string) =>
      `La cuota más atrasada lleva ${daysLate} días de mora, en el tramo ${stage}.`,
  },
  en: {
    toggle: (days: string) => `Day ${days}`,
    expand: "Open the demo clock",
    collapse: "Close the demo clock",
    title: "Demo clock",
    simulated: "simulated",
    advancedCaption: (days: string) =>
      days === "1" ? "day advanced" : "days advanced",
    advanceGroup: "Advance time",
    advance: (n: number) => `+${n} ${n === 1 ? "day" : "days"}`,
    reset: "Reset demo",
    resetConfirm: "Tap again to confirm",
    moraTitle: "Late-payment timeline",
    noLate: "No overdue installments",
    daysLate: (days: string) => `${days} ${days === "1" ? "day" : "days"} late`,
    stages: {
      grace: "grace",
      notice: "guarantor notified",
      penalty: "late fee",
      charge: "guarantor charged",
    },
    stageDay: {
      grace: (graceDays: number) => `days 1–${graceDays}`,
      notice: (day: number) => `day ${day}`,
      penalty: (fromDay: number) => `from day ${fromDay}`,
      charge: (day: number) => `day ${day}`,
    },
    rulerAria: (daysLate: string, stage: string) =>
      `The most overdue installment is ${daysLate} days late, in the ${stage} stage.`,
  },
});
