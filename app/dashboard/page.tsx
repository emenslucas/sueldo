"use client"

import { DialogTrigger } from "@/components/ui/dialog"
import React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { onAuthStateChanged, signOut } from "firebase/auth"
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  getDocs,
} from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import {
  formatCurrency,
  formatInputValue,
  parseFormattedValue,
  formatForInput,
  formatDateInput,
  isValidDate,
  parseDate,
} from "@/lib/formatters"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { SalaryCalculator } from "@/components/salary-calculator"
import { InvestmentRecommendations } from "@/components/investment-recommendations"
import {
  Loader2,
  LogOut,
  Plus,
  Settings,
  Trash2,
  DollarSign,
  PiggyBank,
  User,
  Edit,
  Home,
  Car,
  Utensils,
  ShoppingBag,
  Plane,
  X,
  AlertCircle,
  CheckCircle,
  Filter,
  Wallet,
  Gift,
  ChevronUp,
  ChevronDown,
  Menu,
  TrendingUp,
  Calculator,
} from "lucide-react"

interface Category {
  name: string
  percentage: number
  icon: string
}

interface UserConfig {
  salary: number
  monotributo: number
  categories: {
    [key: string]: Category
  }
  categoryOrder?: string[]
}

interface Expense {
  id: string
  category: string
  amount: number
  description: string
  date: string
}

const defaultCategories = {
  ahorro: { name: "Ahorro", percentage: 40, icon: "PiggyBank" },
  servicios: { name: "Servicios", percentage: 35, icon: "Home" },
  gastos_personales: { name: "Gastos Personales", percentage: 25, icon: "User" },
}

const defaultCategoryOrder = ["ahorro", "servicios", "gastos_personales"]

const availableIcons = [
  { name: "PiggyBank", icon: PiggyBank, label: "Ahorro" },
  { name: "Gift", icon: Gift, label: "Regalo" },
  { name: "Home", icon: Home, label: "Casa" },
  { name: "User", icon: User, label: "Personal" },
  { name: "Car", icon: Car, label: "Transporte" },
  { name: "Utensils", icon: Utensils, label: "Comida" },
  { name: "ShoppingBag", icon: ShoppingBag, label: "Compras" },
  { name: "Plane", icon: Plane, label: "Viajes" },
  { name: "DollarSign", icon: DollarSign, label: "Servicios" },
]

