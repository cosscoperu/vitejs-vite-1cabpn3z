// Función pura para convertir Hexadecimal a canales RGB
// Entrada: "#D4AF37" -> Salida: "212 175 55"
export const hexToRgb = (hex) => {
  if (!hex) return '212 175 55'; // Fallback al Dorado por defecto
  
  // Eliminar el # si existe
  hex = hex.replace(/^#/, '');

  // Parsear los valores
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `${r} ${g} ${b}`;
};