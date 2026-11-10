export function UsuariosPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Usuarios
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Administración de cuentas, roles y establecimientos asignados.
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-600">
        Módulo disponible solo para roles con alcance global (Administrador del
        Sistema y Encargado OIRS Comunal). La vista se conectará a
        <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">
          GET /api/v1/usuarios
        </code>
        en la siguiente iteración.
      </div>
    </div>
  )
}
