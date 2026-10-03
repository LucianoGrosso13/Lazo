import { redirect } from "next/navigation";

/** Preserve links from the store and the original shared header. */
export default function StudentPanelAlias() {
  redirect("/app/estudiante");
}
