import { useEffect, useState } from 'react'

import { useAuth } from '../../features/auth/useAuth'
import { UsuarioForm } from '../../features/usuarios/UsuarioForm'
import { getErrorMessage } from '../../services/api'
import {
  listarEstablecimientos,
  type Establecimiento,
} from '../../services/establecimientos'
import { listarRoles, type Rol } from '../../services/roles'
import {
  actualizarUsuario,
  darBajaUsuario,
  listarUsuarios,
  type Usuario,
} from '../../services/usuarios'

function formatearFecha(fecha: string): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(
    new Date(fecha),
  )
}

export function UsuariosPage() {
  const { user } = useAuth()

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [establecimientos, setEstablecimientos] = useState<Establecimiento[]>([])

  const [cargando, setCargando] = useState(true)
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [recargar, setRecargar] = useState(0)
  const [recargarCatalogos, setRecargarCatalogos] = useState(0)

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [accionandoId, setAccionandoId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorCatalogos, setErrorCatalogos] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  useEffect(() => {
    let activo = true

    Promise.all([listarRoles(), listarEstablecimientos()])
      .then(([rolesData, establecimientosData]) => {
        if (!activo) return
        setRoles(rolesData)
        setEstablecimientos(establecimientosData)
      })
      .catch((requestError) => {
        if (activo) setErrorCatalogos(getErrorMessage(requestError))
      })
      .finally(() => {
        if (activo) setCargandoCatalogos(false)
      })

    return () => {
      activo = false
    }
  }, [recargarCatalogos])

  useEffect(() => {
    let activo = true

    listarUsuarios(incluirInactivos)
      .then((data) => {
        if (activo) setUsuarios(data)
      })
      .catch((requestError) => {
        if (activo) setError(getErrorMessage(requestError))
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [incluirInactivos, recargar])

  function reintentarCatalogos() {
    setCargandoCatalogos(true)
    setErrorCatalogos(null)
    setRecargarCatalogos((valor) => valor + 1)
  }

  function handleIncluirInactivos(checked: boolean) {
    setCargando(true)
    setError(null)
    setIncluirInactivos(checked)
  }

  function handleCreated(usuario: Usuario) {
    setMostrarFormulario(false)
    setExito(`Usuario "${usuario.nombre}" creado correctamente.`)
    setError(null)
    setCargando(true)
    setRecargar((valor) => valor + 1)
  }

  async function handleToggleActivo(usuario: Usuario) {
    if (usuario.activo) {
      const confirmado = window.confirm(
        `¿Dar de baja a ${usuario.nombre}? No podrá iniciar sesión, pero su historial se conserva.`,
      )
      if (!confirmado) return
    }

    setAccionandoId(usuario.id_usuario)
    setError(null)
    setExito(null)

    try {
      if (usuario.activo) {
        await darBajaUsuario(usuario.id_usuario)
        setExito(`Usuario "${usuario.nombre}" dado de baja.`)
      } else {
        await actualizarUsuario(usuario.id_usuario, { activo: true })
        setExito(`Usuario "${usuario.nombre}" reactivado.`)
      }
      setCargando(true)
      setRecargar((valor) => valor + 1)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setAccionandoId(null)
    }
  }

  const rolesPorId = new Map(roles.map((rol) => [rol.id_rol, rol.nombre_rol]))
  const establecimientosPorId = new Map(
    establecimientos.map((establecimiento) => [
      establecimiento.id_establecimiento,
      establecimiento.nombre_centro,
    ]),
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Usuarios
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Crea cuentas y administra el acceso del personal según su rol y
            establecimiento.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMostrarFormulario((valor) => !valor)
            setError(null)
            setExito(null)
          }}
          disabled={cargandoCatalogos || errorCatalogos !== null}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mostrarFormulario ? 'Cerrar formulario' : 'Nuevo usuario'}
        </button>
      </header>

      {errorCatalogos && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <span>
            No se pudieron cargar los roles o establecimientos:{' '}
            {errorCatalogos}
          </span>
          <button
            type="button"
            onClick={reintentarCatalogos}
            className="font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {exito && (
        <p
          role="status"
          className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800"
        >
          {exito}
        </p>
      )}

      {mostrarFormulario && (
        <UsuarioForm
          roles={roles}
          establecimientos={establecimientos}
          onCreated={handleCreated}
          onCancel={() => setMostrarFormulario(false)}
        />
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Cuentas del sistema
          </h2>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={incluirInactivos}
              onChange={(event) =>
                handleIncluirInactivos(event.target.checked)
              }
              className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Mostrar dados de baja
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Usuario
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  RUT
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Rol
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Establecimiento
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    Cargando usuarios…
                  </td>
                </tr>
              )}

              {!cargando && usuarios.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              )}

              {!cargando &&
                usuarios.map((usuario) => {
                  const esPropio = usuario.id_usuario === user?.id_usuario
                  const ocupado = accionandoId === usuario.id_usuario

                  return (
                    <tr key={usuario.id_usuario} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">
                          {usuario.nombre}
                          {esPropio && (
                            <span className="ml-2 rounded-full bg-accent-100 px-2 py-0.5 text-xs font-semibold text-accent-800">
                              Tú
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {usuario.email}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{usuario.rut}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {rolesPorId.get(usuario.id_rol) ??
                          `Rol #${usuario.id_rol}`}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {establecimientosPorId.get(
                          usuario.id_establecimiento,
                        ) ?? `Sede #${usuario.id_establecimiento}`}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            usuario.activo
                              ? 'bg-brand-100 text-brand-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </span>
                        {!usuario.activo && usuario.fecha_baja && (
                          <p className="mt-1 text-xs text-slate-500">
                            Baja: {formatearFecha(usuario.fecha_baja)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleActivo(usuario)}
                          disabled={esPropio || ocupado}
                          title={
                            esPropio
                              ? 'No puedes desactivar tu propio usuario'
                              : undefined
                          }
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            usuario.activo
                              ? 'border border-red-200 text-red-700 hover:bg-red-50'
                              : 'border border-brand-200 text-brand-700 hover:bg-brand-50'
                          }`}
                        >
                          {ocupado
                            ? 'Procesando…'
                            : usuario.activo
                              ? 'Dar de baja'
                              : 'Reactivar'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Los usuarios dados de baja conservan su historial y no liberan su RUT ni
        correo. Solo el Administrador del Sistema puede gestionar cuentas.
      </p>
    </div>
  )
}
