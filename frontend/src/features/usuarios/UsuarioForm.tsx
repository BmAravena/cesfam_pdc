import { useState, type FormEvent } from 'react'

import { getErrorMessage } from '../../services/api'
import type { Establecimiento } from '../../services/establecimientos'
import type { Rol } from '../../services/roles'
import { crearUsuario, type Usuario } from '../../services/usuarios'
import { ROLES } from '../../lib/roles'
import { normalizarRutValido } from '../../lib/rut'

interface UsuarioFormProps {
  roles: Rol[]
  establecimientos: Establecimiento[]
  onCreated: (usuario: Usuario) => void
  onCancel: () => void
}

export function UsuarioForm({
  roles,
  establecimientos,
  onCreated,
  onCancel,
}: UsuarioFormProps) {
  // El Administrador no se ofrece: solo puede crear roles OIRS.
  const rolesDisponibles = roles.filter(
    (rol) => rol.nombre_rol !== ROLES.ADMIN,
  )
  const rolPorDefecto =
    rolesDisponibles.find((rol) => rol.nombre_rol === ROLES.LOCAL) ??
    rolesDisponibles[0]

  const [rut, setRut] = useState('')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rolId, setRolId] = useState(
    rolPorDefecto ? String(rolPorDefecto.id_rol) : '',
  )
  const [establecimientoId, setEstablecimientoId] = useState(
    rolPorDefecto?.nombre_rol === ROLES.LOCAL && establecimientos.length === 1
      ? String(establecimientos[0].id_establecimiento)
      : '',
  )
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rolSeleccionado = rolesDisponibles.find(
    (rol) => String(rol.id_rol) === rolId,
  )?.nombre_rol
  const requiereEstablecimiento = rolSeleccionado === ROLES.LOCAL

  function handleRolChange(valor: string) {
    setRolId(valor)
    const nombreRol = rolesDisponibles.find(
      (rol) => String(rol.id_rol) === valor,
    )?.nombre_rol

    if (nombreRol !== ROLES.LOCAL) {
      setEstablecimientoId('')
    } else if (establecimientos.length === 1) {
      setEstablecimientoId(
        String(establecimientos[0].id_establecimiento),
      )
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (enviando) return
    setError(null)

    const rutNormalizado = normalizarRutValido(rut)
    if (!rutNormalizado) {
      setError('RUT inválido. Revisa el dígito verificador.')
      return
    }

    setEnviando(true)

    try {
      const usuario = await crearUsuario({
        rut: rutNormalizado,
        nombre: nombre.trim(),
        email: email.trim(),
        password,
        id_rol: Number(rolId),
        id_establecimiento: requiereEstablecimiento
          ? Number(establecimientoId)
          : null,
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
              maxLength={14}
              placeholder="12345678-9"
              title="Ej: 12345678-9. Se valida el dígito verificador."
              aria-invalid={
                error?.startsWith('RUT inválido') ? true : undefined
              }
              aria-describedby={
                error?.startsWith('RUT inválido')
                  ? 'usuario-rut-ayuda usuario-form-error'
                  : 'usuario-rut-ayuda'
              }
              value={rut}
              onChange={(event) => setRut(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
            <p id="usuario-rut-ayuda" className="mt-1 text-xs text-slate-500">
              Se valida el dígito verificador (módulo 11).
            </p>
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
              aria-describedby="usuario-password-ayuda"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            />
            <p
              id="usuario-password-ayuda"
              className="mt-1 text-xs text-slate-500"
            >
              Mínimo 8 caracteres, al menos una mayúscula y un carácter
              especial.
            </p>
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
              onChange={(event) => handleRolChange(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none"
            >
              {rolesDisponibles.map((rol) => (
                <option key={rol.id_rol} value={rol.id_rol}>
                  {rol.nombre_rol}
                </option>
              ))}
            </select>
          </div>

          <div>
            {requiereEstablecimiento ? (
              <>
                <label
                  htmlFor="usuario-establecimiento"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Establecimiento
                </label>
                <select
                  id="usuario-establecimiento"
                  required
                  aria-describedby="usuario-establecimiento-ayuda"
                  value={establecimientoId}
                  onChange={(event) =>
                    setEstablecimientoId(event.target.value)
                  }
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
              </>
            ) : (
              <>
                <p className="mb-1.5 block text-sm font-medium text-slate-700">
                  Establecimiento
                </p>
                <p className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
                  Todas las sedes
                </p>
              </>
            )}
            <p
              id="usuario-establecimiento-ayuda"
              className="mt-1 text-xs text-slate-500"
            >
              {requiereEstablecimiento
                ? 'Obligatorio: el Funcionario Local queda amarrado a esta sede.'
                : 'El Encargado OIRS Comunal tiene alcance sobre todas las sedes; no requiere establecimiento.'}
            </p>
          </div>
        </div>

        {error && (
          <p
            id="usuario-form-error"
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
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            aria-busy={enviando}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            {enviando ? 'Creando…' : 'Crear usuario'}
          </button>
        </div>
      </form>
    </section>
  )
}
