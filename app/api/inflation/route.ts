import { NextResponse } from "next/server"

// ¡Agregar la barra diagonal al final!
const ARGENTINA_DATOS_API_URL = "https://api.argentinadatos.com/v1/finanzas/indices/inflacion/"

const monthNames = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

interface ArgentinaDatosInflation {
  fecha: string // formato "2024-01-31"
  valor: number // valor de inflación mensual
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const months = Number.parseInt(searchParams.get("months") || "0")

    if (months <= 0) {
      return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 })
    }

    console.log(`Solicitando datos de inflación para ${months} meses atrás`)

    // Obtener datos de Argentina Datos
    const response = await fetch(ARGENTINA_DATOS_API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "SueldoApp/1.0",
      },
      // Configuración para manejar redirecciones
      redirect: "follow",
      // Timeout para evitar cuelgues
      signal: AbortSignal.timeout(10000), // 10 segundos
    })

    console.log(`Response status: ${response.status}`)
    console.log(`Response URL: ${response.url}`)

    if (!response.ok) {
      console.error(`Error de Argentina Datos API: ${response.status} ${response.statusText}`)
      throw new Error(`Error de Argentina Datos API: ${response.status} - ${response.statusText}`)
    }

    const apiData: ArgentinaDatosInflation[] = await response.json()
    console.log(`Recibidos ${apiData.length} registros de Argentina Datos`)

    // Verificar que tenemos datos
    if (!Array.isArray(apiData) || apiData.length === 0) {
      throw new Error("No se recibieron datos válidos de la API")
    }

    // Log de algunos datos para verificar
    console.log(`Primer registro:`, apiData[0])
    console.log(`Último registro:`, apiData[apiData.length - 1])

    // Ordenar datos por fecha (más reciente primero)
    apiData.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    // Calcular los meses que necesitamos (hacia atrás desde ahora)
    const now = new Date()
    const inflationRates: Array<{ rate: number; month: string; year: number; date: string }> = []
    const missingMonths: string[] = []

    for (let i = 1; i <= months; i++) {
      // Ir hacia atrás mes por mes
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const year = targetDate.getFullYear()
      const monthNum = targetDate.getMonth() + 1
      const monthName = monthNames[targetDate.getMonth()]

      console.log(`Buscando datos para ${monthName} ${year} (mes ${monthNum})`)

      // Buscar datos para este mes/año
      const dataEntry = apiData.find((entry) => {
        const entryDate = new Date(entry.fecha)
        return entryDate.getFullYear() === year && entryDate.getMonth() + 1 === monthNum
      })

      if (dataEntry && dataEntry.valor !== null && dataEntry.valor !== undefined) {
        console.log(`Encontrado: ${monthName} ${year} = ${dataEntry.valor}%`)
        inflationRates.push({
          rate: dataEntry.valor,
          month: monthName,
          year,
          date: dataEntry.fecha,
        })
      } else {
        console.log(`No encontrado o sin datos: ${monthName} ${year}`)
        missingMonths.push(`${monthName} ${year}`)
      }
    }

    // Invertir el array para que esté en orden cronológico (más antiguo primero)
    inflationRates.reverse()

    console.log(`Resultado: ${inflationRates.length} meses encontrados, ${missingMonths.length} faltantes`)

    // Siempre devolver éxito, pero informar sobre datos faltantes
    return NextResponse.json({
      success: true,
      data: inflationRates,
      missingMonths: missingMonths.length > 0 ? missingMonths : undefined,
      source: "Argentina Datos - INDEC",
      note:
        missingMonths.length > 0
          ? `Datos oficiales de Argentina Datos. Los datos para ${missingMonths.join(", ")} aún no están disponibles (pueden publicarse con retraso).`
          : "Datos oficiales de inflación mensual de Argentina Datos.",
      totalMonths: inflationRates.length,
      requestedMonths: months,
    })
  } catch (error) {
    console.error("Error fetching Argentina Datos inflation data:", error)

    // Información más detallada del error
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
    }

    return NextResponse.json(
      {
        error: "Error al obtener datos de Argentina Datos",
        details: error instanceof Error ? error.message : "Error desconocido",
        suggestion: "Verifica tu conexión a internet y vuelve a intentar",
      },
      { status: 500 },
    )
  }
}