const iconMap = availableIcons.reduce(
  (acc, item) => {
    acc[item.name] = item.icon
    return acc
  },
  {} as Record<string, any>,
)

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<UserConfig | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [showExpenseDialog, setShowExpenseDialog] = useState(false)
  const [tempConfig, setTempConfig] = useState<UserConfig | null>(null)
  const [newExpense, setNewExpense] = useState({
    category: "",
    amount: "",
    description: "",
  })
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryIcon, setNewCategoryIcon] = useState("DollarSign")
  const [newCategoryPercentage, setNewCategoryPercentage] = useState("")

  // Estados para manejo de errores y loading
  const [addingExpense, setAddingExpense] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Estados para filtros
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterDate, setFilterDate] = useState<string>("")

  // Estado para mostrar/ocultar categorías
  const [showCategories, setShowCategories] = useState(true)

  // Estado para el menú móvil
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Estados para modales
  const [showCalculatorModal, setShowCalculatorModal] = useState(false)
  const [showInvestmentModal, setShowInvestmentModal] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        await loadUserConfig(user.uid)
        loadExpenses(user.uid)
      } else {
        router.push("/")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  // Filtrar gastos cuando cambian los filtros o los gastos
  useEffect(() => {
    let filtered = [...expenses]

    // Filtrar por categoría
    if (filterCategory !== "all") {
      filtered = filtered.filter((expense) => expense.category === filterCategory)
    }

    // Filtrar por fecha específica
    if (filterDate && isValidDate(filterDate)) {
      const targetDate = parseDate(filterDate)
      if (targetDate) {
        filtered = filtered.filter((expense) => {
          const expenseDate = new Date(expense.date)
          return (
            expenseDate.getDate() === targetDate.getDate() &&
            expenseDate.getMonth() === targetDate.getMonth() &&
            expenseDate.getFullYear() === targetDate.getFullYear()
          )
        })
      }
    }

    setFilteredExpenses(filtered)
  }, [expenses, filterCategory, filterDate])

  // Limpiar mensajes después de 5 segundos
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  const loadUserConfig = async (userId: string) => {
    try {
      const docRef = doc(db, "users", userId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const userData = docSnap.data() as UserConfig
        // Asegurar que existe categoryOrder
        if (!userData.categoryOrder) {
          userData.categoryOrder = Object.keys(userData.categories)
        }
        setConfig(userData)
      } else {
        const defaultConfig: UserConfig = {
          salary: 0,
          monotributo: 0,
          categories: defaultCategories,
          categoryOrder: defaultCategoryOrder,
        }
        setConfig(defaultConfig)
        await setDoc(docRef, defaultConfig)
      }
    } catch (error) {
      console.error("Error loading config:", error)
      setError("Error al cargar la configuración")
    }
  }

  const loadExpenses = (userId: string) => {
    const q = query(collection(db, "expenses"), where("userId", "==", userId))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const expensesData: Expense[] = []
      querySnapshot.forEach((doc) => {
        expensesData.push({ id: doc.id, ...doc.data() } as Expense)
      })
      setExpenses(expensesData)
    })

    return unsubscribe
  }

  const saveConfig = async () => {
    if (!user || !tempConfig) return

    const totalPercentage = Object.values(tempConfig.categories).reduce((sum, category) => sum + category.percentage, 0)

    if (Math.abs(totalPercentage - 100) > 0.01) {
      setError(`La suma de porcentajes debe ser 100%. Actualmente es ${totalPercentage.toFixed(1)}%`)
      return
    }

    try {
      const docRef = doc(db, "users", user.uid)
      await setDoc(docRef, tempConfig)
      setConfig(tempConfig)
      setShowConfigDialog(false)
      setSuccess("Configuración guardada exitosamente")
    } catch (error) {
      console.error("Error saving config:", error)
      setError("Error al guardar la configuración")
    }
  }

  const addExpense = async () => {
    if (!user || !newExpense.category || !newExpense.amount) {
      setError("Por favor completa todos los campos obligatorios")
      return
    }

    const amount = parseFormattedValue(newExpense.amount)
    if (isNaN(amount) || amount <= 0) {
      setError("El monto debe ser un número mayor a 0")
      return
    }

    setAddingExpense(true)
    setError(null)

    try {
      const expenseData = {
        userId: user.uid,
        category: newExpense.category,
        amount: amount,
        description: newExpense.description || "Sin descripción",
        date: new Date().toISOString(),
      }

      await addDoc(collection(db, "expenses"), expenseData)

      setNewExpense({ category: "", amount: "", description: "" })
      setShowExpenseDialog(false)
      setSuccess("Gasto agregado exitosamente")
    } catch (error: any) {
      console.error("Error adding expense:", error)

      if (error.code === "permission-denied") {
        setError("Error de permisos. Verifica que las reglas de Firestore estén configuradas correctamente.")
      } else if (error.code === "unauthenticated") {
        setError("Usuario no autenticado. Por favor inicia sesión nuevamente.")
      } else {
        setError(`Error al agregar el gasto: ${error.message}`)
      }
    } finally {
      setAddingExpense(false)
    }
  }

  const deleteExpense = async (expenseId: string) => {
    try {
      await deleteDoc(doc(db, "expenses", expenseId))
      setSuccess("Gasto eliminado exitosamente")
    } catch (error: any) {
      console.error("Error deleting expense:", error)
      setError("Error al eliminar el gasto")
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
    router.push("/")
  }

  const calculateCategoryData = (categoryKey: string) => {
    if (!config) return { available: 0, spent: 0, percentage: 0, budget: 0 }

    const netSalary = config.salary - config.monotributo
    const categoryBudget = (netSalary * config.categories[categoryKey].percentage) / 100

    // Calcular gastos del mes actual
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const spent = expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date)
        return (
          expense.category === categoryKey &&
          expenseDate.getMonth() === currentMonth &&
          expenseDate.getFullYear() === currentYear
        )
      })
      .reduce((total, expense) => total + expense.amount, 0)

    return {
      available: categoryBudget - spent,
      spent,
      percentage: categoryBudget > 0 ? (spent / categoryBudget) * 100 : 0,
      budget: categoryBudget,
    }
  }

  const calculateRemainingBudget = () => {
    if (!config) return 0

    const netSalary = config.salary - config.monotributo
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const totalSpentThisMonth = expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date)
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
      })
      .reduce((total, expense) => total + expense.amount, 0)

    return netSalary - totalSpentThisMonth
  }

  const resetAllData = async () => {
    if (!user) return

    try {
      const q = query(collection(db, "expenses"), where("userId", "==", user.uid))
      const querySnapshot = await getDocs(q)

      const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref))
      await Promise.all(deletePromises)

      setShowResetDialog(false)
      setSuccess("Todos los datos han sido restablecidos")
    } catch (error) {
      console.error("Error resetting data:", error)
      setError("Error al restablecer los datos")
    }
  }

  const updateExpense = async () => {
    if (!editingExpense || !editingExpense.category || !editingExpense.amount) {
      setError("Por favor completa todos los campos obligatorios")
      return
    }

    try {
      const expenseRef = doc(db, "expenses", editingExpense.id)
      await setDoc(expenseRef, {
        userId: user.uid,
        category: editingExpense.category,
        amount: editingExpense.amount,
        description: editingExpense.description,
        date: editingExpense.date,
      })

      setEditingExpense(null)
      setShowEditDialog(false)
      setSuccess("Gasto actualizado exitosamente")
    } catch (error) {
      console.error("Error updating expense:", error)
      setError("Error al actualizar el gasto")
    }
  }

  const addNewCategory = () => {
    if (!tempConfig || !newCategoryName.trim()) {
      setError("Por favor ingresa un nombre para la categoría")
      return
    }

    const categoryKey = newCategoryName.toLowerCase().replace(/\s+/g, "_")

    if (tempConfig.categories[categoryKey]) {
      setError("Ya existe una categoría con ese nombre")
      return
    }

    const percentage = parseFormattedValue(newCategoryPercentage)
    const newCategory: Category = {
      name: newCategoryName.trim(),
      percentage: percentage,
      icon: newCategoryIcon,
    }

    setTempConfig({
      ...tempConfig,
      categories: {
        ...tempConfig.categories,
        [categoryKey]: newCategory,
      },
      categoryOrder: [...(tempConfig.categoryOrder || []), categoryKey],
    })

    setNewCategoryName("")
    setNewCategoryPercentage("")
    setNewCategoryIcon("DollarSign")
    setSuccess("Categoría agregada (recuerda guardar la configuración)")
  }

  const deleteCategory = (categoryKey: string) => {
    if (!tempConfig) return

    const { [categoryKey]: deleted, ...remainingCategories } = tempConfig.categories
    const newOrder = tempConfig.categoryOrder?.filter((key) => key !== categoryKey) || []

    setTempConfig({
      ...tempConfig,
      categories: remainingCategories,
      categoryOrder: newOrder,
    })
  }

  const updateCategoryName = (categoryKey: string, newName: string) => {
    if (!tempConfig) return

    setTempConfig({
      ...tempConfig,
      categories: {
        ...tempConfig.categories,
        [categoryKey]: {
          ...tempConfig.categories[categoryKey],
          name: newName,
        },
      },
    })
  }

  const updateCategoryIcon = (categoryKey: string, newIcon: string) => {
    if (!tempConfig) return

    setTempConfig({
      ...tempConfig,
      categories: {
        ...tempConfig.categories,
        [categoryKey]: {
          ...tempConfig.categories[categoryKey],
          icon: newIcon,
        },
      },
    })
  }

  const moveCategory = (fromIndex: number, toIndex: number) => {
    if (!tempConfig?.categoryOrder) return

    const newOrder = [...tempConfig.categoryOrder]
    const [movedItem] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, movedItem)

    setTempConfig({
      ...tempConfig,
      categoryOrder: newOrder,
    })
  }

  const getOrderedCategories = () => {
    if (!config?.categoryOrder) return Object.entries(config?.categories || {})

    const orderedEntries: [string, Category][] = []

    // Agregar categorías en el orden especificado
    config.categoryOrder.forEach((key) => {
      if (config.categories[key]) {
        orderedEntries.push([key, config.categories[key]])
      }
    })

    // Agregar categorías que no están en el orden (por si acaso)
    Object.entries(config.categories).forEach(([key, category]) => {
      if (!config.categoryOrder?.includes(key)) {
        orderedEntries.push([key, category])
      }
    })

    return orderedEntries
  }

  const getOrderedTempCategories = () => {
    if (!tempConfig?.categoryOrder) return Object.entries(tempConfig?.categories || {})

    const orderedEntries: [string, Category][] = []

    // Agregar categorías en el orden especificado
    tempConfig.categoryOrder.forEach((key) => {
      if (tempConfig.categories[key]) {
        orderedEntries.push([key, tempConfig.categories[key]])
      }
    })

    // Agregar categorías que no están en el orden (por si acaso)
    Object.entries(tempConfig.categories).forEach(([key, category]) => {
      if (!tempConfig.categoryOrder?.includes(key)) {
        orderedEntries.push([key, category])
      }
    })

    return orderedEntries
  }

  const handleAmountChange = (value: string, setter: (value: string) => void) => {
    const formatted = formatInputValue(value)
    setter(formatted)
  }

  const handlePercentageChange = (categoryKey: string, value: string) => {
    if (!tempConfig) return

    const formatted = formatInputValue(value)
    const numericValue = parseFormattedValue(formatted)

    setTempConfig({
      ...tempConfig,
      categories: {
        ...tempConfig.categories,
        [categoryKey]: {
          ...tempConfig.categories[categoryKey],
          percentage: numericValue,
        },
      },
    })
  }

  // Componente del menú móvil
  const MobileMenu = () => (
    <div className="flex flex-col space-y-2 p-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setShowCalculatorModal(true)
          setShowMobileMenu(false)
        }}
        className="justify-start"
      >
        <Calculator className="h-4 w-4 mr-2" />
        Calculadora
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setShowResetDialog(true)
          setShowMobileMenu(false)
        }}
        className="justify-start"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Restablecer Datos
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setTempConfig(config)
          setShowConfigDialog(true)
          setShowMobileMenu(false)
        }}
        className="justify-start"
      >
        <Settings className="h-4 w-4 mr-2" />
        Configurar
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          handleLogout()
          setShowMobileMenu(false)
        }}
        className="justify-start"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Salir
      </Button>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!config) {
    return <div>Error loading configuration</div>
  }

  const netSalary = config.salary - config.monotributo
  const remainingBudget = calculateRemainingBudget()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mensajes de error y éxito */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">{success}</p>
            <Button variant="ghost" size="sm" onClick={() => setSuccess(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Header responsive */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg sm:text-xl font-semibold">Gestor de Sueldo</h1>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => setShowCalculatorModal(true)}>
                <Calculator className="h-4 w-4 mr-2" />
                Calculadora
              </Button>
              <Dialog open={showCalculatorModal} onOpenChange={setShowCalculatorModal}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Calculadora de Aumento</DialogTitle>
                    <DialogDescription>Calcula el porcentaje y monto de aumento entre dos sueldos.</DialogDescription>
                  </DialogHeader>
                  <SalaryCalculator />
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Restablecer
              </Button>
              <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setTempConfig(config)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Configuración</DialogTitle>
                    <DialogDescription>Ajusta tu sueldo y gestiona tus categorías</DialogDescription>
                  </DialogHeader>
                  {tempConfig && (
                    <Tabs defaultValue="general" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="categories">Categorías</TabsTrigger>
                      </TabsList>

                      <TabsContent value="general" className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="salary">Sueldo Bruto</Label>
                          <Input
                            id="salary"
                            type="text"
                            value={formatForInput(tempConfig.salary)}
                            onChange={(e) => {
                              const formatted = formatInputValue(e.target.value)
                              setTempConfig({
                                ...tempConfig,
                                salary: parseFormattedValue(formatted),
                              })
                            }}
                            placeholder="Ingresa tu sueldo bruto"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="monotributo">Monotributo</Label>
                          <Input
                            id="monotributo"
                            type="text"
                            value={formatForInput(tempConfig.monotributo)}
                            onChange={(e) => {
                              const formatted = formatInputValue(e.target.value)
                              setTempConfig({
                                ...tempConfig,
                                monotributo: parseFormattedValue(formatted),
                              })
                            }}
                            placeholder="Ingresa el monto del monotributo"
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="categories" className="space-y-4">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium">Categorías Existentes</h3>
                          <div className="space-y-2">
                            {getOrderedTempCategories().map(([key, category], index) => (
                              <Card key={key} className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3 flex-1">
                                    <Select
                                      value={category.icon}
                                      onValueChange={(value) => updateCategoryIcon(key, value)}
                                    >
                                      <SelectTrigger className="w-16">
                                        <SelectValue>
                                          {React.createElement(iconMap[category.icon] || DollarSign, {
                                            className: "h-4 w-4",
                                          })}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableIcons.map((iconItem) => (
                                          <SelectItem key={iconItem.name} value={iconItem.name}>
                                            <div className="flex items-center space-x-2">
                                              {React.createElement(iconItem.icon, { className: "h-4 w-4" })}
                                              <span>{iconItem.label}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      value={category.name}
                                      onChange={(e) => updateCategoryName(key, e.target.value)}
                                      className="flex-1"
                                      placeholder="Nombre de la categoría"
                                    />
                                    <div className="flex items-center space-x-2">
                                      <Input
                                        type="text"
                                        value={formatForInput(category.percentage)}
                                        onChange={(e) => handlePercentageChange(key, e.target.value)}
                                        className="w-20"
                                        placeholder="0"
                                      />
                                      <span className="text-sm text-muted-foreground">%</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-1 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveCategory(index, Math.max(0, index - 1))}
                                      disabled={index === 0}
                                      title="Mover hacia arriba"
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        moveCategory(index, Math.min(tempConfig.categoryOrder!.length - 1, index + 1))
                                      }
                                      disabled={index === tempConfig.categoryOrder!.length - 1}
                                      title="Mover hacia abajo"
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => deleteCategory(key)}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>

                          <Card className="p-4 border-dashed">
                            <h4 className="text-md font-medium mb-3">Agregar Nueva Categoría</h4>
                            <div className="flex items-center space-x-2">
                              <Select value={newCategoryIcon} onValueChange={setNewCategoryIcon}>
                                <SelectTrigger className="w-16">
                                  <SelectValue>
                                    {React.createElement(iconMap[newCategoryIcon], { className: "h-4 w-4" })}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {availableIcons.map((iconItem) => (
                                    <SelectItem key={iconItem.name} value={iconItem.name}>
                                      <div className="flex items-center space-x-2">
                                        {React.createElement(iconItem.icon, { className: "h-4 w-4" })}
                                        <span>{iconItem.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                placeholder="Nombre de categoría"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="flex-1"
                              />
                              <Input
                                type="text"
                                placeholder="0"
                                value={newCategoryPercentage}
                                onChange={(e) => handleAmountChange(e.target.value, setNewCategoryPercentage)}
                                className="w-20"
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                              <Button onClick={addNewCategory} size="sm">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>

                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                              <strong>Distribución actual:</strong>{" "}
                              {Object.values(tempConfig.categories)
                                .reduce((sum, cat) => sum + cat.percentage, 0)
                                .toFixed(1)}
                              % de 100%
                              <br />
                              <strong>Tip:</strong> La suma debe ser exactamente 100% para guardar la configuración.
                            </p>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                  <Button onClick={saveConfig} className="w-full">
                    Guardar Configuración
                  </Button>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>

            {/* Mobile menu */}
            <div className="md:hidden">
              <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-64">
                  <div className="py-4">
                    <h2 className="text-lg font-semibold mb-4">Menú</h2>
                    <MobileMenu />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Resumen financiero simplificado */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sueldo Neto</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-green-600">${formatCurrency(netSalary)}</div>
              <p className="text-xs text-muted-foreground">Disponible mensualmente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Restante del Mes</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                ${formatCurrency(Math.abs(remainingBudget))}
              </div>
              <p className="text-xs text-muted-foreground">
                {remainingBudget >= 0 ? "Disponible este mes" : "Excedido este mes"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Botón para mostrar/ocultar categorías */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
          <h2 className="text-xl sm:text-2xl font-bold">Categorías</h2>
          <Button variant="outline" size="sm" onClick={() => setShowCategories(!showCategories)}>
            {showCategories ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Ocultar
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Mostrar
              </>
            )}
          </Button>
        </div>

        {/* Categorías de gastos (colapsables) */}
        {showCategories && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
            {getOrderedCategories().map(([key, category]) => {
              const data = calculateCategoryData(key)
              const IconComponent = iconMap[category.icon as keyof typeof iconMap] || DollarSign

              return (
                <Card key={key} className="relative">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate">{category.name}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      {key === "ahorro" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowInvestmentModal(true)}
                        >
                          <TrendingUp className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg sm:text-2xl font-bold">
                      $
                      {data.available >= 0
                        ? formatCurrency(data.available)
                        : `(${formatCurrency(Math.abs(data.available))})`}
                    </div>
                    <p className="text-xs text-muted-foreground">Disponible de ${formatCurrency(data.budget)}</p>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Gastado: ${formatCurrency(data.spent)}</span>
                        <span>{data.percentage.toFixed(1)}%</span>
                      </div>
                      <Progress
                        value={Math.min(data.percentage, 100)}
                        className={`h-2 ${data.percentage > 100 ? "bg-red-100" : ""}`}
                      />
                      {data.percentage > 100 && (
                        <p className="text-xs text-red-600 mt-1">
                          Excedido por ${formatCurrency(data.spent - data.budget)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Modal de inversiones */}
        <Dialog open={showInvestmentModal} onOpenChange={setShowInvestmentModal}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Recomendaciones de Inversión</DialogTitle>
              <DialogDescription>
                Basado en tu categoría de ahorro, aquí tienes algunas recomendaciones.
              </DialogDescription>
            </DialogHeader>
            <InvestmentRecommendations />
          </DialogContent>
        </Dialog>

        {/* Sección de gastos con filtros */}
        <div className="flex flex-col space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-bold">Gastos</h2>

            <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Gasto
                </Button>
              </DialogTrigger>
              <DialogContent className="mx-4 max-w-md">
                <DialogHeader>
                  <DialogTitle>Nuevo Gasto</DialogTitle>
                  <DialogDescription>Registra un nuevo gasto en una de tus categorías</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría *</Label>
                    <Select
                      value={newExpense.category}
                      onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {getOrderedCategories().map(([key, category]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center space-x-2">
                              {React.createElement(iconMap[category.icon] || DollarSign, { className: "h-4 w-4" })}
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto *</Label>
                    <Input
                      id="amount"
                      type="text"
                      value={newExpense.amount}
                      onChange={(e) =>
                        handleAmountChange(e.target.value, (value) => setNewExpense({ ...newExpense, amount: value }))
                      }
                      placeholder="Ej: 1.500 o 1.500,50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Input
                      id="description"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      placeholder="Descripción del gasto (opcional)"
                    />
                  </div>
                  <Button onClick={addExpense} className="w-full" disabled={addingExpense}>
                    {addingExpense ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      "Agregar Gasto"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {getOrderedCategories().map(([key, category]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center space-x-2">
                        {React.createElement(iconMap[category.icon] || DollarSign, { className: "h-4 w-4" })}
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="text"
                placeholder="dd/mm/yyyy"
                value={filterDate}
                onChange={(e) => setFilterDate(formatDateInput(e.target.value))}
                className="w-full sm:w-32"
                maxLength={10}
              />
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {expenses.length === 0 ? "No hay gastos registrados" : "No hay gastos que coincidan con los filtros"}
                </p>
                <p className="text-sm">
                  {expenses.length === 0
                    ? "Comienza agregando tu primer gasto usando el botón de arriba"
                    : "Prueba cambiando los filtros de categoría o fecha"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredExpenses
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((expense) => (
                    <div
                      key={expense.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          {React.createElement(
                            iconMap[config.categories[expense.category]?.icon as keyof typeof iconMap] || DollarSign,
                            { className: "h-4 w-4 sm:h-5 sm:w-5" },
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{expense.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {config.categories[expense.category]?.name} •{" "}
                            {new Date(expense.date).toLocaleDateString("es-AR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                        <span className="font-semibold text-sm sm:text-base">${formatCurrency(expense.amount)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingExpense(expense)
                            setShowEditDialog(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteExpense(expense.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="mx-4 max-w-md">
            <DialogHeader>
              <DialogTitle>Restablecer Datos</DialogTitle>
              <DialogDescription>
                Esto eliminará todos tus gastos registrados. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800">
                <strong>¡Atención!</strong> Se eliminarán todos los gastos pero se mantendrá tu configuración de sueldo
                y categorías.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowResetDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button variant="destructive" onClick={resetAllData} className="flex-1">
                Restablecer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="mx-4 max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Gasto</DialogTitle>
              <DialogDescription>Modifica los datos del gasto seleccionado</DialogDescription>
            </DialogHeader>
            {editingExpense && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Categoría</Label>
                  <Select
                    value={editingExpense.category}
                    onValueChange={(value) => setEditingExpense({ ...editingExpense, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {getOrderedCategories().map(([key, category]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center space-x-2">
                            {React.createElement(iconMap[category.icon] || DollarSign, { className: "h-4 w-4" })}
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Monto</Label>
                  <Input
                    id="edit-amount"
                    type="text"
                    value={formatForInput(editingExpense.amount)}
                    onChange={(e) => {
                      const formatted = formatInputValue(e.target.value)
                      setEditingExpense({ ...editingExpense, amount: parseFormattedValue(formatted) })
                    }}
                    placeholder="Ej: 1.500 o 1.500,50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descripción</Label>
                  <Input
                    id="edit-description"
                    value={editingExpense.description}
                    onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                    placeholder="Descripción del gasto"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={updateExpense} className="flex-1">
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
