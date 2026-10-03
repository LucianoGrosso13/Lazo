# Contrato aditivo de cuentas — `getAccountCuotas()`

Fecha: 2026-10-03. Owner: ticket 01 (entrada y roles). **Aditivo**: no modifica `CuotasClient`, `types.ts`, `mock.ts`, `real.ts` ni `format.ts`. Los consumidores importan desde `@/lib/cuotas` igual que hoy.

## Qué agrega

`app/src/lib/cuotas/accounts-types.ts` (tipos) + `app/src/lib/cuotas/accounts.ts` (implementación que envuelve al `CuotasClient` base). `cuotas.ts` re-exporta los tipos, `REFERENCE_FIGURES` (para el owner 04) y expone:

```ts
export function getAccountCuotas(): AccountCuotasClient; // singleton, envuelve getCuotas()
export { REFERENCE_FIGURES } from "./cuotas/reference-figures"; // cifras de terceros, siempre con etiqueta "referencia"
```

`createAccountCuotas` queda interno (lo usa `cuotas.ts`); no hay superficie extra para tests — el supervisor pidió frontera e2e solamente.

## Interfaz

```ts
export interface AccountCuotasClient {
  readonly mode: "mock" | "real";

  /** Config del protocolo + autoridad admin/keeper + fixtures demo (mock). */
  getAccountConfig(): Promise<AccountConfig>;

  /** Rol por dirección: admin (autoridad config/fixture) > comercio (cuenta existente) > estudiante. */
  resolveAccount(address: WalletAddress): Promise<ResolvedAccount>;

  /** Saldo devUSDC del estudiante. Mock: derivado de planes compartidos; si la base no puede leer planes → available:null. Real: rechaza not_implemented. */
  getBalance(student: WalletAddress): Promise<StudentBalance>;

  /** Invitación al fiador: metadata token→student, persistida versionada en `lazo.accounts.v1`. */
  createInvitation(student: WalletAddress): Promise<Invitation>;
  resolveInvitation(token: string): Promise<Invitation>; // invalid_token si no existe
  completeGuarantor(token: string, args: CompleteGuarantorArgs): Promise<TxResult<Guarantee>>;

  /** Admin: autorizan actor contra autoridad config/fixture; mutan SOLO vía hooks de la base; sin hook → not_implemented. */
  adminSetState(actor: WalletAddress, state: ProtocolState): Promise<ProtocolConfig>;
  adminRegisterMerchant(actor: WalletAddress, args: AdminRegisterMerchantArgs): Promise<AdminMerchantRef>;
  getAdminSnapshot(actor: WalletAddress): Promise<AdminSnapshot>;

  /** Reinicio coherente de la demo: limpia invitaciones/metadata propia y delega el estado financiero a base.resetDemo(). En real la base rechaza demo_only. */
  resetDemo(): Promise<void>;

  /** Reenvía base.subscribe + notifica cambios propios (invitaciones). */
  subscribe(listener: () => void): () => void;
}
```

## Tipos

