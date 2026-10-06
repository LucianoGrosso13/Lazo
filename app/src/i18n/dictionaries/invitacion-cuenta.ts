import { defineDict } from "../locale";

// Textos de la invitación al garante (InviteGuarantor): crear el enlace,
// copiarlo y compartirlo por WhatsApp. En mock declara que el enlace es de la
// demo y solo funciona en este navegador; en real el token lo firma el
// servidor (HMAC) y el enlace es cross-browser dentro de devnet.
export const invitacionCuenta = defineDict({
  es: {
    title: "Invitar a tu garante",
    body: "Generá un enlace y mandáselo a tu garante. Lo abre sin wallet: el enlace ES su credencial.",
    generate: "Generar enlace de invitación",
    generating: "Generando enlace…",
    error: "No se pudo generar la invitación. Probá de nuevo.",
    retry: "Reintentar",
    linkLabel: "Tu enlace de invitación",
    copy: "Copiar",
    copied: "Copiado",
    whatsapp: "Enviar por WhatsApp",
    whatsappMessage:
      "Te invito a ser mi garante en Lazo (demo en devnet, la plata es de prueba). Abrí este enlace en este navegador:",
    whatsappMessageReal:
      "Te invito a ser mi garante en Lazo (demo en devnet, la plata es de prueba). Abrí este enlace:",
    demoNote:
      "Enlace de demostración: vale solo en este navegador porque la demo no tiene servidor compartido. No es una firma ni un documento real.",
    realNote:
      "Enlace firmado por el servidor: tu garante lo abre en cualquier navegador. Corre en devnet (plata de prueba); no es un documento real.",
    pendingTitle: "Las invitaciones todavía no están disponibles",
    pendingBody:
      "En modo real la invitación la firma el servidor (HMAC); si este despliegue no lo tiene habilitado se declara pendiente. No se simula una invitación que no es real.",
  },
  en: {
    title: "Invite your guarantor",
    body: "Generate a link and send it to your guarantor. They open it without a wallet: the link IS their credential.",
    generate: "Generate invite link",
    generating: "Generating link…",
    error: "The invitation could not be generated. Try again.",
    retry: "Try again",
    linkLabel: "Your invite link",
    copy: "Copy",
    copied: "Copied",
    whatsapp: "Send via WhatsApp",
    whatsappMessage:
      "I'm inviting you to be my guarantor on Lazo (devnet demo, test money). Open this link in this browser:",
    whatsappMessageReal:
      "I'm inviting you to be my guarantor on Lazo (devnet demo, test money). Open this link:",
    demoNote:
      "Demo link: it only works in this browser because the demo has no shared server. It is not a signature or a real document.",
    realNote:
      "Server-signed link: your guarantor opens it in any browser. It runs on devnet (test money); it is not a real document.",
    pendingTitle: "Invitations are not available yet",
    pendingBody:
      "In real mode the invitation is signed server-side (HMAC); if this deployment doesn't have it enabled we report it as pending. We don't fake an invitation that isn't real.",
  },
});
