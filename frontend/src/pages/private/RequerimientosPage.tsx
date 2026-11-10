export function RequerimientosPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Requerimientos
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Bandeja de solicitudes, reclamos, sugerencias y felicitaciones.
          </p>
        </div>
        <button
          type="button"
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Nuevo requerimiento
        </button>
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Código</th>
              <th scope="col" className="px-4 py-3 font-semibold">Tipo</th>
              <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
              <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                Aún no hay requerimientos para mostrar. Conecta este listado a
                <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  GET /api/v1/requerimientos
                </code>
                para cargar los datos.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
