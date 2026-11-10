import { useState, type FormEvent } from 'react'

import { getErrorMessage } from '../../services/api'
import type { Establecimiento } from '../../services/establecimientos'
import type { Rol } from '../../services/roles'
import { crearUsuario, type Usuario } from '../../services/usuarios'
import { ROLES } from '../../lib/roles'

interface UsuarioFormProps {
  roles: Rol[]
  establecimientos: Establecimiento[]
  onCreated: (usuario: Usuario) => void
  onCancel: () => void
}

const RUT_PATTERN = '^\\d{1,2}\\.?\\d{3}\\.?\\d{3}-?[\\dkK]$'

export function UsuarioForm({
  roles,
  establecimientos,
  onCreated,
  onCancel,
}: UsuarioFormProps) {
  const rolPorDefecto =
    roles.find((rol) => rol.nombre_rol === ROLES.LOCAL) ?? roles[0]

  const [rut, setRut] = useState('')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rolId, setRolId] = useState(
    rolPorDefecto ? String(rolPorDefecto.id_rol) : '',
  )
  const [establecimientoId, setEstablecimientoId] = useState(
    establecimientos.length === 1
      ? String(establecimientos[0].id_establecimiento)
      : '',
  )
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setEnviando(true)

    try {
      const usuario = await crearUsuario({
        rut: rut.trim(),
        nombre: nombre.trim(),
        email: email.trim(),
        password,
        id_rol: Number(rolId),
        id_establecimiento: Number(establecimientoId),
      })
      onCreated(usuario)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Nuevo usuario</h2>
          <p className="mt-1 text-sm text-slate-600">
            La cuenta podrá iniciar sesión con el correo y la contraseña
            definidos aquí.
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          Solo Administrador
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="usuario-nombre"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Nombre completo
            </label>
            <input
              id="usuario-nombre"
              required
              maxLength={120}
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="usuario-rut"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              RUT
            </label>
            <input
              id="usuario-rut"
              required
              pattern={RUT_PATTERN}
              maxLength={12}
              placeholder="12345678-9"
              title="Formato: 12345678-9"
              value={rut}
              onChange={(event) => setRut(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="usuario-email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Correo electrónico
            </label>
            <input
              id="usuario-email"
              type="email"
              required
              maxLength={120}
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="usuario-password"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Contraseña inicial
            </label>
            <input
              id="usuario-password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres.</p>
          </div>

          <div>
            <label
              htmlFor="usuario-rol"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Rol
            </label>
            <select
              id="usuario-rol"
              required
              value={rolId}
              onChange={(event) => setRolId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            >
              {roles.map((rol) => (
                <option key={rol.id_rol} value={rol.id_rol}>
                  {rol.nombre_rol}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="usuario-establecimiento"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Establecimiento
            </label>
            <select
              id="usuario-establecimiento"
              required
              value={establecimientoId}
              onChange={(event) => setEstablecimientoId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            >
              <option value="">Selecciona un establecimiento</option>
              {establecimientos.map((establecimiento) => (
                <option
                  key={establecimiento.id_establecimiento}
                  value={establecimiento.id_establecimiento}
                >
                  {establecimiento.nombre_centro}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={enviando}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {enviando ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </section>
  )
}
