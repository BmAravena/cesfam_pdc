/** Validación y normalización de RUT chileno (módulo 11). */

function limpiarRut(valor: string): string {
  return valor.replace(/[.\s-]/g, '').toUpperCase()
}

function calcularDigitoVerificador(cuerpo: string): string {
  let suma = 0
  let multiplicador = 2

  for (let indice = cuerpo.length - 1; indice >= 0; indice -= 1) {
    suma += Number(cuerpo[indice]) * multiplicador
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }

  const resultado = 11 - (suma % 11)
  if (resultado === 11) return '0'
  if (resultado === 10) return 'K'
  return String(resultado)
}

/**
 * Valida el RUT y devuelve su forma normalizada (`12345678-9`).
 * Retorna `null` si el formato o el dígito verificador no son válidos.
 */
export function normalizarRutValido(valor: string): string | null {
  const limpio = limpiarRut(valor)
  if (!/^\d{1,8}[0-9K]$/.test(limpio)) return null

  const cuerpo = limpio.slice(0, -1)
  const digito = limpio.slice(-1)

  if (Number(cuerpo) <= 0) return null
  if (calcularDigitoVerificador(cuerpo) !== digito) return null

  return `${cuerpo}-${digito}`
}
