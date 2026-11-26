/**
 * Enlace de salto al contenido principal.
 * Permanece oculto hasta recibir foco con teclado, para que usuarios de
 * lector de pantalla y teclado no deban recorrer toda la navegación.
 */
export function SkipLink() {
  return (
    <a
      href="#contenido-principal"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-800 focus:shadow-lg focus:ring-2 focus:ring-brand-600"
    >
      Saltar al contenido principal
    </a>
  )
}