```ts
export type AccountRole = "admin" | "merchant" | "student";

export interface AccountAuthority {
  admin: WalletAddress | null;   // null = nadie es admin (real sin autoridad en config → falla cerrado)
  keeper: WalletAddress | null;
  source: "config" | "demo-fixture";
}

/** Datos de prueba declarados del mock para la UI (en real → null). */
export interface AccountDemoInfo {
  studentFunds: Micro;          // DEMO_STUDENT_FUNDS: fondos simulados iniciales
  admin: WalletAddress;         // DEMO_ADMIN
  merchant: WalletAddress;      // DEMO_MERCHANT (format.ts)
  studentNew: WalletAddress;    // DEMO_STUDENT_NEW
  studentTier3: WalletAddress;  // DEMO_STUDENT_TIER3 (format.ts)
}
export interface AccountConfig {
  protocol: ProtocolConfig;
  authority: AccountAuthority;
  demo: AccountDemoInfo | null;
}

export type RoleEvidence = "authority" | "merchant-account" | "demo-fixture" | "default";
export type ReputationStatus = "ok" | "not_found" | "unavailable";

export interface ResolvedAccount {
  address: WalletAddress;
  role: AccountRole;
  roleEvidence: RoleEvidence;
  merchant: Merchant | null;             // solo si role==="merchant" y la base lo resolvió
  reputation: Reputation | null;         // solo estudiantes
  reputationStatus: ReputationStatus;    // not_found = ofrecer crear reputación
}

export interface StudentBalance {
  available: Micro | null;               // null = no disponible (UI declara, no inventa)
  simulated: boolean;                    // en mock siempre true
  source: "derived" | "unavailable";
}

export interface Invitation {
  token: string;                         // aleatorio demo, no firma ni HMAC
  student: WalletAddress;
  createdAt: UnixSeconds;
  completedAt: UnixSeconds | null;       // una usada sigue resolviendo (vuelta por el enlace)
}

export interface CompleteGuarantorArgs {
  maxPurchase: Micro;
  coverageMax: Micro;
  mandateHash: string;
  display?: Guarantee["display"];
}

export interface AdminRegisterMerchantArgs { owner: WalletAddress; name: string; }

export interface AdminMerchantRef {
  owner: WalletAddress;
  name: string | null;
  active: boolean;
  source: "account" | "demo-fixture";
}

export interface AdminSnapshot {
  config: ProtocolConfig;
  authority: AccountAuthority;
  pool: Pool | null;
  activity: Activity[] | null;
  merchants: AdminMerchantRef[];
  pending: string[];                     // secciones que la base aún no responde
}

export type AccountErrorCode =
  | "not_found" | "invalid_token" | "unauthorized"
  | "unavailable" | "not_implemented" | "demo_only";

export class AccountCuotasError extends Error { readonly code: AccountErrorCode; }
```

## Constantes demo exportadas (para A y otros owners)

- `accounts-types.ts` → `DEMO_ADMIN` (`"LazoAdminDemo1111111111111111111111111111111"`), `DEMO_KEEPER` (`"LazoKeeperDemo11111111111111111111111111111"`), `DEMO_STUDENT_NEW` (`"LazoEstudianteNuevo1111111111111111111111"`), `DEMO_STUDENT_FUNDS` (`toMicro(2000)`).
- `format.ts` (A) → `DEMO_MERCHANT` (`"LazoTiendaDemo11111111111111111111111111111"`), `DEMO_STUDENT_TIER3` (`"LazoEstudianteEscalon3111111111111111111111"`).

Son datos de prueba públicos: la UI los declara como ejemplos simulados, nunca direcciones devnet reales.

## Puente de identidad estudiante (para checkout / fiador)

`@/components/cuenta/account-context` exporta, **sin requerir `<AccountProvider>`**:

```ts
export function useStudentAddress(): WalletAddress | null;
```

Reglas: **real** → wallet conectada o `null` (sin wallet no hay estudiante que fingir). **mock** → selección demo estudiante (`student-new`/`student-tier3`) > wallet conectada > último estudiante del recorrido (persistido en `lazo.cuenta.last-student.v1`) > `DEMO_STUDENT_NEW` explícito. La compra y el alta de fiador usan la misma identidad.

El contexto además expone `resetDemo()` que llama `account.resetDemo()` + limpia la selección demo y el último estudiante (`resetDemoUiState` en `lib/roles.ts`).

## Hooks requeridos a la sesión A (opcionales, detectados en runtime)

Para que las mutaciones admin del mock sean **consistentes con la base** sin editar `mock.ts` desde cuentas, `accounts.ts` detecta estos métodos opcionales en el objeto base (no en la interfaz `CuotasClient`):

```ts
export interface AccountBaseHooks {
  /** Mutar ProtocolConfig.state; espeja admin_set_state. */
  setProtocolState?(actor: WalletAddress, state: ProtocolState): Promise<ProtocolConfig>;
  /** Crear la cuenta Merchant (owner + name); espeja merchant_register. */
  registerMerchantAccount?(actor: WalletAddress, args: AdminRegisterMerchantArgs): Promise<Merchant>;
}
```

Mientras no existan: `adminSetState`/`adminRegisterMerchant` autorizan al actor y rechazan `AccountCuotasError("not_implemented", "requiere hook base.setProtocolState|registerMerchantAccount (owner A)")`. Quedan identificadas para el coordinador.

