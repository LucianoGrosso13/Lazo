import { redirect } from "next/navigation";

/** Preserve old links to the demo account page: la cuenta vive en /app. */
export default function AccountAlias() {
  redirect("/app/estudiante");
}
