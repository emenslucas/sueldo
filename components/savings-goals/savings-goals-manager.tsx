"use client";

import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { db } from "@/lib/firebase";
import {
  formatCurrency,
  formatDateInput,
  formatInputValue,
  isValidDate,
  parseDate,
  parseFormattedValue,
} from "@/lib/formatters";
import {
  type SavingsGoal,
  GOAL_CATEGORIES,
  GOAL_COLORS,
} from "@/types/savings-goals";
import type { User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Car,
  CheckCircle,
  Edit,
  GraduationCap,
  Home,
  Laptop,
  Plane,
  Plus,
  RefreshCw,
  Shield,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const iconMap = {
  Plane,
  Laptop,
  Car,
  Home,
  GraduationCap,
  Shield,
  TrendingUp,
  Target,
};

interface SavingsGoalsManagerProps {
  user: User;
}

export function SavingsGoalsManager({ user }: SavingsGoalsManagerProps) {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [loading, setLoading] = useState(false);
  const [useOrderBy, setUseOrderBy] = useState(true);
  const { toast } = useToast();

  // Form state
  type FormData = {
    name: string;
    description: string;
    targetAmount: string;
    targetDate: string;
    category: string;
    icon: string;
    color: (typeof GOAL_COLORS)[number];
  };

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    targetAmount: "",
    targetDate: "",
    category: "",
    icon: "Target",
    color: GOAL_COLORS[0],
  });

  // Load goals from Firestore
  useEffect(() => {
    if (!user) return;

    let unsubscribe: () => void;

    if (useOrderBy) {
      // Intentar con orderBy primero
      const qWithOrder = query(
        collection(db, "savingsGoals"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      unsubscribe = onSnapshot(
        qWithOrder,
        (querySnapshot) => {
          const goalsData: SavingsGoal[] = [];
          querySnapshot.forEach((doc) => {
            goalsData.push({ id: doc.id, ...doc.data() } as SavingsGoal);
          });
          setGoals(goalsData);
        },
        (error) => {
          console.error("Error loading goals with orderBy:", error);
          if (error.code === "failed-precondition") {
            // Si falla, usar consulta sin orderBy
            setUseOrderBy(false);
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: "Error al cargar los objetivos de ahorro",
            });
          }
        }
      );
    } else {
      // Consulta de respaldo sin orderBy
      const qSimple = query(
        collection(db, "savingsGoals"),
        where("userId", "==", user.uid)
      );

      unsubscribe = onSnapshot(
        qSimple,
        (querySnapshot) => {
          const goalsData: SavingsGoal[] = [];
          querySnapshot.forEach((doc) => {
            goalsData.push({ id: doc.id, ...doc.data() } as SavingsGoal);
          });

          // Ordenar manualmente por fecha de creación (más recientes primero)
          goalsData.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });

          setGoals(goalsData);
        },
        (error) => {
          console.error("Error loading goals:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Error al cargar los objetivos de ahorro",
          });
        }
      );
    }

    return () => unsubscribe();
  }, [user, useOrderBy, toast]);

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      description: "",
      targetAmount: "",
      targetDate: "",
      category: "",
      icon: "Target",
      color: GOAL_COLORS[0],
    });
  }, []);

  const handleCreateGoal = useCallback(async () => {
    if (
      !user ||
      !formData.name ||
      !formData.targetAmount ||
      !formData.category
    ) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor completa todos los campos obligatorios",
      });
      return;
    }

    const targetAmount = parseFormattedValue(formData.targetAmount);
    if (targetAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Monto inválido",
        description: "El monto objetivo debe ser mayor a 0",
      });
      return;
    }

    if (formData.targetDate && !isValidDate(formData.targetDate)) {
      toast({
        variant: "destructive",
        title: "Fecha inválida",
        description: "La fecha objetivo no es válida",
      });
      return;
    }

    setLoading(true);

    try {
      // Crear objeto sin campos undefined
      const goalData: any = {
        userId: user.uid,
        name: formData.name.trim(),
        targetAmount,
        currentAmount: 0,
        category: formData.category,
        icon: formData.icon,
        color: formData.color,
        isCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Solo agregar campos opcionales si tienen valor
      if (formData.description && formData.description.trim()) {
        goalData.description = formData.description.trim();
      }

      if (formData.targetDate) {
        goalData.targetDate = formData.targetDate;
      }

      await addDoc(collection(db, "savingsGoals"), goalData);

      setShowCreateDialog(false);
      resetForm();

      toast({
        title: "¡Objetivo creado!",
        description: "Tu objetivo de ahorro se ha creado exitosamente",
      });
    } catch (error: any) {
      console.error("Error creating goal:", error);
      if (error.code === "permission-denied") {
        toast({
          variant: "destructive",
          title: "Sin permisos",
          description:
            "No tienes permisos para crear objetivos. Verifica que estés autenticado.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error al crear el objetivo de ahorro",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user, formData, resetForm, toast]);

  const handleEditGoal = useCallback(async () => {
    if (
      !editingGoal ||
      !formData.name ||
      !formData.targetAmount ||
      !formData.category
    ) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor completa todos los campos obligatorios",
      });
      return;
    }

    const targetAmount = parseFormattedValue(formData.targetAmount);
    if (targetAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Monto inválido",
        description: "El monto objetivo debe ser mayor a 0",
      });
      return;
    }

    if (formData.targetDate && !isValidDate(formData.targetDate)) {
      toast({
        variant: "destructive",
        title: "Fecha inválida",
        description: "La fecha objetivo no es válida",
      });
      return;
    }

    setLoading(true);

    try {
      const goalRef = doc(db, "savingsGoals", editingGoal.id);

      // Crear objeto de actualización sin campos undefined
      const updateData: any = {
        name: formData.name.trim(),
        targetAmount,
        category: formData.category,
        icon: formData.icon,
        color: formData.color,
        updatedAt: new Date().toISOString(),
      };

      // Solo agregar campos opcionales si tienen valor
      if (formData.description && formData.description.trim()) {
        updateData.description = formData.description.trim();
      } else {
        // Si no hay descripción, eliminar el campo
        updateData.description = null;
      }

      if (formData.targetDate) {
        updateData.targetDate = formData.targetDate;
      } else {
        // Si no hay fecha, eliminar el campo
        updateData.targetDate = null;
      }

      await updateDoc(goalRef, updateData);

      setShowEditDialog(false);
      setEditingGoal(null);
      resetForm();

      toast({
        title: "¡Objetivo actualizado!",
        description: "Los cambios se han guardado exitosamente",
      });
    } catch (error: any) {
      console.error("Error updating goal:", error);
      if (error.code === "permission-denied") {
        toast({
          variant: "destructive",
          title: "Sin permisos",
          description: "No tienes permisos para actualizar este objetivo.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Error al actualizar el objetivo de ahorro",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [editingGoal, formData, resetForm, toast]);

  const handleDeleteGoal = useCallback(
    async (goalId: string) => {
      if (
        !confirm(
          "¿Estás seguro de que quieres eliminar este objetivo? Esta acción no se puede deshacer."
        )
      ) {
        return;
      }

      try {
        await deleteDoc(doc(db, "savingsGoals", goalId));

        toast({
          title: "Objetivo eliminado",
          description: "El objetivo de ahorro se ha eliminado exitosamente",
        });
      } catch (error: any) {
        console.error("Error deleting goal:", error);
        if (error.code === "permission-denied") {
          toast({
            variant: "destructive",
            title: "Sin permisos",
            description: "No tienes permisos para eliminar este objetivo.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Error al eliminar el objetivo de ahorro",
          });
        }
      }
    },
    [toast]
  );

  const openEditDialog = useCallback((goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      description: goal.description || "",
      targetAmount: formatCurrency(goal.targetAmount),
      targetDate: goal.targetDate || "",
      category: goal.category,
      icon: goal.icon,
      color: (GOAL_COLORS.includes(goal.color as (typeof GOAL_COLORS)[number])
        ? goal.color
        : GOAL_COLORS[0]) as (typeof GOAL_COLORS)[number],
    });
    setShowEditDialog(true);
  }, []);

  const calculateProgress = useCallback((goal: SavingsGoal) => {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  }, []);

  const calculateDaysRemaining = useCallback((targetDate?: string) => {
    if (!targetDate) return null;

    const target = parseDate(targetDate);
    if (!target) return null;

    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }, []);

  const getCategoryData = useCallback((category: string) => {
    return (
      GOAL_CATEGORIES.find((cat) => cat.value === category) ||
      GOAL_CATEGORIES[GOAL_CATEGORIES.length - 1]
    );
  }, []);

  const retryWithOrderBy = useCallback(() => {
    setUseOrderBy(true);
  }, []);

  return (
    <div className="space-y-6 mt-5">
      {/* Header con título y botón alineados */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Objetivos de Ahorro</h2>
          <p className="text-muted-foreground">Gestiona tus metas de ahorro</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Objetivo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Objetivo de Ahorro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ej: Viaje a Europa, Notebook nueva..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Detalles adicionales sobre tu objetivo..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetAmount">Monto *</Label>
                  <Input
                    id="targetAmount"
                    value={formData.targetAmount}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        targetAmount: formatInputValue(e.target.value),
                      }))
                    }
                    placeholder="$0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetDate">Fecha límite</Label>
                  <Input
                    id="targetDate"
                    value={formData.targetDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        targetDate: formatDateInput(e.target.value),
                      }))
                    }
                    placeholder="dd/mm/yyyy"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => {
                    const categoryData = getCategoryData(value);
                    setFormData((prev) => ({
                      ...prev,
                      category: value,
                      icon: categoryData.icon,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_CATEGORIES.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        <div className="flex items-center space-x-2">
                          {React.createElement(
                            iconMap[category.icon as keyof typeof iconMap],
                            {
                              className: "h-4 w-4",
                            }
                          )}
                          <span>{category.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {GOAL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color
                          ? "border-foreground"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, color }))
                      }
                    />
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCreateGoal}
                className="w-full"
                disabled={loading}
              >
                {loading ? "Creando..." : "Crear Objetivo"}
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
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Usando ordenamiento manual
                </p>
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

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-2">No hay objetivos</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-sm">
            Crea tu primer objetivo de ahorro y comienza a hacer seguimiento de
            tus metas financieras
          </p>
          {/* Removed redundant "Crear Objetivo" button */}
          {/* <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Objetivo
          </Button> */}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {goals.map((goal) => {
              const progress = calculateProgress(goal);
              const daysRemaining = calculateDaysRemaining(goal.targetDate);
              const categoryData = getCategoryData(goal.category);
              const IconComponent =
                iconMap[goal.icon as keyof typeof iconMap] || Target;

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${goal.color}15` }}
                          >
                            <IconComponent
                              className="h-5 w-5"
                              style={{ color: goal.color }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-lg font-medium leading-tight">
                              {goal.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                              {categoryData.label}
                            </p>
                          </div>
                        </div>

                        <div className="flex space-x-1 ml-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(goal)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {goal.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {goal.description}
                        </p>
                      )}

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Progreso
                          </span>
                          <span className="text-sm font-medium">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            ${formatCurrency(goal.currentAmount)}
                          </span>
                          <span className="text-muted-foreground">
                            ${formatCurrency(goal.targetAmount)}
                          </span>
                        </div>
                      </div>

                      {goal.targetDate && (
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {daysRemaining !== null && daysRemaining >= 0
                              ? `${daysRemaining} días`
                              : daysRemaining !== null && daysRemaining < 0
                              ? `Vencido hace ${Math.abs(daysRemaining)} días`
                              : goal.targetDate}
                          </span>
                        </div>
                      )}

                      {goal.isCompleted && (
                        <Badge className="w-full justify-center text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Completado
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Placeholders para objetivos adicionales */}
          {goals.length > 0 && goals.length < 3 && (
            <>
              {Array.from({ length: Math.min(2, 3 - goals.length) }).map(
                (_, index) => (
                  <motion.div
                    key={`placeholder-${index}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: 0.1 * (index + 1) }}
                  >
                    <div
                      className="h-full border-2 border-dashed border-muted-foreground/30 rounded-lg hover:border-muted-foreground/50 transition-colors cursor-pointer group"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <div className="p-6 h-full flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center group-hover:border-muted-foreground/60 transition-colors">
                          <Plus className="h-6 w-6 text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-muted-foreground/70 group-hover:text-muted-foreground/90 transition-colors">
                            Agregar objetivo
                          </p>
                          <p className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground/70 transition-colors">
                            Crea una nueva meta de ahorro
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Objetivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ej: Viaje a Europa, Notebook nueva..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Detalles adicionales sobre tu objetivo..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-targetAmount">Monto *</Label>
                <Input
                  id="edit-targetAmount"
                  value={formData.targetAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      targetAmount: formatInputValue(e.target.value),
                    }))
                  }
                  placeholder="$0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-targetDate">Fecha límite</Label>
                <Input
                  id="edit-targetDate"
                  value={formData.targetDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      targetDate: formatDateInput(e.target.value),
                    }))
                  }
                  placeholder="dd/mm/yyyy"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Categoría *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => {
                  const categoryData = getCategoryData(value);
                  setFormData((prev) => ({
                    ...prev,
                    category: value,
                    icon: categoryData.icon,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center space-x-2">
                        {React.createElement(
                          iconMap[category.icon as keyof typeof iconMap],
                          {
                            className: "h-4 w-4",
                          }
                        )}
                        <span>{category.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {GOAL_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color
                        ? "border-foreground"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <Button
              onClick={handleEditGoal}
              className="w-full"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