## Reglas de comportamiento

- **Admin**: si `ProtocolConfig` trae `admin` (futuro), gana con `source:"config"`. En mock sin ese campo → fixture `DEMO_ADMIN`, `source:"demo-fixture"`. En real nunca hay fixture: sin autoridad en config → `admin:null`, ningún actor autorizado.
- **Comercio**: `base.getMerchant(addr)` resuelve → merchant. `not_found` → no es comercio (sigue a estudiante). `not_implemented` → solo los fixtures declarados (`DEMO_MERCHANT`) resuelven merchant con `roleEvidence:"demo-fixture"`. Cualquier otro error → `unavailable` (no concede rol).
- **Estudiante**: rol por descarte; `reputationStatus` distingue `ok`/`not_found`/`unavailable` sin bloquear la entrada.
- **Saldo mock**: `DEMO_STUDENT_FUNDS` menos anticipos y cuotas pagadas de los planes compartidos. Planes ilegibles → `available:null`. Jamás faucet ni saldo inventado. La UI lee el fixture vía `getAccountConfig().demo.studentFunds`, nunca un número en JSX.
- **Invitaciones**: solo metadata token→student en `lazo.accounts.v1`. `createInvitation` es idempotente mientras la invitación sigue activa. `completeGuarantor` delega en `base.registerGuarantee` (nunca otro store Guarantee); invitación ya usada → `invalid_token`. **Límite declarado en UI**: la invitación vive en el navegador que la generó — es demo, sin backend entre dispositivos.
- **Storage**: `lazo.accounts.v1`, `lazo.cuenta.demo.v1` y `lazo.cuenta.last-student.v1` tienen respaldo en memoria por sesión: si localStorage está bloqueado o lleno, los tokens creados siguen siendo resolubles en la misma sesión y la selección sigue funcionando sin prometer persistencia.
- **Ruteo**: `/app` redirige a la cuenta del rol apenas resuelve (`router.replace`); el selector demo navega a la cuenta en un click (`DEMO_ROUTES`). El fiador no tiene home: queda en `/app` con su invitación.
- **Real**: saldo, invitaciones y mutaciones rechazan `not_implemented`; no se simula HMAC ni autorización. Admin cierra si falta autoridad.
- **Evidencia**: componente `cuenta/evidencia.tsx`. En modo mock jamás genera links Explorer aunque la firma parezca base58: muestra "simulada en modo demo". Links a Explorer solo en mode real con firma presente y `?cluster=devnet`.
- **Reset**: `account.resetDemo()` limpia invitaciones y delega `base.resetDemo()`; el fiador de ejemplo que `ensureStudent` auto-vincula en el mock es caso de A (coordinado: la UI de alta lo muestra solo si el fiador completa la invitación, no como ya vinculado).

## Rutas declaradas (roles.ts)

```ts
ACCOUNT_ROUTES = { student:"/app/estudiante", merchant:"/app/comercio", admin:"/app/admin" }
PUBLIC_ROUTES  = { pool:"/pool", comercio:"/comercio" }
guarantorPath(token) = `/fiador/${token}`   // propuesta; owner 03 confirma
DEMO_ROUTES: student-* → /app/estudiante · merchant → /app/comercio · admin → /app/admin · guarantor → /app
```

Selector demo (`account-context`): ids `student-new | student-tier3 | merchant | admin | guarantor`, persistido en `lazo.cuenta.demo.v1`, **solo mock**; en real el selector no se renderiza. `guarantor` crea una invitación demo y enlaza a `guarantorPath(token)`.

## Notas de escenarios (retirados de suite por decisión del supervisor)

La cobertura se prueba por e2e en rutas públicas. Escenarios que la implementación ya contempla, a verificar por frontera: resolución admin>merchant>student; `not_found` de merchant vs error real; idempotencia de invitaciones y reuso tras `completedAt`; `invalid_token`; `unauthorized` en admin ops; `not_implemented` sin hook de A y en real; saldo derivado vs `unavailable`; `demo_only` propagado por `resetDemo` en real; evidencia mock sin Explorer.
