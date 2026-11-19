// Utilitários de texto.

// Remove acentos para comparar textos ("Anália" == "analia").
export function removerAcentos(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}
