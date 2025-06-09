// Función para formatear números con puntos para miles y comas para decimales
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

// Función para formatear input mientras se escribe
export function formatInputValue(value: string): string {
  // Remover todo excepto números, puntos y comas
  const cleanValue = value.replace(/[^\d.,]/g, "")

  // Si está vacío, retornar vacío
  if (!cleanValue) return ""

  // Separar parte entera y decimal
  const parts = cleanValue.split(",")
  let integerPart = parts[0] || ""
  const decimalPart = parts[1] || ""

  // Remover puntos existentes de la parte entera
  integerPart = integerPart.replace(/\./g, "")

  // Agregar puntos cada 3 dígitos desde la derecha
  if (integerPart.length > 3) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  // Reconstruir el valor
  if (decimalPart) {
    return `${integerPart},${decimalPart.slice(0, 2)}` // Máximo 2 decimales
  }

  return integerPart
}

// Función para convertir valor formateado a número
export function parseFormattedValue(value: string): number {
  if (!value) return 0

  // Reemplazar puntos (separadores de miles) y comas (decimales) por formato estándar
  const standardValue = value.replace(/\./g, "").replace(",", ".")

  return Number.parseFloat(standardValue) || 0
}

// Función para formatear valor para input
export function formatForInput(value: number): string {
  if (value === 0) return ""

  const formatted = formatCurrency(value)
  return formatted
}

// Agregar al final del archivo estas nuevas funciones para fechas:

// Función para formatear fecha mientras se escribe
export function formatDateInput(value: string): string {
  // Remover todo excepto números
  const cleanValue = value.replace(/\D/g, "")

  // Si está vacío, retornar vacío
  if (!cleanValue) return ""

  // Agregar barras automáticamente
  if (cleanValue.length <= 2) {
    return cleanValue
  } else if (cleanValue.length <= 4) {
    return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2)}`
  } else {
    return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2, 4)}/${cleanValue.slice(4, 8)}`
  }
}

// Función para validar fecha en formato dd/mm/yyyy
export function isValidDate(dateString: string): boolean {
  if (!dateString || dateString.length !== 10) return false

  const parts = dateString.split("/")
  if (parts.length !== 3) return false

  const day = Number.parseInt(parts[0], 10)
  const month = Number.parseInt(parts[1], 10)
  const year = Number.parseInt(parts[2], 10)

  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
    return false
  }

  // Crear fecha y verificar que sea válida
  const date = new Date(year, month - 1, day)
  return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year
}

// Función para convertir fecha dd/mm/yyyy a Date
export function parseDate(dateString: string): Date | null {
  if (!isValidDate(dateString)) return null

  const parts = dateString.split("/")
  const day = Number.parseInt(parts[0], 10)
  const month = Number.parseInt(parts[1], 10) - 1 // Los meses en JS van de 0-11
  const year = Number.parseInt(parts[2], 10)

  return new Date(year, month, day)
}

// Función para formatear Date a dd/mm/yyyy
export function formatDateToString(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}
