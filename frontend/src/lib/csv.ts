/** Utilidades para exportar tablas del panel a CSV compatible con Excel. */

type ValorCsv = string | number | null | undefined

function escaparValor(valor: ValorCsv): string {
  if (valor === null || valor === undefined) return ''
  const texto = String(valor)
  if (/[";\r\n]/.test(texto)) {
    return `"${texto.replaceAll('"', '""')}"`
  }
  return texto
}

/**
 * Descarga una matriz de valores como CSV usando punto y coma como
 * separador (formato que Excel en español reconoce directamente).
 */
export function descargarCsv(
  nombreArchivo: string,
  filas: ValorCsv[][],
): void {
  const contenido = filas
    .map((fila) => fila.map(escaparValor).join(';'))
    .join('\r\n')

  const blob = new Blob([`\uFEFF${contenido}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo.endsWith('.csv')
    ? nombreArchivo
    : `${nombreArchivo}.csv`
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}
