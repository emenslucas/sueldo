"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatInputValue, parseFormattedValue } from "@/lib/formatters"
import { Calculator, TrendingUp, Loader2, AlertCircle, Info } from "lucide-react"

interface InflationData {
  rate: number
  month: string
  year: number
}

export function SalaryCalculator() {
  const [oldSalary, setOldSalary] = useState("")
  const [newSalary, setNewSalary] = useState("")
  const [monthsSinceIncrease, setMonthsSinceIncrease] = useState("")
  const [monthlyInflations, setMonthlyInflations] = useState<Array<{ value: string; month: string; year: number }>>([])
  const [result, setResult] = useState<{
    percentage: number
    increase: number
  } | null>(null)
  const [inflationResult, setInflationResult] = useState<{
    salaryIncrease: number
    accumulatedInflation: number
    realIncrease: number
    coveragePercentage: number
    shouldBeSalary: number
  } | null>(null)

  const [loadingInflation, setLoadingInflation] = useState(false)
  const [autoInflationEnabled, setAutoInflationEnabled] = useState(false)
  const [inflationError, setInflationError] = useState<string | null>(null)
  const [inflationInfo, setInflationInfo] = useState<string | null>(null)

  const calculate = () => {
    const oldAmount = parseFormattedValue(oldSalary)
    const newAmount = parseFormattedValue(newSalary)
    const months = Number.parseInt(monthsSinceIncrease)

    if (oldAmount <= 0 || newAmount <= 0) {
      return
    }

    const increase = newAmount - oldAmount
    const percentage = (increase / oldAmount) * 100

    setResult({
      percentage,
      increase,
    })

    if (months > 0) {
      // Validar que tengamos inflación para al menos algunos meses
      const validInflations = monthlyInflations
        .slice(0, months)
        .filter((inf) => inf.value.trim() !== "" && !isNaN(Number.parseFloat(inf.value.replace(",", "."))))

      if (validInflations.length === 0) {
        return
      }

      // Calcular inflación acumulada solo con los datos disponibles
      let accumulatedInflation = 1
      validInflations.forEach((inf) => {
        const monthlyRate = Number.parseFloat(inf.value.replace(",", ".")) / 100
        accumulatedInflation *= 1 + monthlyRate
      })
      accumulatedInflation = (accumulatedInflation - 1) * 100

      // Calcular lo que debería ser el sueldo con inflación
      const shouldBeSalary = oldAmount * (1 + accumulatedInflation / 100)

      // Calcular aumento real del sueldo
      const salaryIncrease = ((newAmount - oldAmount) / oldAmount) * 100

      // Calcular aumento real (descontando inflación)
      const realIncrease = salaryIncrease - accumulatedInflation

      // Calcular qué porcentaje de la inflación cubre el aumento
      const coveragePercentage = (salaryIncrease / accumulatedInflation) * 100

      setInflationResult({
        salaryIncrease,
        accumulatedInflation,
        realIncrease,
        coveragePercentage,
        shouldBeSalary,
      })
    } else {
      setInflationResult(null)
    }
  }

  const handleAmountChange = (value: string, setter: (value: string) => void) => {
    const formatted = formatInputValue(value)
    setter(formatted)
  }

  const handleMonthsChange = (value: string) => {
    const months = Number.parseInt(value) || 0
    setMonthsSinceIncrease(value)

    // Ajustar array de inflaciones según cantidad de meses
    if (months > 0) {
      // Calcular los meses correspondientes (hacia atrás desde ahora)
      const now = new Date()
      const newInflations = Array(months)
        .fill(null)
        .map((_, index) => {
          // Ir hacia atrás: index 0 = hace 'months' meses, index 'months-1' = hace 1 mes
          const monthsBack = months - index
          const targetDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)

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

          return {
            value: monthlyInflations[index]?.value || "",
            month: monthNames[targetDate.getMonth()],
            year: targetDate.getFullYear(),
          }
        })
      setMonthlyInflations(newInflations)
    }

    // Limpiar errores y estado automático
    setInflationError(null)
    setInflationInfo(null)
    setAutoInflationEnabled(false)
  }

  const updateInflation = (index: number, value: string) => {
    const newInflations = [...monthlyInflations]
    newInflations[index] = { ...newInflations[index], value }
    setMonthlyInflations(newInflations)
    setAutoInflationEnabled(false) // Desactivar modo automático si edita manualmente
  }

  const loadAutomaticInflation = async () => {
    const months = Number.parseInt(monthsSinceIncrease)
    if (months <= 0) return

    setLoadingInflation(true)
    setInflationError(null)
    setInflationInfo(null)

    try {
      const response = await fetch(`/api/inflation?months=${months}`)
      const data = await response.json()

      if (data.success && data.data) {
        // Cargar todos los datos disponibles
        const newInflations = monthlyInflations.map((inf, index) => ({
          ...inf,
          value: data.data[index]?.rate?.toString() || "",
        }))
        setMonthlyInflations(newInflations)
        setAutoInflationEnabled(true)

        // Mostrar información sobre datos faltantes
        if (data.missingMonths && data.missingMonths.length > 0) {
          setInflationInfo(
            `Se cargaron ${data.totalMonths} de ${data.requestedMonths} meses. Los datos para ${data.missingMonths.join(", ")} aún no están disponibles (se publican con retraso).`,
          )
        } else {
          setInflationInfo(`Se cargaron todos los ${data.totalMonths} meses solicitados.`)
        }
      } else {
        setInflationError(data.error || "No se pudieron obtener datos de inflación")
      }
    } catch (error) {
      console.error("Error loading inflation data:", error)
      setInflationError("Error al conectar con el servidor de datos de inflación")
    } finally {
      setLoadingInflation(false)
    }
  }

  const getResultColor = () => {
    if (!inflationResult) return ""

    if (inflationResult.coveragePercentage >= 100) {
      return "text-green-700 dark:text-green-300"
    } else if (inflationResult.coveragePercentage >= 70) {
      return "text-yellow-700 dark:text-yellow-300"
    } else {
      return "text-red-700 dark:text-red-300"
    }
  }

  const getResultBadge = () => {
    if (!inflationResult) return null

    if (inflationResult.coveragePercentage >= 100) {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          ✅ Cubre la inflación
        </Badge>
      )
    } else if (inflationResult.coveragePercentage >= 70) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          ⚠️ Cubre parcialmente
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">❌ No cubre la inflación</Badge>
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="h-5 w-5" />
          <span>Calculadora de Aumento</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="old-salary">Sueldo Anterior</Label>
              <Input
                id="old-salary"
                type="text"
                value={oldSalary}
                onChange={(e) => handleAmountChange(e.target.value, setOldSalary)}
                placeholder="Ej: 100.000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-salary">Sueldo Nuevo</Label>
              <Input
                id="new-salary"
                type="text"
                value={newSalary}
                onChange={(e) => handleAmountChange(e.target.value, setNewSalary)}
                placeholder="Ej: 120.000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="months">¿Hace cuántos meses fue tu último aumento?</Label>
            <Input
              id="months"
              type="number"
              value={monthsSinceIncrease}
              onChange={(e) => handleMonthsChange(e.target.value)}
              placeholder="Ej: 3"
              min="1"
              max="24"
            />
          </div>

          {Number.parseInt(monthsSinceIncrease) > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Inflación mensual (%)</Label>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadAutomaticInflation}
                    disabled={loadingInflation}
                  >
                    {loadingInflation ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Usar datos INDEC
                      </>
                    )}
                  </Button>
                  {autoInflationEnabled && (
                    <Badge variant="secondary" className="text-xs">
                      Datos oficiales INDEC
                    </Badge>
                  )}
                </div>
              </div>

              {inflationError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-600 dark:text-red-400">{inflationError}</p>
                  </div>
                </div>
              )}

              {inflationInfo && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-sm text-blue-600 dark:text-blue-400">{inflationInfo}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {monthlyInflations.slice(0, Number.parseInt(monthsSinceIncrease)).map((inflation, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {inflation.month} {inflation.year}
                    </Label>
                    <Input
                      type="text"
                      value={inflation.value}
                      onChange={(e) => updateInflation(index, e.target.value)}
                      placeholder={inflation.value ? "Cargado" : "Sin datos"}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
              {autoInflationEnabled && (
                <p className="text-xs text-muted-foreground">
                  💡 Datos cargados automáticamente desde Argentina Datos (INDEC). Los campos vacíos indican que esos
                  datos aún no están disponibles. Puedes completarlos manualmente si los conoces.
                </p>
              )}
            </div>
          )}

          <Button onClick={calculate} className="w-full">
            <TrendingUp className="h-4 w-4 mr-2" />
            Calcular
          </Button>

          {inflationResult && (
            <div className="space-y-4">
              <div className="flex justify-center">{getResultBadge()}</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-center">
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Inflación Acumulada</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {inflationResult.accumulatedInflation.toFixed(2)}%
                  </p>
                </div>

                <div
                  className={`p-4 border rounded-lg text-center ${
                    inflationResult.realIncrease >= 0
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      inflationResult.realIncrease >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    Aumento Real
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      inflationResult.realIncrease >= 0
                        ? "text-green-700 dark:text-green-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {inflationResult.realIncrease >= 0 ? "+" : ""}
                    {inflationResult.realIncrease.toFixed(2)}%
                  </p>
                </div>
              </div>

              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium text-center mb-2">
                  Tu sueldo debería ser (para mantener poder adquisitivo)
                </p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 text-center">
                  ${formatCurrency(inflationResult.shouldBeSalary)}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 text-center mt-1">
                  Diferencia: ${formatCurrency(inflationResult.shouldBeSalary - parseFormattedValue(newSalary))}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
