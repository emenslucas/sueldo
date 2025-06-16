"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Plus, DollarSign, Calendar, TrendingUp, TrendingDown, Trash2, CheckCircle, RefreshCw } from "lucide-react"
import { formatCurrency, formatInputValue, parseFormattedValue } from "@/lib/formatters"
import type { SavingsGoal, SavingsContribution } from "@/types/savings-goals"
import { db } from "@/lib/firebase"
import { collection, doc, query, where, onSnapshot, orderBy, runTransaction } from "firebase/firestore"
import type { User } from "firebase/auth"
import { AnimatePresence, motion } from "framer-motion"

interface GoalContributionsProps {
  user: User
  goals: SavingsGoal[]
}

export function GoalContributions({ user, goals }: GoalContributionsProps) {
  const [contributions, setContributions] = useState<SavingsContribution[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [useOrderBy, setUseOrderBy] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    goalId: "",
    amount: "",
    description: "",
    type: "deposit" as "deposit" | "withdrawal",
  })

  // Load contributions from Firestore
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    if (!user) {
      setContributions([])
      return () => {
        if (unsubscribe) unsubscribe()
      }
    }
    if (useOrderBy) {
      const qWithOrder = query(
        collection(db, "savingsContributions"),
        where("userId", "==", user.uid),
        orderBy("date", "desc"),
      )

      unsubscribe = onSnapshot(
        qWithOrder,
        (querySnapshot) => {
          const contributionsData: SavingsContribution[] = []
          querySnapshot.forEach((doc) => {
            contributionsData.push({ id: doc.id, ...doc.data() } as SavingsContribution)
          })
          setContributions(contributionsData)
        },
        (error) => {
          if (error.code === "failed-precondition") {
            setUseOrderBy(false)
          } else if (error.code !== "permission-denied") {
            setError("Error al cargar las contribuciones")
            console.error("Error loading contributions with orderBy:", error)
          }
        },
      )
    } else {
      const qSimple = query(collection(db, "savingsContributions"), where("userId", "==", user.uid))
      unsubscribe = onSnapshot(
        qSimple,
        (querySnapshot) => {
          const contributionsData: SavingsContribution[] = []
          querySnapshot.forEach((doc) => {
            contributionsData.push({ id: doc.id, ...doc.data() } as SavingsContribution)
          })
          contributionsData.sort((a, b) => {
            const dateA = new Date(a.date || 0).getTime()
            const dateB = new Date(b.date || 0).getTime()
            return dateB - dateA
          })
          setContributions(contributionsData)
        },
        (error) => {
          if (error.code !== "permission-denied") {
            setError("Error al cargar las contribuciones")
            console.error("Error loading contributions:", error)
          }
        },
      )
    }
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [user, useOrderBy])

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const resetForm = useCallback(() => {
    setFormData({
      goalId: "",
      amount: "",
      description: "",
      type: "deposit",
    })
  }, [])

  const handleAddContribution = useCallback(async () => {
    if (!user || !formData.goalId || !formData.amount) {
      setError("Por favor completa todos los campos obligatorios")
      return
    }

    const amount = parseFormattedValue(formData.amount)
    if (amount <= 0) {
      setError("El monto debe ser mayor a 0")
      return
    }

    const selectedGoal = goals.find((g) => g.id === formData.goalId)
    if (!selectedGoal) {
      setError("Objetivo no encontrado")
      return
    }

    // Validar que no se retire más de lo que hay
    if (formData.type === "withdrawal" && amount > selectedGoal.currentAmount) {
      setError("No puedes retirar más de lo que tienes ahorrado")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await runTransaction(db, async (transaction) => {
        // Crear la contribución
        const contributionRef = doc(collection(db, "savingsContributions"))

        // Crear objeto sin campos undefined
        const contributionData: any = {
          goalId: formData.goalId,
          userId: user.uid,
          amount,
          date: new Date().toISOString(),
          type: formData.type,
        }

        // Solo agregar descripción si tiene valor
        if (formData.description && formData.description.trim()) {
          contributionData.description = formData.description.trim()
        }

        transaction.set(contributionRef, contributionData)

        // Actualizar el monto actual del objetivo
        const goalRef = doc(db, "savingsGoals", formData.goalId)
        const newAmount =
          formData.type === "deposit" ? selectedGoal.currentAmount + amount : selectedGoal.currentAmount - amount

        const updateData: any = {
          currentAmount: newAmount,
          updatedAt: new Date().toISOString(),
        }

        // Marcar como completado si se alcanzó el objetivo
        if (newAmount >= selectedGoal.targetAmount && !selectedGoal.isCompleted) {
          updateData.isCompleted = true
        } else if (newAmount < selectedGoal.targetAmount && selectedGoal.isCompleted) {
          updateData.isCompleted = false
        }

        transaction.update(goalRef, updateData)
      })

      setShowAddDialog(false)
      resetForm()
      setSuccess(formData.type === "deposit" ? "Depósito agregado exitosamente" : "Retiro registrado exitosamente")
    } catch (error: any) {
      console.error("Error adding contribution:", error)
      if (error.code === "permission-denied") {
        setError("No tienes permisos para registrar contribuciones.")
      } else {
        setError("Error al registrar la contribución")
      }
    } finally {
      setLoading(false)
    }
  }, [user, formData, goals, resetForm])

  const handleDeleteContribution = useCallback(
    async (contribution: SavingsContribution) => {
      if (!confirm("¿Estás seguro de que quieres eliminar esta contribución?")) {
        return
      }

      const goal = goals.find((g) => g.id === contribution.goalId)
      if (!goal) {
        setError("Objetivo no encontrado")
        return
      }

      try {
        await runTransaction(db, async (transaction) => {
          // Eliminar la contribución
          const contributionRef = doc(db, "savingsContributions", contribution.id)
          transaction.delete(contributionRef)

          // Revertir el cambio en el objetivo
          const goalRef = doc(db, "savingsGoals", contribution.goalId)
          const newAmount =
            contribution.type === "deposit"
              ? goal.currentAmount - contribution.amount
              : goal.currentAmount + contribution.amount

          const updateData: any = {
            currentAmount: Math.max(0, newAmount),
            updatedAt: new Date().toISOString(),
          }

          // Actualizar estado de completado
          if (newAmount < goal.targetAmount && goal.isCompleted) {
            updateData.isCompleted = false
          }

          transaction.update(goalRef, updateData)
        })

        setSuccess("Contribución eliminada exitosamente")
      } catch (error: any) {
        console.error("Error deleting contribution:", error)
        if (error.code === "permission-denied") {
          setError("No tienes permisos para eliminar esta contribución.")
        } else {
          setError("Error al eliminar la contribución")
        }
      }
    },
    [goals],
  )

  const getGoalName = useCallback(
    (goalId: string) => {
      const goal = goals.find((g) => g.id === goalId)
      return goal?.name || "Objetivo eliminado"
    },
    [goals],
  )

  const retryWithOrderBy = useCallback(() => {
    setUseOrderBy(true)
    setError(null)
  }, [])

  const activeGoals = goals.filter((goal) => !goal.isCompleted)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-semibold">Movimientos</h3>
          <p className="text-muted-foreground">Depósitos y retiros</p>
        </div>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} disabled={activeGoals.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar Movimiento</DialogTitle>
              <DialogDescription></DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal">Objetivo *</Label>
                <Select
                  value={formData.goalId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, goalId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeGoals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{goal.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ${formatCurrency(goal.currentAmount)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "deposit" | "withdrawal") => setFormData((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span>Depósito</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="withdrawal">
                      <div className="flex items-center space-x-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span>Retiro</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Monto *</Label>
                <Input
                  id="amount"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      amount: formatInputValue(e.target.value),
                    }))
                  }
                  placeholder="$0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalles del movimiento..."
                  rows={2}
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button onClick={handleAddContribution} className="w-full" disabled={loading}>
                {loading ? "Registrando..." : `Registrar ${formData.type === "deposit" ? "Depósito" : "Retiro"}`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Index Status */}
      {!useOrderBy && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Usando ordenamiento manual</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Los índices pueden tardar unos minutos en propagarse
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={retryWithOrderBy}
              className="text-yellow-800 dark:text-yellow-200"
            >
              Reintentar
            </Button>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* No goals message */}
      {activeGoals.length === 0 && (
        <Card className="p-6 text-center">
          <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No tienes objetivos activos. Crea uno para registrar movimientos.</p>
        </Card>
      )}

      {/* Contributions List */}
      {contributions.length === 0 ? (
        activeGoals.length > 0 && (
          <Card className="p-6 text-center">
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">No hay movimientos. Agrega uno.</p>
          </Card>
        )
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historial</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              <AnimatePresence>
                {contributions.map((contribution) => (
                  <motion.div
                    key={contribution.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className={`p-2 rounded-full ${
                          contribution.type === "deposit"
                            ? "bg-green-100 dark:bg-green-900"
                            : "bg-red-100 dark:bg-red-900"
                        }`}
                      >
                        {contribution.type === "deposit" ? (
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1">
                          <p className="font-medium text-sm">{getGoalName(contribution.goalId)}</p>
                          <Badge variant={contribution.type === "deposit" ? "default" : "destructive"}>
                            {contribution.type === "deposit" ? "Depósito" : "Retiro"}
                          </Badge>
                        </div>
                        {contribution.description && (
                          <p className="text-xs text-muted-foreground truncate">{contribution.description}</p>
                        )}
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(contribution.date).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`font-semibold text-sm ${
                          contribution.type === "deposit"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {contribution.type === "deposit" ? "+" : "-"}${formatCurrency(contribution.amount)}
                      </span>

                      <Button variant="ghost" size="sm" onClick={() => handleDeleteContribution(contribution)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Silenciar errores globales de Firestore permission-denied en consola
if (typeof window !== "undefined") {
  const originalConsoleError = window.console.error
  window.console.error = function (...args) {
    if (
      typeof args[0] === "string" &&
      args[0].includes("@firebase/firestore") &&
      args[0].includes("permission-denied")
    ) {
      return
    }
    originalConsoleError.apply(window.console, args)
  }
}
