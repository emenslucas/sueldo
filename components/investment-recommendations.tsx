"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, TrendingUp, Shield, Zap } from "lucide-react"

export function InvestmentRecommendations() {
  const handleOpenComparaTasas = () => {
    window.open("https://comparatasas.ar/", "_blank", "noopener,noreferrer")
  }

  return (
    <div className="space-y-4">
      {/* Botón principal */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="p-6 text-center">
          <TrendingUp className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Compará Tasas de Inversión</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Encontrá las mejores opciones para hacer crecer tu ahorro
          </p>
          <Button onClick={handleOpenComparaTasas} className="w-full" size="lg">
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Comparador de Tasas
          </Button>
        </CardContent>
      </Card>

      {/* Tips rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div>
              <h4 className="font-medium text-sm">Plazo Fijo</h4>
              <p className="text-xs text-muted-foreground">Seguro y predecible</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <Zap className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            <div>
              <h4 className="font-medium text-sm">FCI</h4>
              <p className="text-xs text-muted-foreground">Mayor rendimiento</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
