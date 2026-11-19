// A API devolve horários no formato "HH:MM" (ex.: "10:21").

function horaEmMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

// Quantos minutos faltam de "agora" até "hora".
// Usamos a hora da própria API (campo "hr") como "agora", para não depender
// do relógio do celular. Se o resultado for muito negativo, a chegada é depois
// da meia-noite (ex.: agora 23:58, chegada 00:03 = 5 minutos).
export function minutosAte(hora, agora) {
  let diferenca = horaEmMinutos(hora) - horaEmMinutos(agora);
  if (diferenca < -720) {
    diferenca += 1440;
  }
  return Math.max(diferenca, 0);
}

export function textoMinutos(minutos) {
  if (minutos <= 0) return 'chegando';
  if (minutos === 1) return '1 min';
  return `${minutos} min`;
}
