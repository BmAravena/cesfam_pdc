export function AuditoriaPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Auditoría
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Trazabilidad de las acciones realizadas en el sistema.
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-600">
        La bitácora se alimentará desde
        <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">
          GET /api/v1/auditoria
        </code>
        y será visible para roles con alcance global.
      </div>
    </div>
  )
}
