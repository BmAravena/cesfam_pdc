import { useAuth } from '../../features/auth/useAuth'

const indicadores = [
  { etiqueta: 'Requerimientos abiertos', valor: '—' },
  { etiqueta: 'Respondidos este mes', valor: '—' },
  { etiqueta: 'Encuestas respondidas', valor: '—' },
  { etiqueta: 'Tiempo medio de respuesta', valor: '—' },
]

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Panel de control
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Resumen operativo de la oficina OIRS para tu establecimiento.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Sesión actual
        </p>
        <div className="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-sm text-slate-700">
          <span>
            Usuario: <strong>#{user?.id_usuario ?? '—'}</strong>
          </span>
          <span>
            Rol: <strong>{user?.rol ?? '—'}</strong>
          </span>
          <span>
            Establecimiento: <strong>#{user?.id_establecimiento ?? '—'}</strong>
          </span>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {indicadores.map((indicador) => (
          <article
            key={indicador.etiqueta}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-slate-500">{indicador.etiqueta}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {indicador.valor}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-600">
        <h2 className="font-semibold text-slate-900">Próximos pasos</h2>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Conectar los indicadores con los endpoints de requerimientos.</li>
          <li>Agregar filtros por estado, tipo y rango de fechas.</li>
          <li>Implementar la encuesta de satisfacción al cerrar un caso.</li>
        </ul>
      </section>
    </div>
  )
}
