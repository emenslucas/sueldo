"use client"

import React, { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatInputValue, parseFormattedValue } from "@/lib/formatters"
import { Calculator, TrendingUp, Loader2, AlertCircle, CheckCircle, AlertTriangle, XCircle } from "lucide-react"

interface InflationData {
  rate: number
  month: string
  year: number
}

interface Result {
  percentage: number
  increase: number
}

interface InflationResult {
  salaryIncrease: number
  accumulatedInflation: number
  realIncrease: number
  coveragePercentage: number
  shouldBeSalary: number
}

export function SalaryCalculator() {
  const [inputs, setInputs] = useState({
    oldSalary: "",
    newSalary: "",
    monthsSinceIncrease: "",
  })

  const [monthlyInflations, setMonthlyInflations] = useState<Array<{ value: string; month: string; year: number }>>([])
  const [result, setResult] = useState<Result | null>(null)
  const [inflationResult, setInflationResult] = useState<InflationResult | null>(null)

  const [loadingInflation, setLoadingInflation] = useState(false)
  const [autoInflationEnabled, setAutoInflationEnabled] = useState(false)
  const [inflationError, setInflationError] = useState<string | null>(null)

  const calculate = useCallback(() => {
    const oldAmount = parseFormattedValue(inputs.oldSalary)
    const newAmount = parseFormattedValue(inputs.newSalary)
    const months = Number.parseInt(inputs.monthsSinceIncrease)

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
      const validInflations = monthlyInflations
        .slice(0, months)
        .filter((inf) => inf.value.trim() !== "" && !isNaN(Number.parseFloat(inf.value.replace(",", "."))))

      if (validInflations.length === 0) {
        return
      }

      let accumulatedInflation = 1
      validInflations.forEach((inf) => {
        const monthlyRate = Number.parseFloat(inf.value.replace(",", ".")) / 100
        accumulatedInflation *= 1 + monthlyRate
      })
      accumulatedInflation = (accumulatedInflation - 1) * 100

      const shouldBeSalary = oldAmount * (1 + accumulatedInflation / 100)
      const salaryIncrease = ((newAmount - oldAmount) / oldAmount) * 100
      const realIncrease = salaryIncrease - accumulatedInflation
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
  }, [inputs, monthlyInflations])

  const handleAmountChange = useCallback(
    (field: keyof typeof inputs, value: string) => {
      const formatted = formatInputValue(value)
      setInputs((prev) => ({ ...prev, [field]: formatted }))
    },
    []
  )

  const handleMonthsChange = useCallback(
    (value: string) => {
      const months = Number.parseInt(value) || 0
      setInputs((prev) => ({ ...prev, monthsSinceIncrease: value }))

      if (months > 0) {
        const existingDataMap = new Map<string, string>()
        monthlyInflations.forEach((inf) => {
          const key = `${inf.month}-${inf.year}`
          existingDataMap.set(key, inf.value)
        })

        const now = new Date()
        const newInflations = Array(months)
          .fill(null)
          .map((_, index) => {
            const monthsBack = months - index + 1
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

            const month = monthNames[targetDate.getMonth()]
            const year = targetDate.getFullYear()
            const key = `${month}-${year}`

            return {
              value: existingDataMap.get(key) || "",
              month,
              year,
            }
          })
        setMonthlyInflations(newInflations)
      }

      setInflationError(null)
      setAutoInflationEnabled(false)
    },
    [monthlyInflations]
  )

  const updateInflation = useCallback(
    (index: number, value: string) => {
      setMonthlyInflations((prev) => {
        const newInflations = [...prev]
        newInflations[index] = { ...newInflations[index], value }
        return newInflations
      })
      setAutoInflationEnabled(false)
    },
    []
  )

  const loadAutomaticInflation = useCallback(async () => {
    const months = Number.parseInt(inputs.monthsSinceIncrease)
    if (months <= 0) return

    setLoadingInflation(true)
    setInflationError(null)

    try {
      const response = await fetch(`/api/inflation?months=${months}`)
      const data = await response.json()

      if (data.success && data.data) {
        setMonthlyInflations((prev) =>
          prev.map((inf, index) => ({
            ...inf,
            value: data.data[index]?.rate?.toString() || "",
          }))
        )
        setAutoInflationEnabled(true)
      } else {
        setInflationError(data.error || "No se pudieron obtener datos de inflación")
      }
    } catch (error) {
      console.error("Error loading inflation data:", error)
      setInflationError("Error al conectar con el servidor")
    } finally {
      setLoadingInflation(false)
    }
  }, [inputs.monthsSinceIncrease])

  const getResultBadge = useCallback(() => {
    if (!inflationResult) return null

    if (inflationResult.coveragePercentage >= 100) {
      return (
        <div className="flex items-center justify-center">
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-4 py-2 text-sm font-medium border border-green-300 dark:border-green-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Cubre la inflación
          </Badge>
        </div>
      )
    } else if (inflationResult.coveragePercentage >= 70) {
      return (
        <div className="flex items-center justify-center">
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-4 py-2 text-sm font-medium border border-yellow-300 dark:border-yellow-700">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Cubre parcialmente
          </Badge>
        </div>
      )
    } else {
      return (
        <div className="flex items-center justify-center">
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-4 py-2 text-sm font-medium border border-red-300 dark:border-red-700">
            <XCircle className="h-4 w-4 mr-2" />
            No cubre la inflación
          </Badge>
        </div>
      )
    }
  }, [inflationResult])

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
                value={inputs.oldSalary}
                onChange={(e) => handleAmountChange("oldSalary", e.target.value)}
                placeholder="Ej: 100.000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-salary">Sueldo Nuevo</Label>
              <Input
                id="new-salary"
                type="text"
                value={inputs.newSalary}
                onChange={(e) => handleAmountChange("newSalary", e.target.value)}
                placeholder="Ej: 120.000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="months">¿Hace cuántos meses fue tu último aumento?</Label>
            <Input
              id="months"
              type="number"
              value={inputs.monthsSinceIncrease}
              onChange={(e) => handleMonthsChange(e.target.value)}
              placeholder="Ej: 3"
              min="1"
              max="24"
            />
          </div>

          {Number.parseInt(inputs.monthsSinceIncrease) > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Inflación mensual (%)</Label>
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
              </div>

              {inflationError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-600 dark:text-red-400">{inflationError}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {monthlyInflations.slice(0, Number.parseInt(inputs.monthsSinceIncrease)).map((inflation, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {inflation.month} {inflation.year}
                    </Label>
                    <Input
                      type="text"
                      value={inflation.value}
                      onChange={(e) => updateInflation(index, e.target.value)}
                      placeholder="0.0"
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
              {getResultBadge()}

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
                  Diferencia: {inflationResult.shouldBeSalary > parseFormattedValue(inputs.newSalary) ? "+" : ""}$
                  {formatCurrency(Math.abs(inflationResult.shouldBeSalary - parseFormattedValue(inputs.newSalary)))}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
