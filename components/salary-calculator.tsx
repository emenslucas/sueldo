"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatInputValue, parseFormattedValue } from "@/lib/formatters"
import { Calculator, TrendingUp } from "lucide-react"

export function SalaryCalculator() {
  const [oldSalary, setOldSalary] = useState("")
  const [newSalary, setNewSalary] = useState("")
  const [result, setResult] = useState<{
    percentage: number
    increase: number
  } | null>(null)

  const calculateIncrease = () => {
    const oldAmount = parseFormattedValue(oldSalary)
    const newAmount = parseFormattedValue(newSalary)

    if (oldAmount <= 0 || newAmount <= 0) {
      return
    }

    const increase = newAmount - oldAmount
    const percentage = (increase / oldAmount) * 100

    setResult({
      percentage,
      increase,
    })
  }

  const handleAmountChange = (value: string, setter: (value: string) => void) => {
    const formatted = formatInputValue(value)
    setter(formatted)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calculator className="h-5 w-5" />
          <span>Calculadora de Aumento</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <Button onClick={calculateIncrease} className="w-full">
          <TrendingUp className="h-4 w-4 mr-2" />
          Calcular Aumento
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-sm text-green-600 font-medium">Aumento Porcentual</p>
                <p className="text-2xl font-bold text-green-700">{result.percentage.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Aumento en Pesos</p>
                <p className="text-2xl font-bold text-green-700">${formatCurrency(result.increase)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
