"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatInputValue, parseFormattedValue } from "@/lib/formatters"
import { Calculator, TrendingUp } from "lucide-react"

export function SalaryCalculator() {
  const [oldSalary, setOldSalary] = useState("")
  const [newSalary, setNewSalary] = useState("")
  const [monthsSinceIncrease, setMonthsSinceIncrease] = useState("")
  const [monthlyInflations, setMonthlyInflations] = useState<string[]>([""])
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
      // Validar que tengamos inflación para todos los meses
      const validInflations = monthlyInflations
        .slice(0, months)
        .filter((inf) => inf.trim() !== "" && !isNaN(Number.parseFloat(inf.replace(",", "."))))

      if (validInflations.length !== months) {
        return
      }

      // Calcular inflación acumulada (interés compuesto)
      let accumulatedInflation = 1
      validInflations.forEach((inf) => {
        const monthlyRate = Number.parseFloat(inf.replace(",", ".")) / 100
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
      const newInflations = Array(months)
        .fill("")
        .map((_, index) => monthlyInflations[index] || "")
      setMonthlyInflations(newInflations)
    }
  }

  const updateInflation = (index: number, value: string) => {
    const newInflations = [...monthlyInflations]
    newInflations[index] = value
    setMonthlyInflations(newInflations)
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
              <Label>Inflación mensual de cada mes (%)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {monthlyInflations.slice(0, Number.parseInt(monthsSinceIncrease)).map((inflation, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Mes {index + 1}</Label>
                    <Input
                      type="text"
                      value={inflation}
                      onChange={(e) => updateInflation(index, e.target.value)}
                      placeholder="Ej: 4,2"
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
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
