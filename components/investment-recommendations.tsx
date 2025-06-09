"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, ExternalLink, RefreshCw, AlertCircle } from "lucide-react"

interface InvestmentData {
  nombre: string
  imagen: string
  tasa: string
  tasaNumero: number
  link: string
}

interface InvestmentResponse {
  success: boolean
  data?: InvestmentData
  error?: string
  timestamp?: string
}

export function InvestmentRecommendations() {
  const [investment, setInvestment] = useState<InvestmentData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  const fetchInvestmentData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/investments")
      const data: InvestmentResponse = await response.json()

      if (data.success && data.data) {
        setInvestment(data.data)
        setLastUpdate(data.timestamp || new Date().toISOString())
      } else {
        setError(data.error || "Error al cargar datos")
      }
    } catch (err) {
      setError("Error de conexión")
      console.error("Error fetching investment data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvestmentData()
  }, [])

  const formatLastUpdate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Mejor Inversión</span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchInvestmentData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !investment && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Buscando mejores tasas...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm text-red-800 font-medium">Error al cargar datos</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
        )}

        {investment && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              {investment.imagen && (
                <img
                  src={investment.imagen || "/placeholder.svg"}
                  alt={investment.nombre}
                  className="w-12 h-12 rounded-lg object-contain bg-gray-50"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{investment.nombre}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    TNA: {investment.tasa}
                  </Badge>
                  <Badge variant="outline">Mejor tasa</Badge>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Recomendación:</strong> Esta es la billetera virtual con la mejor TNA disponible actualmente.
                Considera transferir parte de tus ahorros para maximizar el rendimiento.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button asChild className="flex-1">
                <a href={investment.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver más información
                </a>
              </Button>
            </div>

            {lastUpdate && (
              <p className="text-xs text-muted-foreground text-center">
                Última actualización: {formatLastUpdate(lastUpdate)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
