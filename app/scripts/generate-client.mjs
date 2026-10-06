// Genera el cliente TypeScript (@solana/kit) del programa Cuotas con Codama
// a partir del IDL de Anchor, y lo deja commiteado en `src/generated/`.
// Uso: `npm run generate` (desde `app/`). Con `--check` regenera en un
// directorio temporal y falla si difiere de lo commiteado (para CI).
//
// El IDL vive en `programa/target/idl/cuotas.json` y lo produce `anchor build`
// en el programa. Si el programa todavía no implementó una instrucción
// (ej. `open_plan`), el cliente generado tampoco la trae: `real.ts` lo
// detecta y falla cerrado en vez de inventar datos.
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFromRoot } from "codama";
import { rootNodeFromAnchor } from "@codama/nodes-from-anchor";
import { renderVisitor } from "@codama/renderers-js";

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, "..");
const idlPath = path.resolve(appDir, "..", "programa", "target", "idl", "cuotas.json");
const generatedDir = path.resolve(appDir, "src", "generated");
const metaPath = path.resolve(generatedDir, "meta.json");

const sha256File = async (p) => createHash("sha256").update(await fs.readFile(p)).digest("hex");

async function listFilesRecursive(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFilesRecursive(full)));
    else out.push(full);
  }
  return out.sort();
}

async function snapshot(dir) {
  const files = await listFilesRecursive(dir);
  const entries = [];
  for (const f of files) {
    const rel = path.relative(dir, f);
    // `meta.json` lo escribe este script después de renderizar (no Codama):
    // no entra en la comparación.
    if (rel === "meta.json") continue;
    entries.push({ rel, sha256: await sha256File(f) });
  }
  return entries;
}

async function generate(outDir, { packageFolder }) {
  const anchorIdl = JSON.parse(await fs.readFile(idlPath, "utf8"));
  const codama = createFromRoot(rootNodeFromAnchor(anchorIdl));
  // `generatedFolder` es relativo al package folder. `syncPackageJson` queda
  // desactivado: las dependencias del cliente generado las declara `app/`
  // a mano (versiones fijas) para que el diff sea revisable.
  // `formatCode` desactivado: sin prettier instalado, y el formato no
  // afecta a la compilación ni al comportamiento.
  await codama.accept(
    renderVisitor(packageFolder, {
      deleteFolderBeforeRendering: true,
      formatCode: false,
      generatedFolder: path.relative(packageFolder, outDir),
      syncPackageJson: false,
    }),
  );
  const { name, version, ...rest } = anchorIdl;
  void version;
  void rest;
  return {
    program: name,
    programId: anchorIdl.address ?? null,
    instructions: (anchorIdl.instructions ?? []).map((i) => i.name),
    accounts: (anchorIdl.accounts ?? []).map((a) => a.name),
    errors: (anchorIdl.errors ?? []).map((e) => e.name ?? e.code),
  };
}

async function main() {
  const check = process.argv.includes("--check");
  try {
    await fs.access(idlPath);
  } catch {
    console.error(`IDL no encontrado: ${idlPath}\nCorré \`anchor build\` en \`programa/\` primero.`);
    process.exit(1);
  }
  const idlSha256 = await sha256File(idlPath);

  if (check) {
    const tmp = await fs.mkdtemp(path.join(tmpdir(), "cuotas-codama-"));
    try {
      await generate(path.join(tmp, "generated"), { packageFolder: tmp });
      const [fresh, committed] = await Promise.all([
        snapshot(path.join(tmp, "generated")),
        snapshot(generatedDir).catch(() => null),
      ]);
      if (!committed) {
        console.error("No hay cliente commiteado en src/generated/: corré `npm run generate`.");
        process.exit(1);
      }
      const same =
        fresh.length === committed.length &&
        fresh.every(
          (f, i) => f.rel === committed[i].rel && f.sha256 === committed[i].sha256,
        );
      if (!same) {
        console.error(
          "El cliente commiteado difiere del IDL actual. Corré `npm run generate` y commiteá el resultado.",
        );
        process.exit(1);
      }
      console.log(`OK: src/generated/ coincide con el IDL (${idlSha256.slice(0, 12)}…).`);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
    return;
  }

  const summary = await generate(generatedDir, { packageFolder: appDir });
  const meta = {
    idlPath: path.relative(appDir, idlPath),
    idlSha256,
    ...summary,
    note: "Generado con `npm run generate`. No editar a mano: se pisa en cada corrida.",
  };
  await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`Cliente generado en src/generated/ desde ${meta.idlPath} (${idlSha256.slice(0, 12)}…).`);
  console.log(`Instrucciones: ${summary.instructions.join(", ") || "(ninguna)"}`);
  console.log(`Cuentas: ${summary.accounts.join(", ") || "(ninguna)"}`);
}

await main();
