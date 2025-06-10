"use client"

import { DialogTrigger } from "@/components/ui/dialog"
import React from "react"
import { useEffect, useState, useCallback, useMemo } from "react"
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
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
  Search,
} from "lucide-react"
import { SalaryCalculator } from "@/components/salary-calculator"
import { DraggableCategory } from "@/components/draggable-category"

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

  // Estados para filtros mejorados
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterDate, setFilterDate] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState<string>("")

  // Estado para mostrar/ocultar categorías
  const [showCategories, setShowCategories] = useState(true)

  // Estado para el menú móvil
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // Estados para modales
  const [showCalculatorModal, setShowCalculatorModal] = useState(false)
  

  // Ref para el unsubscribe de Firestore
  const [unsubscribeExpenses, setUnsubscribeExpenses] = useState<(() => void) | null>(null)

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const router = useRouter()

  // Optimización: Memoizar cálculos costosos
  const netSalary = useMemo(() => {
    if (!config) return 0
    return config?.salary - (config?.monotributo || 0)
  }, [config?.salary, config])

  // Función para verificar si una categoría es de ahorro
  const isAhorroCategory = useCallback(
    (categoryKey: string) => {
      return categoryKey === "ahorro" || config?.categories[categoryKey]?.icon === "PiggyBank"
    },
    [config],
  )

  // Calcular el monto total destinado al ahorro
  const totalSavings = useMemo(() => {
    if (!config) return 0
    
    return Object.entries(config.categories)
      .filter(([key]) => isAhorroCategory(key))
      .reduce((total, [_, category]) => {
        return total + (netSalary * category.percentage) / 100
      }, 0)
  }, [config, netSalary, isAhorroCategory])

  const remainingBudget = useMemo(() => {
    if (!config) return 0

    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const totalSpentThisMonth = expenses
      .filter((expense) => {
        const expenseDate = new Date(expense.date)
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
      })
      .reduce((total, expense) => total + expense.amount, 0)

    // Restar tanto los gastos como el ahorro del sueldo neto
    return netSalary - totalSpentThisMonth - totalSavings
  }, [netSalary, expenses, totalSavings])

  // Filtrar categorías que NO son de ahorro para gastos
  const getSpendableCategories = useCallback(() => {
    if (!config) return []
    return getOrderedCategories().filter(([key]) => !isAhorroCategory(key))
  }, [config, isAhorroCategory])

  // Optimización: Filtrado mejorado con useMemo
  const filteredAndSearchedExpenses = useMemo(() => {
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

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(
        (expense) =>
          expense.description.toLowerCase().includes(term) ||
          config?.categories[expense.category]?.name.toLowerCase().includes(term),
      )
    }

    // Ordenar por fecha (más recientes primero)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [expenses, filterCategory, filterDate, searchTerm, config])

  useEffect(() => {
    setFilteredExpenses(filteredAndSearchedExpenses)
  }, [filteredAndSearchedExpenses])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        await loadUserConfig(user.uid)
        const unsubscribe = loadExpenses(user.uid)
        setUnsubscribeExpenses(() => unsubscribe)
      } else {
        // Limpiar listener de gastos al cerrar sesión
        if (unsubscribeExpenses) {
          unsubscribeExpenses()
          setUnsubscribeExpenses(null)
        }
        router.push("/")
      }
      setLoading(false)
    })

    return () => {
      unsubscribe()
      // Limpiar listener al desmontar componente
      if (unsubscribeExpenses) {
        unsubscribeExpenses()
      }
    }
  }, [router])

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

  // Optimización: useCallback para funciones que se pasan como props
  const loadUserConfig = useCallback(async (userId: string) => {
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
  }, [])

  const loadExpenses = useCallback((userId: string) => {
    const q = query(collection(db, "expenses"), where("userId", "==", userId))
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const expensesData: Expense[] = []
        querySnapshot.forEach((doc) => {
          expensesData.push({ id: doc.id, ...doc.data() } as Expense)
        })
        setExpenses(expensesData)
      },
      (error) => {
        console.error("Error in expenses listener:", error)
        // Solo mostrar error si el usuario aún está autenticado
        if (auth.currentUser) {
          setError("Error al cargar los gastos")
        }
      },
    )

    return unsubscribe
  }, [])

  const saveConfig = useCallback(async () => {
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
  }, [user, tempConfig])

  const addExpense = useCallback(async () => {
    if (!user || !newExpense.category || !newExpense.amount) {
      setError("Por favor completa todos los campos obligatorios")
      return
    }

    // Verificar que no sea una categoría de ahorro
    if (isAhorroCategory(newExpense.category)) {
      setError("No puedes agregar gastos a la categoría de ahorro. El ahorro se calcula automáticamente.")
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
  }, [user, newExpense, isAhorroCategory])

  const deleteExpense = useCallback(async (expenseId: string) => {
    try {
      await deleteDoc(doc(db, "expenses", expenseId))
      setSuccess("Gasto eliminado exitosamente")
    } catch (error: any) {
      console.error("Error deleting expense:", error)
      setError("Error al eliminar el gasto")
    }
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      // Limpiar listener antes de cerrar sesión
      if (unsubscribeExpenses) {
        unsubscribeExpenses()
        setUnsubscribeExpenses(null)
      }

      // Limpiar estado local
      setExpenses([])
      setConfig(null)
      setUser(null)

      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error during logout:", error)
      setError("Error al cerrar sesión")
    }
  }, [unsubscribeExpenses, router])

  const calculateCategoryData = useCallback(
    (categoryKey: string) => {
      if (!config) return { available: 0, spent: 0, percentage: 0, budget: 0 }

      const categoryBudget = (netSalary * config.categories[categoryKey].percentage) / 100

      // Si es categoría de ahorro, simplemente devolver el monto fijo
      if (isAhorroCategory(categoryKey)) {
        return {
          available: categoryBudget, // El monto fijo a ahorrar
          spent: 0, // No hay concepto de "gasto" en ahorro
          percentage: 0, // No hay concepto de porcentaje usado
          budget: categoryBudget,
        }
      }

      // Para categorías normales, calcular gastos del mes actual
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
    },
    [config, netSalary, expenses, isAhorroCategory],
  )

  const resetAllData = useCallback(async () => {
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
  }, [user])

  const updateExpense = useCallback(async () => {
    if (!editingExpense || !editingExpense.category || !editingExpense.amount) {
      setError("Por favor completa todos los campos obligatorios")
      return
    }

    // Verificar que no sea una categoría de ahorro
    if (isAhorroCategory(editingExpense.category)) {
      setError("No puedes editar gastos en la categoría de ahorro.")
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
  }, [editingExpense, user, isAhorroCategory])

  const addNewCategory = useCallback(() => {
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
  }, [tempConfig, newCategoryName, newCategoryPercentage, newCategoryIcon])

  const deleteCategory = useCallback(
    (categoryKey: string) => {
      if (!tempConfig) return

      const { [categoryKey]: deleted, ...remainingCategories } = tempConfig.categories
      const newOrder = tempConfig.categoryOrder?.filter((key) => key !== categoryKey) || []

      setTempConfig({
        ...tempConfig,
        categories: remainingCategories,
        categoryOrder: newOrder,
      })
    },
    [tempConfig],
  )

  const updateCategoryName = useCallback(
    (categoryKey: string, newName: string) => {
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
    },
    [tempConfig],
  )

  const updateCategoryIcon = useCallback(
    (categoryKey: string, newIcon: string) => {
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
    },
    [tempConfig],
  )

  const moveCategory = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!tempConfig?.categoryOrder) return

      const newOrder = [...tempConfig.categoryOrder]
      const [movedItem] = newOrder.splice(fromIndex, 1)
      newOrder.splice(toIndex, 0, movedItem)

      setTempConfig({
        ...tempConfig,
        categoryOrder: newOrder,
      })
    },
    [tempConfig],
  )

  const getOrderedCategories = useCallback(() => {
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
  }, [config])

  const getOrderedTempCategories = useCallback(() => {
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
  }, [tempConfig])

  const handleAmountChange = useCallback((value: string, setter: (value: string) => void) => {
    const formatted = formatInputValue(value)
    setter(formatted)
  }, [])

  const handlePercentageChange = useCallback(
    (categoryKey: string, value: string) => {
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
    },
    [tempConfig],
  )

  const clearFilters = useCallback(() => {
    setFilterCategory("all")
    setFilterDate("")
    setSearchTerm("")
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault()
      if (draggedIndex === null || draggedIndex === dropIndex) return

      moveCategory(draggedIndex, dropIndex)
      setDraggedIndex(null)
    },
    [draggedIndex, moveCategory],
  )

  // Componente del menú móvil optimizado
  const MobileMenu = React.memo(() => (
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
      <div className="flex items-center justify-between py-2">
        <span className="text-sm font-medium">Tema</span>
        <ThemeToggle />
      </div>
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
  ))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Cargando tu dashboard...</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-destructive">Error al cargar la configuración</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mensajes de error y éxito optimizados */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-destructive/10 border border-destructive/20 rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-right">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive flex-1">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed top-4 right-4 z-50 bg-muted border rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-right">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm flex-1">{success}</p>
            <Button variant="ghost" size="sm" onClick={() => setSuccess(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Header optimizado */}
      <header className="bg-card/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg sm:text-xl font-semibold">Gestor de Sueldo</h1>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={() => setShowCalculatorModal(true)}>
                <Calculator className="h-4 w-4 mr-2" />
                Calculadora
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowResetDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Restablecer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempConfig(config)
                  setShowConfigDialog(true)
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurar
              </Button>
              <ThemeToggle />
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

      {/* Modal de calculadora */}
      <Dialog open={showCalculatorModal} onOpenChange={setShowCalculatorModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Calculadora de Aumento</DialogTitle>
            <DialogDescription>Calcula el porcentaje y monto de aumento entre dos sueldos.</DialogDescription>
          </DialogHeader>
          <SalaryCalculator />
        </DialogContent>
      </Dialog>

      {/* Modal de configuración optimizado */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuración</DialogTitle>
            <DialogDescription>Ajusta tu sueldo y gestiona tus categorías</DialogDescription>
          </DialogHeader>
          {tempConfig && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Categorías</h3>
                  <div
                    className={`text-sm px-3 py-2 rounded-lg border ${
                      Math.abs(
                        Object.values(tempConfig.categories).reduce((sum, cat) => sum + cat.percentage, 0) - 100,
                      ) < 0.01
                        ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300"
                        : "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300"
                    }`}
                  >
                    Distribución:{" "}
                    {Object.values(tempConfig.categories)
                      .reduce((sum, cat) => sum + cat.percentage, 0)
                      .toFixed(1)}
                    % / 100%
                  </div>
                </div>

                <div className="space-y-3">
                  {getOrderedTempCategories().map(([key, category], index) => (
                    <DraggableCategory
                      key={key}
                      categoryKey={key}
                      category={category}
                      index={index}
                      availableIcons={availableIcons}
                      iconMap={iconMap}
                      onUpdateName={updateCategoryName}
                      onUpdateIcon={updateCategoryIcon}
                      onUpdatePercentage={handlePercentageChange}
                      onDelete={deleteCategory}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    />
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

                <Button onClick={saveConfig} className="w-full" size="lg">
                  Guardar Configuración
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Resumen financiero mejorado */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="col-span-1 sm:col-span-2 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sueldo Neto</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">${formatCurrency(netSalary)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Bruto: ${formatCurrency(config.salary)} - Monotributo: ${formatCurrency(config.monotributo)}
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-1 sm:col-span-2 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Restante del Mes</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                ${formatCurrency(Math.abs(remainingBudget))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {remainingBudget >= 0 ? "Disponible este mes" : "Excedido este mes"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Categorías optimizadas */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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

          {showCategories && (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {getOrderedCategories().map(([key, category]) => {
                const data = calculateCategoryData(key)
                const IconComponent = iconMap[category.icon as keyof typeof iconMap] || DollarSign
                const isAhorro = isAhorroCategory(key)

                return (
                  <Card key={key} className="relative hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium truncate">{category.name}</CardTitle>
                      <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </CardHeader>
                    <CardContent>
                      {isAhorro ? (
                        <>
                          <div className="text-lg sm:text-2xl font-bold">${formatCurrency(data.available)}</div>
                          <p className="text-xs text-muted-foreground">
                            {category.percentage}% de tu sueldo neto
                          </p>
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-800"
                              onClick={() => window.open("https://comparatasas.ar/", "_blank", "noopener,noreferrer")}
                            >
                              <TrendingUp className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                              <span className="text-blue-600 dark:text-blue-400">Ver Inversiones</span>
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
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
                              className={`h-2 ${data.percentage > 100 ? "bg-destructive/20" : ""}`}
                            />
                            {data.percentage > 100 && (
                              <p className="text-xs text-destructive mt-1">
                                Excedido por ${formatCurrency(data.spent - data.budget)}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Sección de gastos mejorada */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-bold">Gastos</h2>

            <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" size="lg">
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
                        {getSpendableCategories().map(([key, category]) => (
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
                  <Button onClick={addExpense} className="w-full" disabled={addingExpense} size="lg">
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

          {/* Filtros mejorados */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filtros</span>
                </div>
                {(filterCategory !== "all" || filterDate || searchTerm) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar gastos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
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
                  maxLength={10}
                />
              </div>

              {filteredExpenses.length !== expenses.length && (
                <p className="text-sm text-muted-foreground">
                  Mostrando {filteredExpenses.length} de {expenses.length} gastos
                </p>
              )}
            </div>
          </Card>

          {/* Lista de gastos optimizada */}
          <Card>
            <CardContent className="p-0">
              {filteredExpenses.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">
                    {expenses.length === 0
                      ? "No hay gastos registrados"
                      : "No hay gastos que coincidan con los filtros"}
                  </p>
                  <p className="text-sm">
                    {expenses.length === 0
                      ? "Comienza agregando tu primer gasto usando el botón de arriba"
                      : "Prueba cambiando los filtros o términos de búsqueda"}
                  </p>
                  {(filterCategory !== "all" || filterDate || searchTerm) && (
                    <Button variant="outline" onClick={clearFilters} className="mt-4">
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                          {React.createElement(
                            iconMap[config.categories[expense.category]?.icon as keyof typeof iconMap] || DollarSign,
                            { className: "h-5 w-5" },
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
                      <div className="flex items-center space-x-2 flex-shrink-0">
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
        </div>

        {/* Dialogs */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="mx-4 max-w-md">
            <DialogHeader>
              <DialogTitle>Restablecer Datos</DialogTitle>
              <DialogDescription>
                Esto eliminará todos tus gastos registrados. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-destructive">
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
                      {getSpendableCategories().map(([key, category]) => (
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
                  <Label htmlFor="edit-amount\">M
