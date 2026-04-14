const CATEGORY_RULES: { pattern: RegExp; category: string }[] = [
  // Alimentación
  { pattern: /mercadona|carrefour|lidl|aldi|dia\b|el corte ingl|hipercor|eroski|consum|alcampo|bm\b|ahorra|supermercado|frutas|verduras|panaderia|fruteria/i, category: "Alimentación" },
  // Restaurantes / Ocio
  { pattern: /restaurante|cafeteria|cafe\b|café|bar\b|mcdonalds|mcdonald|burger king|kfc|telepizza|dominos|pizza|sushi|glovo|deliveroo|just eat|uber eats/i, category: "Restaurantes" },
  // Transporte
  { pattern: /repsol|cepsa|bp\b|shell|gasolinera|gasolina|combustible|estacion servicio|metro|emt\b|renfe|fgc|tram\b|cabify|uber\b|taxi|aparcamiento|parking|autopista|peaje/i, category: "Transporte" },
  // Salud
  { pattern: /farmacia|doctor|clinica|medico|dentista|hospital|sanitas|mapfre salud|adeslas|seguro medico|parafarmacia/i, category: "Salud" },
  // Ocio / Entretenimiento
  { pattern: /netflix|spotify|hbo|disney|amazon prime|youtube|apple tv|twitch|steam|playstation|xbox|cine|teatro|concierto|evento/i, category: "Entretenimiento" },
  // Ropa / Moda
  { pattern: /zara|mango|h&m|hm\b|pull.bear|bershka|stradivarius|massimo dutti|cortefiel|primark|inditex|decathlon|nike|adidas|ropa/i, category: "Ropa" },
  // Hogar
  { pattern: /ikea|leroy merlin|aki\b|ferreteria|electrodomestico|mediamarkt|media markt|el corte ingles hogar|lampara|mueble/i, category: "Hogar" },
  // Servicios / Suministros
  { pattern: /endesa|iberdrola|naturgy|gas natural|agua\b|suministros|electricidad|luz\b|calefaccion|comunidad propietarios/i, category: "Suministros" },
  // Telecomunicaciones
  { pattern: /movistar|vodafone|orange|yoigo|masmovil|simyo|internet|telefono|movil|fibra/i, category: "Telecomunicaciones" },
  // Seguros
  { pattern: /seguro|mapfre|axa|allianz|generali|mutua|linea directa|verti|zurich/i, category: "Seguros" },
  // Educación
  { pattern: /universidad|colegio|academia|cursos|formacion|udemy|coursera|libro|libreria|fnac/i, category: "Educación" },
  // Viajes
  { pattern: /hotel|airbnb|booking|trivago|expedia|ryanair|iberia|vueling|easyjet|aena|aeropuerto|crucero|agencia viaje/i, category: "Viajes" },
  // Inversiones / Ahorro
  { pattern: /traspaso|transferencia|bizum|inversión|plan pensiones|fondo|etf\b|broker|degiro|ibkr|interactive brokers/i, category: "Transferencias" },
  // Ingresos
  { pattern: /nomina|salario|sueldo|pension|ingreso|pago recibido/i, category: "Ingresos" },
  // Banco / Comisiones
  { pattern: /comision|mantenimiento cuenta|cuota tarjeta|intereses/i, category: "Comisiones Bancarias" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Alimentación": "#22c55e",
  "Restaurantes": "#f97316",
  "Transporte": "#3b82f6",
  "Salud": "#ec4899",
  "Entretenimiento": "#a855f7",
  "Ropa": "#f59e0b",
  "Hogar": "#14b8a6",
  "Suministros": "#6366f1",
  "Telecomunicaciones": "#8b5cf6",
  "Seguros": "#06b6d4",
  "Educación": "#84cc16",
  "Viajes": "#eab308",
  "Transferencias": "#94a3b8",
  "Ingresos": "#10b981",
  "Comisiones Bancarias": "#ef4444",
  "Sin categoría": "#6b7280",
};

export function classifyTransaction(description: string): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(description)) return rule.category;
  }
  return "Sin categoría";
}

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#6b7280";
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS);
