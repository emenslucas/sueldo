"use client";

import { DraggableCategory } from "@/components/draggable-category";
import { LogoNavbar } from "@/components/logo-navbar";
import { SalaryCalculator } from "@/components/salary-calculator";
import { SavingsGoalsManager } from "@/components/savings-goals/savings-goals-manager";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { auth, db } from "@/lib/firebase";
import {
  formatCurrency,
  formatDateInput,
  formatForInput,
  formatInputValue,
  isValidDate,
  parseDate,
  parseFormattedValue,
} from "@/lib/formatters";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
} from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeftCircle,
  ArrowRightCircle,
  Calculator,
  Car,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Edit,
  Filter,
  Gift,
  Home,
  Loader2,
  LogOut,
  Menu,
  PiggyBank,
  Plane,
  Plus,
  Repeat,
  Search,
  Settings,
  ShoppingBag,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";

interface Category {
  name: string;
  percentage: number;
  icon: string;
}

interface Transaction {
  id: string;
  type: "income" | "expense" | "savings";
  category?: string;
  goalId?: string; // Para transacciones de ahorro
  savingsType?: "deposit" | "withdrawal"; // Para transacciones de ahorro
  amount: number;
  description: string;
  date: string;
  isRecurring?: boolean;
  recurringDay?: number;
}

// Interfaz para la configuración guardada (con números)
// Added resetDay and lastResetDate to UserConfig interface
interface UserConfig {
  salary: number;
  monotributo: number;
  categories: {
    [key: string]: Category;
  };
  categoryOrder?: string[];
  resetDay?: number; // Day of month to reset transactions
  lastResetDate?: string; // ISO string of last reset date
  autoResetEnabled?: boolean; // Whether automatic reset is enabled
}

// CORRECCIÓN: Interfaz para el estado del formulario de configuración (con strings)
// Added resetDay and lastResetDate to TempUserConfig interface
interface TempUserConfig extends Omit<UserConfig, "salary" | "monotributo"> {
  salary: string;
  monotributo: string;
  resetDay?: number;
  lastResetDate?: string;
  autoResetEnabled?: boolean;
}

const defaultCategories = {
  ahorro: { name: "Ahorro", percentage: 40, icon: "PiggyBank" },
  servicios: { name: "Servicios", percentage: 35, icon: "Home" },
  gastos_personales: {
    name: "Gastos Personales",
    percentage: 25,
    icon: "User",
  },
};

const defaultCategoryOrder = ["ahorro", "servicios", "gastos_personales"];

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
];

const iconMap = availableIcons.reduce((acc, item) => {
  acc[item.name] = item.icon as React.ComponentType<{ className?: string }>;
  return acc;
}, {} as Record<string, React.ComponentType<{ className?: string }>>);

export default function Dashboard() {
  const [user, setUser] = useState<import("firebase/auth").User | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [tempConfig, setTempConfig] = useState<TempUserConfig | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("DollarSign");
  const [newCategoryPercentage, setNewCategoryPercentage] = useState("");

  // Estados para manejo de errores y loading
  const [addingTransaction, setAddingTransaction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Estados para filtros mejorados
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Estado para mostrar/ocultar categorías
  const [showCategories, setShowCategories] = useState(true);

  // Estado para el menú móvil
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Estados para modales
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showObjectivesModal, setShowObjectivesModal] = useState(false);

  // Ref para el unsubscribe de Firestore
  const [unsubscribeTransactions, setUnsubscribeTransactions] = useState<
    (() => void) | null
  >(null);
  const [unsubscribeSavingsGoals, setUnsubscribeSavingsGoals] = useState<
    (() => void) | null
  >(null);

  const router = useRouter();

  // Estados para transacciones
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [newTransaction, setNewTransaction] = useState<{
    id?: string;
    type: "income" | "expense" | "savings";
    category?: string;
    goalId?: string;
    savingsType?: "deposit" | "withdrawal";
    amount: string;
    description: string;
    date: string;
    isRecurring?: boolean;
    recurringDay?: number;
  }>({
    type: "expense",
    category: "",
    goalId: "",
    savingsType: "deposit",
    amount: "",
    description: "",
    date: new Date().toISOString(),
    isRecurring: false,
    recurringDay: 1,
  });
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);

  // Optimización: Memoizar cálculos costosos
  const netSalary = useMemo(() => {
    if (!config) return 0;
    return config.salary - (config.monotributo || 0);
  }, [config]);

  // Función para verificar si una categoría es de ahorro
  const isAhorroCategory = useCallback(
    (categoryKey: string) => {
      return (
        categoryKey === "ahorro" ||
        config?.categories[categoryKey]?.icon === "PiggyBank"
      );
    },
    [config]
  );

  // Calcular el monto total destinado al ahorro
  const totalSavings = useMemo(() => {
    if (!config) return 0;

    return Object.entries(config.categories)
      .filter(([key]) => isAhorroCategory(key))
      .reduce((total, [_, category]) => {
        return total + (netSalary * category.percentage) / 100;
      }, 0);
  }, [config, netSalary, isAhorroCategory]);

  // Calcular ingresos y gastos totales del mes actual
  const currentMonthTransactions = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return (
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      );
    });
  }, [transactions]);

  const totalIncome = useMemo(() => {
    return currentMonthTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + transaction.amount, 0);
  }, [currentMonthTransactions]);

  const totalExpenses = useMemo(() => {
    return currentMonthTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((total, transaction) => total + transaction.amount, 0);
  }, [currentMonthTransactions]);

  const remainingBudget = useMemo(() => {
    if (!config) return 0;

    // Calcular movimientos de ahorro del mes actual
    const savingsMovements = currentMonthTransactions
      .filter((transaction) => transaction.type === "savings")
      .reduce((total, transaction) => {
        // Los depósitos restan del disponible, los retiros suman
        return transaction.savingsType === "deposit"
          ? total + transaction.amount // Suma porque es dinero que sale
          : total - transaction.amount; // Resta porque es dinero que vuelve
      }, 0);

    // Sueldo neto + ingresos extra - gastos - ahorro automático - movimientos de ahorro
    return (
      netSalary + totalIncome - totalExpenses - totalSavings - savingsMovements
    );
  }, [
    netSalary,
    totalIncome,
    totalExpenses,
    totalSavings,
    currentMonthTransactions,
  ]);

  // Filtrar categorías que NO son de ahorro para gastos
  const getSpendableCategories = useCallback(() => {
    if (!config) return [];
    return getOrderedCategories().filter(([key]) => !isAhorroCategory(key));
  }, [config, isAhorroCategory]);

  // Load savings goals
  const loadSavingsGoals = useCallback((userId: string) => {
    const q = query(
      collection(db, "savingsGoals"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const goalsData: any[] = [];
      querySnapshot.forEach((doc) => {
        goalsData.push({ id: doc.id, ...doc.data() });
      });
      setSavingsGoals(goalsData);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        try {
          await loadUserConfig(user.uid);
        } catch (e) {
          // Si el usuario pierde permisos, no mostrar error
          setConfig(null);
        }
        const unsubscribeTx = loadTransactions(user.uid);
        setUnsubscribeTransactions(() => unsubscribeTx);
        const unsubscribeSG = loadSavingsGoals(user.uid);
        setUnsubscribeSavingsGoals(() => unsubscribeSG);

        // New logic: check and perform scheduled reset if needed
        if (config && config.resetDay && config.autoResetEnabled) {
          const today = new Date();
          const resetDay = config.resetDay;
          const lastResetDate = config.lastResetDate
            ? new Date(config.lastResetDate)
            : null;

          // Check if today is past resetDay and lastResetDate is before current month
          if (
            today.getDate() >= resetDay &&
            (!lastResetDate ||
              lastResetDate.getMonth() !== today.getMonth() ||
              lastResetDate.getFullYear() !== today.getFullYear())
          ) {
            // Delete transactions from previous month
            const previousMonth = new Date(
              today.getFullYear(),
              today.getMonth() - 1,
              1
            );
            const startOfPrevMonth = new Date(
              previousMonth.getFullYear(),
              previousMonth.getMonth(),
              1
            );
            const endOfPrevMonth = new Date(
              previousMonth.getFullYear(),
              previousMonth.getMonth() + 1,
              0,
              23,
              59,
              59
            );

            try {
              const q = query(
                collection(db, "transactions"),
                where("userId", "==", user.uid),
                where("date", ">=", startOfPrevMonth.toISOString()),
                where("date", "<=", endOfPrevMonth.toISOString())
              );
              const querySnapshot = await getDocs(q);

              const deletePromises = querySnapshot.docs.map((doc) =>
                deleteDoc(doc.ref)
              );
              await Promise.all(deletePromises);

              // Update lastResetDate in user config
              const userDocRef = doc(db, "users", user.uid);
              await setDoc(
                userDocRef,
                { lastResetDate: today.toISOString() },
                { merge: true }
              );

              setSuccess(
                "Transacciones del mes pasado restablecidas automáticamente"
              );
            } catch (error) {
              console.error("Error during scheduled reset:", error);
              setError(
                "Error al restablecer las transacciones automáticamente"
              );
            }
          }
        }
      } else {
        if (unsubscribeTransactions) {
          unsubscribeTransactions();
          setUnsubscribeTransactions(null);
        }
        if (unsubscribeSavingsGoals) {
          unsubscribeSavingsGoals();
          setUnsubscribeSavingsGoals(null);
        }
        setConfig(null); // Limpiar config para evitar flashes de error
        setError(null); // Limpiar error
        router.push("/");
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      // Limpiar listener al desmontar componente
      if (unsubscribeTransactions) {
        unsubscribeTransactions();
      }
      if (unsubscribeSavingsGoals) {
        unsubscribeSavingsGoals();
      }
    };
  }, [router, loadSavingsGoals, config]);

  // Limpiar mensajes después de 5 segundos
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Optimización: useCallback para funciones que se pasan como props
  const loadUserConfig = useCallback(async (userId: string) => {
    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data() as UserConfig;
        // Asegurar que existe categoryOrder
        if (!userData.categoryOrder) {
          userData.categoryOrder = Object.keys(userData.categories);
        }
        setConfig(userData);
      } else {
        const defaultConfig: UserConfig = {
          salary: 0,
          monotributo: 0,
          categories: defaultCategories,
          categoryOrder: defaultCategoryOrder,
        };
        setConfig(defaultConfig);
        await setDoc(docRef, defaultConfig);
      }
    } catch (error) {
      console.error("Error loading config:", error);
      setTimeout(() => {
        if (auth.currentUser) setError("Error al cargar la configuración");
      }, 700);
    }
  }, []);

  // CORRECCIÓN: La función ahora convierte los strings a números ANTES de guardar
  const saveConfig = useCallback(async () => {
    if (!user || !tempConfig) return;

    const totalPercentage = Object.values(tempConfig.categories).reduce(
      (sum, category) => sum + category.percentage,
      0
    );

    if (Math.abs(totalPercentage - 100) > 0.01) {
      setError(
        `La suma de porcentajes debe ser 100%. Actualmente es ${totalPercentage.toFixed(
          1
        )}%`
      );
      return;
    }

    // Convertir los strings del formulario a números para guardar
    const configToSave: UserConfig = {
      ...tempConfig,
      salary: parseFormattedValue(tempConfig.salary),
      monotributo: parseFormattedValue(tempConfig.monotributo),
      resetDay: tempConfig.resetDay,
      lastResetDate: tempConfig.lastResetDate,
    };

    try {
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, configToSave);
      setConfig(configToSave); // Actualizar el estado principal con los números
      setShowConfigDialog(false);
      setSuccess("Configuración guardada exitosamente");
    } catch (error) {
      console.error("Error saving config:", error);
      setError("Error al guardar la configuración");
    }
  }, [user, tempConfig]);

  const handleLogout = useCallback(async () => {
    try {
      // Limpiar listener antes de cerrar sesión
      if (unsubscribeTransactions) {
        unsubscribeTransactions();
        setUnsubscribeTransactions(null);
      }
      if (unsubscribeSavingsGoals) {
        unsubscribeSavingsGoals();
        setUnsubscribeSavingsGoals(null);
      }

      // Limpiar estado local
      setTransactions([]);
      setConfig(null);
      setUser(null);

      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error during logout:", error);
      setError("Error al cerrar sesión");
    }
  }, [unsubscribeTransactions, unsubscribeSavingsGoals, router]);

  const resetAllData = useCallback(async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(q);

      const deletePromises = querySnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      setShowResetDialog(false);
      setSuccess("Todos los datos han sido restablecidos");
    } catch (error) {
      console.error("Error resetting data:", error);
      setError("Error al restablecer los datos");
    }
  }, [user]);

  const addNewCategory = useCallback(() => {
    if (!tempConfig || !newCategoryName.trim()) {
      setError("Por favor ingresa un nombre para la categoría");
      return;
    }

    const categoryKey = newCategoryName.toLowerCase().replace(/\s+/g, "_");

    if (tempConfig.categories[categoryKey]) {
      setError("Ya existe una categoría con ese nombre");
      return;
    }

    const percentage = parseFormattedValue(newCategoryPercentage);
    const newCategory: Category = {
      name: newCategoryName.trim(),
      percentage: percentage,
      icon: newCategoryIcon,
    };

    setTempConfig({
      ...tempConfig,
      categories: {
        ...tempConfig.categories,
        [categoryKey]: newCategory,
      },
      categoryOrder: [...(tempConfig.categoryOrder || []), categoryKey],
    });

    setNewCategoryName("");
    setNewCategoryPercentage("");
    setNewCategoryIcon("DollarSign");
    setSuccess("Categoría agregada (recuerda guardar la configuración)");
  }, [tempConfig, newCategoryName, newCategoryPercentage, newCategoryIcon]);

  const deleteCategory = useCallback(
    (categoryKey: string) => {
      if (!tempConfig) return;

      const { [categoryKey]: deleted, ...remainingCategories } =
        tempConfig.categories;
      const newOrder =
        tempConfig.categoryOrder?.filter((key) => key !== categoryKey) || [];

      setTempConfig({
        ...tempConfig,
        categories: remainingCategories,
        categoryOrder: newOrder,
      });
    },
    [tempConfig]
  );

  const updateCategoryName = useCallback(
    (categoryKey: string, newName: string) => {
      if (!tempConfig) return;

      setTempConfig({
        ...tempConfig,
        categories: {
          ...tempConfig.categories,
          [categoryKey]: {
            ...tempConfig.categories[categoryKey],
            name: newName,
          },
        },
      });
    },
    [tempConfig]
  );

  const updateCategoryIcon = useCallback(
    (categoryKey: string, newIcon: string) => {
      if (!tempConfig) return;

      setTempConfig({
        ...tempConfig,
        categories: {
          ...tempConfig.categories,
          [categoryKey]: {
            ...tempConfig.categories[categoryKey],
            icon: newIcon,
          },
        },
      });
    },
    [tempConfig]
  );

  const moveCategory = useCallback(
    (fromIndex: number, direction: "up" | "down") => {
      if (!tempConfig?.categoryOrder) return;

      const newOrder = [...tempConfig.categoryOrder];
      const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;

      if (toIndex < 0 || toIndex >= newOrder.length) return;

      const [movedItem] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, movedItem);

      setTempConfig({
        ...tempConfig,
        categoryOrder: newOrder,
      });
    },
    [tempConfig]
  );

  const moveCategoryUp = useCallback(
    (index: number) => {
      moveCategory(index, "up");
    },
    [moveCategory]
  );

  const moveCategoryDown = useCallback(
    (index: number) => {
      moveCategory(index, "down");
    },
    [moveCategory]
  );

  const getOrderedCategories = useCallback(() => {
    if (!config?.categoryOrder) return Object.entries(config?.categories || {});

    const orderedEntries: [string, Category][] = [];

    // Agregar categorías en el orden especificado
    config.categoryOrder.forEach((key) => {
      if (config.categories[key]) {
        orderedEntries.push([key, config.categories[key]]);
      }
    });

    // Agregar categorías que no están en el orden (por si acaso)
    Object.entries(config.categories).forEach(([key, category]) => {
      if (!config.categoryOrder?.includes(key)) {
        orderedEntries.push([key, category]);
      }
    });

    return orderedEntries;
  }, [config]);

  const getOrderedTempCategories = useCallback(() => {
    if (!tempConfig?.categoryOrder)
      return Object.entries(tempConfig?.categories || {});

    const orderedEntries: [string, Category][] = [];

    // Agregar categorías en el orden especificado
    tempConfig.categoryOrder.forEach((key) => {
      if (tempConfig.categories[key]) {
        orderedEntries.push([key, tempConfig.categories[key]]);
      }
    });

    // Agregar categorías que no están en el orden (por si acaso)
    Object.entries(tempConfig.categories).forEach(([key, category]) => {
      if (!tempConfig.categoryOrder?.includes(key)) {
        orderedEntries.push([key, category]);
      }
    });

    return orderedEntries;
  }, [tempConfig]);

  const handleAmountChange = useCallback(
    (value: string, setter: (value: string) => void) => {
      const formatted = formatInputValue(value);
      setter(formatted);
    },
    []
  );

  const handlePercentageChange = useCallback(
    (categoryKey: string, value: string) => {
      if (!tempConfig) return;

      const formatted = formatInputValue(value);
      const numericValue = parseFormattedValue(formatted);

      setTempConfig({
        ...tempConfig,
        categories: {
          ...tempConfig.categories,
          [categoryKey]: {
            ...tempConfig.categories[categoryKey],
            percentage: numericValue,
          },
        },
      });
    },
    [tempConfig]
  );

  const clearFilters = useCallback(() => {
    setFilterCategory("all");
    setFilterDate("");
    setSearchTerm("");
  }, []);

  // Componente del menú móvil optimizado
  const MobileMenu = React.memo(() => (
    <div className="flex flex-col space-y-2 p-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setShowCalculatorModal(true);
          setShowMobileMenu(false);
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
          setShowObjectivesModal(true);
          setShowMobileMenu(false);
        }}
        className="justify-start"
      >
        <PiggyBank className="h-4 w-4 mr-2" />
        Objetivos
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setShowResetDialog(true);
          setShowMobileMenu(false);
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
          // CORRECCIÓN: Al abrir el diálogo, convertir los números a strings para el formulario
          if (config) {
            setTempConfig({
              ...config,
              salary: formatForInput(config.salary),
              monotributo: formatForInput(config.monotributo),
            });
          }
          setShowConfigDialog(true);
          setShowMobileMenu(false);
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
          handleLogout();
          setShowMobileMenu(false);
        }}
        className="justify-start"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Salir
      </Button>
    </div>
  ));

  // Cargar transacciones desde Firestore
  const loadTransactions = useCallback((userId: string) => {
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", userId)
    );
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const transactionsData: Transaction[] = [];
        querySnapshot.forEach((doc) => {
          transactionsData.push({ id: doc.id, ...doc.data() } as Transaction);
        });
        setTransactions(transactionsData);
      },
      (error) => {
        console.error("Error in transactions listener:", error);
        // Solo mostrar error si el usuario aún está autenticado
        if (auth.currentUser) {
          setError(
            "Error al cargar las transacciones. Verifica los permisos de Firestore."
          );
        }
      }
    );

    return unsubscribe;
  }, []);

  const addTransaction = useCallback(async () => {
    if (!user) {
      setError("Usuario no autenticado");
      return;
    }
    if (!newTransaction.amount) {
      setError("Por favor completa todos los campos obligatorios");
      return;
    }

    if (newTransaction.type === "expense" && !newTransaction.category) {
      setError("Por favor selecciona una categoría para el gasto");
      return;
    }

    if (newTransaction.type === "savings" && !newTransaction.goalId) {
      setError("Por favor selecciona un objetivo de ahorro");
      return;
    }

    // Verificar que no sea una categoría de ahorro para gastos
    if (
      newTransaction.type === "expense" &&
      isAhorroCategory(newTransaction.category!)
    ) {
      setError(
        "No puedes agregar gastos a la categoría de ahorro. El ahorro se calcula automáticamente."
      );
      return;
    }

    const amount = parseFormattedValue(newTransaction.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("El monto debe ser un número mayor a 0");
      return;
    }

    // Validar retiros de ahorro
    if (
      newTransaction.type === "savings" &&
      newTransaction.savingsType === "withdrawal"
    ) {
      const selectedGoal = savingsGoals.find(
        (g) => g.id === newTransaction.goalId
      );
      if (selectedGoal && amount > selectedGoal.currentAmount) {
        setError(
          "No puedes retirar más de lo que tienes ahorrado en este objetivo"
        );
        return;
      }
    }

    // Validar día de recurrencia
    if (newTransaction.isRecurring) {
      const day = newTransaction.recurringDay || 1;
      if (day < 1 || day > 28) {
        setError("El día de recurrencia debe estar entre 1 y 28");
        return;
      }
    }

    setAddingTransaction(true);
    setError(null);

    try {
      if (newTransaction.type === "savings") {
        // Usar transacción de Firestore para mantener consistencia
        await runTransaction(db, async (transaction) => {
          // Crear la transacción
          const transactionRef = doc(collection(db, "transactions"));
          const transactionData: any = {
            userId: user.uid,
            type: newTransaction.type,
            goalId: newTransaction.goalId,
            savingsType: newTransaction.savingsType,
            amount: amount,
            description:
              newTransaction.description ||
              (newTransaction.savingsType === "deposit"
                ? "Depósito a objetivo"
                : "Retiro de objetivo"),
            date: new Date().toISOString(),
            isRecurring: newTransaction.isRecurring || false,
          };

          if (newTransaction.isRecurring) {
            transactionData.recurringDay = newTransaction.recurringDay || 1;
          }

          transaction.set(transactionRef, transactionData);

          // Actualizar el objetivo de ahorro
          const goalRef = doc(db, "savingsGoals", newTransaction.goalId!);
          const selectedGoal = savingsGoals.find(
            (g) => g.id === newTransaction.goalId
          );
          if (selectedGoal) {
            const newAmount =
              newTransaction.savingsType === "deposit"
                ? selectedGoal.currentAmount + amount
                : selectedGoal.currentAmount - amount;

            const updateData: any = {
              currentAmount: Math.max(0, newAmount),
              updatedAt: new Date().toISOString(),
            };

            // Marcar como completado si se alcanzó el objetivo
            if (
              newAmount >= selectedGoal.targetAmount &&
              !selectedGoal.isCompleted
            ) {
              updateData.isCompleted = true;
            } else if (
              newAmount < selectedGoal.targetAmount &&
              selectedGoal.isCompleted
            ) {
              updateData.isCompleted = false;
            }

            transaction.update(goalRef, updateData);
          }
        });
      } else {
        // Transacción normal (ingreso o gasto)
        const transactionData: any = {
          userId: user.uid,
          type: newTransaction.type,
          category: newTransaction.category || null,
          amount: amount,
          description:
            newTransaction.description ||
            (newTransaction.type === "income" ? "Ingreso" : "Gasto"),
          date: new Date().toISOString(),
          isRecurring: newTransaction.isRecurring || false,
        };

        if (newTransaction.isRecurring) {
          transactionData.recurringDay = newTransaction.recurringDay || 1;
        }

        await addDoc(collection(db, "transactions"), transactionData);
      }

      setNewTransaction({
        type: "expense",
        category: "",
        goalId: "",
        savingsType: "deposit",
        amount: "",
        description: "",
        date: new Date().toISOString(),
        isRecurring: false,
        recurringDay: 1,
      });
      setShowTransactionDialog(false);
      setSuccess("Transacción agregada exitosamente");
    } catch (error: any) {
      console.error("Error adding transaction:", error);
      if (error.code === "permission-denied") {
        setError(
          "Error de permisos. Verifica que las reglas de Firestore estén configuradas correctamente."
        );
      } else {
        setError(`Error al agregar la transacción: ${error.message}`);
      }
    } finally {
      setAddingTransaction(false);
    }
  }, [user, newTransaction, isAhorroCategory, savingsGoals]);

  const deleteTransaction = useCallback(async (transactionId: string) => {
    try {
      await deleteDoc(doc(db, "transactions", transactionId));
      setSuccess("Transacción eliminada exitosamente");
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      setError("Error al eliminar la transacción");
    }
  }, []);

  const updateTransaction = useCallback(async () => {
    if (!user) {
      setError("Usuario no autenticado");
      return;
    }
    if (!editingTransaction || !editingTransaction.amount) {
      setError("Por favor completa todos los campos obligatorios");
      return;
    }

    if (editingTransaction.type === "expense" && !editingTransaction.category) {
      setError("Por favor selecciona una categoría para el gasto");
      return;
    }

    // Verificar que no sea una categoría de ahorro para gastos
    if (
      editingTransaction.type === "expense" &&
      isAhorroCategory(editingTransaction.category!)
    ) {
      setError("No puedes editar gastos en la categoría de ahorro.");
      return;
    }

    // Validar día de recurrencia
    if (editingTransaction.isRecurring) {
      const day = editingTransaction.recurringDay || 1;
      if (day < 1 || day > 28) {
        setError("El día de recurrencia debe estar entre 1 y 28");
        return;
      }
    }

    try {
      const transactionRef = doc(db, "transactions", editingTransaction.id);
      const updateData: any = {
        userId: user.uid,
        type: editingTransaction.type,
        amount: editingTransaction.amount,
        description: editingTransaction.description,
        date: editingTransaction.date,
        isRecurring: editingTransaction.isRecurring,
      };

      if (editingTransaction.type === "expense") {
        updateData.category = editingTransaction.category;
      }

      if (editingTransaction.isRecurring) {
        updateData.recurringDay = editingTransaction.recurringDay || 1;
      }

      await setDoc(transactionRef, updateData);

      setEditingTransaction(null);
      setShowEditDialog(false);
      setSuccess("Transacción actualizada exitosamente");
    } catch (error) {
      console.error("Error updating transaction:", error);
      setError("Error al actualizar la transacción");
    }
  }, [editingTransaction, user, isAhorroCategory]);

  const calculateCategoryData = useCallback(
    (categoryKey: string) => {
      if (!config) return { available: 0, spent: 0, percentage: 0, budget: 0 };

      const categoryBudget =
        (netSalary * config.categories[categoryKey].percentage) / 100;

      // Si es categoría de ahorro, simplemente devolver el monto fijo
      if (isAhorroCategory(categoryKey)) {
        return {
          available: categoryBudget, // El monto fijo a ahorrar
          spent: 0, // No hay concepto de "gasto" en ahorro
          percentage: 0, // No hay concepto de porcentaje usado
          budget: categoryBudget,
        };
      }

      // Para categorías normales, calcular gastos del mes actual
      const spent = currentMonthTransactions
        .filter(
          (transaction) =>
            transaction.type === "expense" &&
            transaction.category === categoryKey
        )
        .reduce((total, transaction) => total + transaction.amount, 0);

      return {
        available: categoryBudget - spent,
        spent,
        percentage: categoryBudget > 0 ? (spent / categoryBudget) * 100 : 0,
        budget: categoryBudget,
      };
    },
    [config, netSalary, currentMonthTransactions, isAhorroCategory]
  );

  // Actualizar el estado de filteredTransactions cuando cambian las transacciones o los filtros
  useEffect(() => {
    let filtered = [...transactions];

    // Filtrar por categoría
    if (filterCategory !== "all") {
      filtered = filtered.filter(
        (transaction) => transaction.category === filterCategory
      );
    }

    // Filtrar por fecha específica
    if (filterDate && isValidDate(filterDate)) {
      const targetDate = parseDate(filterDate);
      if (targetDate) {
        filtered = filtered.filter((transaction) => {
          const transactionDate = new Date(transaction.date);
          return (
            transactionDate.getDate() === targetDate.getDate() &&
            transactionDate.getMonth() === targetDate.getMonth() &&
            transactionDate.getFullYear() === targetDate.getFullYear()
          );
        });
      }
    }

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (transaction) =>
          transaction.description.toLowerCase().includes(term) ||
          (transaction.category &&
            config?.categories[transaction.category]?.name
              .toLowerCase()
              .includes(term))
      );
    }

    // Ordenar por fecha (más recientes primero)
    filtered.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    setFilteredTransactions(filtered);
  }, [transactions, filterCategory, filterDate, searchTerm, config]);

  // Loader global para proteger la página mientras se verifica el usuario
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Mostrar error solo si hay usuario autenticado
  if (!config) {
    if (!user) return null;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-destructive">Error al cargar la configuración</p>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  // Opcional: ocultar errores de permisos si no hay usuario
  if (!user && !loading) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="min-h-screen bg-background"
    >
      {/* Mensajes de error y éxito optimizados */}
      {user && !loading && error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="fixed top-4 right-4 z-[100] bg-muted border rounded-lg p-4 shadow-lg max-w-md animate-in slide-in-from-right">
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
              <LogoNavbar />
              <h1 className="text-lg sm:text-xl font-semibold">
                Gestor de Sueldo
              </h1>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCalculatorModal(true)}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculadora
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowObjectivesModal(true)}
              >
                <Target className="h-4 w-4 mr-2" />
                Objetivos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Restablecer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // CORRECCIÓN: Al abrir el diálogo, convertir los números a strings para el formulario
                  if (config) {
                    setTempConfig({
                      ...config,
                      salary: formatForInput(config.salary),
                      monotributo: formatForInput(config.monotributo),
                    });
                  }
                  setShowConfigDialog(true);
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
            <DialogDescription>
              Calcula el porcentaje y monto de aumento entre dos sueldos.
            </DialogDescription>
          </DialogHeader>
          <SalaryCalculator />
        </DialogContent>
      </Dialog>

      {/* Modal de objetivos */}
      <Dialog open={showObjectivesModal} onOpenChange={setShowObjectivesModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Objetivos de Ahorro</DialogTitle>
            <DialogDescription className="sr-only">
              Gestiona y visualiza tus metas de ahorro.
            </DialogDescription>
          </DialogHeader>
          {user && <SavingsGoalsManager user={user} />}
        </DialogContent>
      </Dialog>
      {/* Removed redundant "Crear Objetivo" button from savings goals dialog */}

      {/* Modal de configuración optimizado */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuración</DialogTitle>
            <DialogDescription>
              Ajusta tu sueldo y gestiona tus categorías
            </DialogDescription>
          </DialogHeader>
          {tempConfig && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary">Sueldo Bruto</Label>
                  <Input
                    id="salary"
                    type="text"
                    value={tempConfig.salary}
                    onChange={(e) => {
                      // CORRECCIÓN: Actualizar el estado de string directamente
                      handleAmountChange(e.target.value, (value) =>
                        setTempConfig({ ...tempConfig, salary: value })
                      );
                    }}
                    placeholder="Ingresa tu sueldo bruto"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monotributo">Monotributo</Label>
                  <Input
                    id="monotributo"
                    type="text"
                    value={tempConfig.monotributo}
                    onChange={(e) => {
                      // CORRECCIÓN: Actualizar el estado de string directamente
                      handleAmountChange(e.target.value, (value) =>
                        setTempConfig({ ...tempConfig, monotributo: value })
                      );
                    }}
                    placeholder="Ingresa el monto del monotributo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resetDay">Día de restablecimiento</Label>
                  <Input
                    id="resetDay"
                    type="number"
                    min={1}
                    max={28}
                    value={tempConfig.resetDay || ""}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value >= 1 && value <= 28) {
                        setTempConfig({ ...tempConfig, resetDay: value });
                      } else if (e.target.value === "") {
                        setTempConfig({ ...tempConfig, resetDay: undefined });
                      }
                    }}
                    placeholder="Ej: 15"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Categorías</h3>
                  <div
                    className={`text-sm px-3 py-2 rounded-lg border ${
                      Math.abs(
                        Object.values(tempConfig.categories).reduce(
                          (sum, cat) => sum + cat.percentage,
                          0
                        ) - 100
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
                      totalCategories={getOrderedTempCategories().length}
                      availableIcons={availableIcons}
                      iconMap={iconMap}
                      onUpdateName={updateCategoryName}
                      onUpdateIcon={updateCategoryIcon}
                      onUpdatePercentage={handlePercentageChange}
                      onDelete={deleteCategory}
                      onMoveUp={moveCategoryUp}
                      onMoveDown={moveCategoryDown}
                    />
                  ))}
                </div>

                <Card className="p-4 border-dashed">
                  <h4 className="text-md font-medium mb-3">
                    Agregar Nueva Categoría
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Nombre
                      </label>
                      <Input
                        placeholder="Nombre de categoría"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          Icono
                        </label>
                        <Select
                          value={newCategoryIcon}
                          onValueChange={setNewCategoryIcon}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              <div className="flex items-center space-x-2">
                                {React.createElement(iconMap[newCategoryIcon], {
                                  className: "h-4 w-4",
                                })}
                                <span className="text-sm">
                                  {availableIcons.find(
                                    (icon) => icon.name === newCategoryIcon
                                  )?.label || "Icono"}
                                </span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {availableIcons.map((iconItem) => (
                              <SelectItem
                                key={iconItem.name}
                                value={iconItem.name}
                              >
                                <div className="flex items-center space-x-2">
                                  {React.createElement(iconItem.icon, {
                                    className: "h-4 w-4",
                                  })}
                                  <span>{iconItem.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          Porcentaje
                        </label>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="0"
                            value={newCategoryPercentage}
                            onChange={(e) =>
                              handleAmountChange(
                                e.target.value,
                                setNewCategoryPercentage
                              )
                            }
                            className="w-full pr-8"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={addNewCategory}
                      className="w-full"
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Categoría
                    </Button>
                  </div>
                </Card>

                <div className="pt-4 border-t">
                  <Button onClick={saveConfig} className="w-full" size="lg">
                    <Settings className="h-4 w-4 mr-2" />
                    Guardar Configuración
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Resumen financiero simplificado */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sueldo Neto</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">
                ${formatCurrency(netSalary)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Bruto: ${formatCurrency(config.salary)} - Monotributo: $
                {formatCurrency(config.monotributo)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponible</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl sm:text-3xl font-bold ${
                  remainingBudget >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {remainingBudget >= 0
                  ? `$${formatCurrency(remainingBudget)}`
                  : `($${formatCurrency(Math.abs(remainingBudget))})`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {remainingBudget >= 0
                  ? "Disponible este mes"
                  : "Excedido este mes"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Categorías optimizadas */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-bold">Categorías</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategories(!showCategories)}
            >
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

          <AnimatePresence initial={false}>
            {showCategories && (
              <motion.div
                key="categories"
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 overflow-hidden"
              >
                {getOrderedCategories().map(([key, category]) => {
                  const data = calculateCategoryData(key);
                  const IconComponent =
                    iconMap[category.icon as keyof typeof iconMap] ||
                    DollarSign;
                  const isAhorro = isAhorroCategory(key);

                  return (
                    <Card
                      key={key}
                      className="relative hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium truncate">
                          {category.name}
                        </CardTitle>
                        <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </CardHeader>
                      <CardContent>
                        {isAhorro ? (
                          <>
                            <div className="text-lg sm:text-2xl font-bold">
                              ${formatCurrency(data.available)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {category.percentage}% de tu sueldo neto
                            </p>
                            <div className="mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-800"
                                onClick={() =>
                                  window.open(
                                    "https://comparatasas.ar/",
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                              >
                                <TrendingUp className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                                <span className="text-blue-600 dark:text-blue-400">
                                  Ver Inversiones
                                </span>
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-lg sm:text-2xl font-bold">
                              $
                              {data.available >= 0
                                ? formatCurrency(data.available)
                                : `(${formatCurrency(
                                    Math.abs(data.available)
                                  )})`}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Disponible de ${formatCurrency(data.budget)}
                            </p>
                            <div className="mt-4">
                              <div className="flex justify-between text-xs mb-1">
                                <span>
                                  Gastado: ${formatCurrency(data.spent)}
                                </span>
                                <span>{data.percentage.toFixed(1)}%</span>
                              </div>
                              <Progress
                                value={Math.min(data.percentage, 100)}
                                className={`h-2 ${
                                  data.percentage > 100
                                    ? "bg-destructive/20"
                                    : ""
                                }`}
                              />
                              {data.percentage > 100 && (
                                <p className="text-xs text-destructive mt-1">
                                  Excedido por $
                                  {formatCurrency(data.spent - data.budget)}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sección de transacciones unificada */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-bold">Transacciones</h2>

            <Dialog
              open={showTransactionDialog}
              onOpenChange={setShowTransactionDialog}
            >
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Transacción
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md mx-auto">
                <DialogHeader>
                  <DialogTitle>Nueva Transacción</DialogTitle>
                  <DialogDescription>
                    Registra un ingreso o gasto
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Tipo de transacción */}
                  <div className="space-y-2">
                    <Label>Tipo de transacción *</Label>
                    <Select
                      value={newTransaction.type}
                      onValueChange={(
                        value: "income" | "expense" | "savings"
                      ) =>
                        setNewTransaction({
                          ...newTransaction,
                          type: value,
                          category: "",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">
                          <div className="flex items-center space-x-2">
                            <ArrowRightCircle className="h-4 w-4 text-green-600" />
                            <span>Ingreso</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="expense">
                          <div className="flex items-center space-x-2">
                            <ArrowLeftCircle className="h-4 w-4 text-red-600" />
                            <span>Gasto</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="savings">
                          <div className="flex items-center space-x-2">
                            <PiggyBank className="h-4 w-4 text-blue-600" />
                            <span>Ahorro</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Categoría (solo para gastos) */}
                  {newTransaction.type === "expense" && (
                    <div className="space-y-2">
                      <Label htmlFor="category">Categoría *</Label>
                      <Select
                        value={newTransaction.category as string}
                        onValueChange={(value) =>
                          setNewTransaction({
                            ...newTransaction,
                            category: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSpendableCategories().map(([key, category]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center space-x-2">
                                {React.createElement(
                                  iconMap[category.icon] || DollarSign,
                                  { className: "h-4 w-4" }
                                )}
                                <span>{category.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Objetivo de ahorro (solo para ahorro) */}
                  {newTransaction.type === "savings" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="goalId">Objetivo de ahorro *</Label>
                        <Select
                          value={newTransaction.goalId as string}
                          onValueChange={(value) =>
                            setNewTransaction({
                              ...newTransaction,
                              goalId: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un objetivo" />
                          </SelectTrigger>
                          <SelectContent>
                            {savingsGoals
                              .filter((goal) => !goal.isCompleted)
                              .map((goal) => (
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
                        <Label htmlFor="savingsType">
                          Tipo de movimiento *
                        </Label>
                        <Select
                          value={newTransaction.savingsType as string}
                          onValueChange={(value: "deposit" | "withdrawal") =>
                            setNewTransaction({
                              ...newTransaction,
                              savingsType: value,
                            })
                          }
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
                    </>
                  )}

                  {/* Monto */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto *</Label>
                    <Input
                      id="amount"
                      type="text"
                      value={newTransaction.amount}
                      onChange={(e) =>
                        handleAmountChange(e.target.value, (value) =>
                          setNewTransaction({
                            ...newTransaction,
                            amount: value,
                          })
                        )
                      }
                      placeholder="Ej: 1.500 o 1.500,50"
                    />
                  </div>

                  {/* Descripción */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Input
                      id="description"
                      value={newTransaction.description}
                      onChange={(e) =>
                        setNewTransaction({
                          ...newTransaction,
                          description: e.target.value,
                        })
                      }
                      placeholder={
                        newTransaction.type === "income"
                          ? "Ej: Aguinaldo, regalo, etc."
                          : "Descripción del gasto"
                      }
                    />
                  </div>

                  {/* Transacción recurrente */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="recurring"
                      checked={newTransaction.isRecurring}
                      onCheckedChange={(checked) =>
                        setNewTransaction({
                          ...newTransaction,
                          isRecurring: checked,
                        })
                      }
                    />
                    <Label htmlFor="recurring" className="text-sm">
                      <div className="flex items-center space-x-2">
                        <Repeat className="h-4 w-4" />
                        <span>Transacción recurrente mensual</span>
                      </div>
                    </Label>
                  </div>

                  {/* Día de recurrencia (solo si es recurrente) */}
                  {newTransaction.isRecurring && (
                    <div className="space-y-2">
                      <Label htmlFor="recurring-day">
                        Día del mes para repetir (1-28)
                      </Label>
                      <Input
                        id="recurring-day"
                        type="number"
                        min="1"
                        max="28"
                        value={newTransaction.recurringDay || 1}
                        onChange={(e) => {
                          const day = newTransaction.recurringDay || 1;
                          if (day >= 1 && day <= 28) {
                            setNewTransaction({
                              ...newTransaction,
                              recurringDay: day,
                            });
                          }
                        }}
                        placeholder="Ej: 15"
                      />
                    </div>
                  )}

                  <Button
                    onClick={addTransaction}
                    className="w-full"
                    disabled={addingTransaction}
                    size="lg"
                  >
                    {addingTransaction ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      `Agregar ${
                        newTransaction.type === "income" ? "Ingreso" : "Gasto"
                      }`
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
                    placeholder="Buscar transacciones..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select
                  value={filterCategory}
                  onValueChange={setFilterCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {getOrderedCategories().map(([key, category]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          {React.createElement(
                            iconMap[category.icon] || DollarSign,
                            { className: "h-4 w-4" }
                          )}
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
                  onChange={(e) =>
                    setFilterDate(formatDateInput(e.target.value))
                  }
                  maxLength={10}
                />
              </div>

              {filteredTransactions.length !== transactions.length && (
                <p className="text-sm text-muted-foreground">
                  Mostrando {filteredTransactions.length} de{" "}
                  {transactions.length} transacciones
                </p>
              )}
            </div>
          </Card>

          {/* Lista de transacciones unificada */}
          <Card>
            <CardContent className="p-0">
              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">
                    {transactions.length === 0
                      ? "No hay transacciones registradas"
                      : "No hay transacciones que coincidan con los filtros"}
                  </p>
                  <p className="text-sm">
                    {transactions.length === 0
                      ? "Comienza agregando tu primera transacción usando el botón de arriba"
                      : "Prueba cambiando los filtros o términos de búsqueda"}
                  </p>
                  {(filterCategory !== "all" || filterDate || searchTerm) && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="mt-4"
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                          {transaction.type === "income" ? (
                            <ArrowRightCircle className="h-5 w-5 text-green-600" />
                          ) : transaction.type === "savings" ? (
                            transaction.savingsType === "deposit" ? (
                              <TrendingUp className="h-5 w-5 text-blue-600" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-blue-600" />
                            )
                          ) : (
                            React.createElement(
                              iconMap[
                                config.categories[transaction.category!]
                                  ?.icon as keyof typeof iconMap
                              ] || DollarSign,
                              { className: "h-5 w-5" }
                            )
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium truncate">
                              {transaction.description}
                            </p>
                            {transaction.isRecurring && (
                              <Repeat className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground sm:block hidden">
                            {transaction.type === "income"
                              ? "Ingreso"
                              : transaction.type === "savings"
                              ? `${
                                  transaction.savingsType === "deposit"
                                    ? "Depósito"
                                    : "Retiro"
                                } - ${
                                  savingsGoals.find(
                                    (g) => g.id === transaction.goalId
                                  )?.name || "Objetivo"
                                }`
                              : config.categories[transaction.category!]
                                  ?.name}{" "}
                            •{" "}
                            {new Date(transaction.date).toLocaleDateString(
                              "es-AR"
                            )}
                            {transaction.isRecurring &&
                              ` • Día ${transaction.recurringDay || 1}`}
                          </p>
                          <p className="text-sm text-muted-foreground sm:hidden block">
                            {new Date(transaction.date).toLocaleDateString(
                              "es-AR"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span
                          className={`font-semibold text-sm sm:text-base ${
                            transaction.type === "income"
                              ? "text-green-600 dark:text-green-400"
                              : transaction.type === "savings"
                              ? transaction.savingsType === "deposit"
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-blue-600 dark:text-blue-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {transaction.type === "income"
                            ? "+"
                            : transaction.type === "savings"
                            ? transaction.savingsType === "deposit"
                              ? "-"
                              : "+"
                            : "-"}
                          ${formatCurrency(transaction.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTransaction(transaction);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTransaction(transaction.id)}
                        >
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

        {/* Sección de objetivos de ahorro */}

        {/* Dialogs */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="mx-4 max-w-md">
            <DialogHeader>
              <DialogTitle>Restablecer Datos</DialogTitle>
              <DialogDescription>
                Esto eliminará todas tus transacciones registradas. Esta acción
                no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mb-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm text-destructive">
                  <strong>¡Atención!</strong> Se eliminarán todas las
                  transacciones pero se mantendrá tu configuración de sueldo y
                  categorías.{" "}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-reset"
                  checked={tempConfig?.autoResetEnabled || false}
                  onCheckedChange={(checked) => {
                    if (tempConfig) {
                      setTempConfig({
                        ...tempConfig,
                        autoResetEnabled: checked,
                      });
                    }
                  }}
                />
                <Label htmlFor="auto-reset" className="text-sm">
                  Restablecer automáticamente
                </Label>
              </div>
              {tempConfig?.autoResetEnabled && (
                <div>
                  <Label htmlFor="reset-day" className="text-sm font-medium">
                    Día del mes para restablecer (1-28)
                  </Label>
                  <Input
                    id="reset-day"
                    type="number"
                    min={1}
                    max={28}
                    value={tempConfig?.resetDay || ""}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value >= 1 && value <= 28) {
                        if (tempConfig) {
                          setTempConfig({ ...tempConfig, resetDay: value });
                        }
                      } else if (e.target.value === "") {
                        if (tempConfig) {
                          setTempConfig({ ...tempConfig, resetDay: undefined });
                        }
                      }
                    }}
                    placeholder="Ej: 15"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowResetDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={resetAllData}
                className="flex-1"
              >
                Restablecer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de edición de transacciones */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Editar Transacción</DialogTitle>
              <DialogDescription>
                Modifica los datos de la transacción seleccionada
              </DialogDescription>
            </DialogHeader>
            {editingTransaction && (
              <div className="space-y-4">
                {/* Tipo de transacción */}
                <div className="space-y-2">
                  <Label>Tipo de transacción</Label>
                  <Select
                    value={editingTransaction.type}
                    onValueChange={(value: "income" | "expense") =>
                      setEditingTransaction({
                        ...editingTransaction,
                        type: value,
                        category:
                          value === "income"
                            ? undefined
                            : editingTransaction.category,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">
                        <div className="flex items-center space-x-2">
                          <ArrowRightCircle className="h-4 w-4 text-green-600" />
                          <span>Ingreso</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="expense">
                        <div className="flex items-center space-x-2">
                          <ArrowLeftCircle className="h-4 w-4 text-red-600" />
                          <span>Gasto</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Categoría (solo para gastos) */}
                {editingTransaction.type === "expense" && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Categoría</Label>
                    <Select
                      value={editingTransaction.category || ""}
                      onValueChange={(value) =>
                        setEditingTransaction({
                          ...editingTransaction,
                          category: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSpendableCategories().map(([key, category]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center space-x-2">
                              {React.createElement(
                                iconMap[category.icon] || DollarSign,
                                { className: "h-4 w-4" }
                              )}
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Monto */}
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Monto</Label>
                  <Input
                    id="edit-amount"
                    type="text"
                    value={formatForInput(editingTransaction.amount)}
                    onChange={(e) => {
                      const formatted = formatInputValue(e.target.value);
                      setEditingTransaction({
                        ...editingTransaction,
                        amount: parseFormattedValue(formatted),
                      });
                    }}
                    placeholder="Ej: 1.500 o 1.500,50"
                  />
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descripción</Label>
                  <Input
                    id="edit-description"
                    value={editingTransaction.description}
                    onChange={(e) =>
                      setEditingTransaction({
                        ...editingTransaction,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descripción de la transacción"
                  />
                </div>

                {/* Recurrente */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-recurring"
                    checked={editingTransaction.isRecurring || false}
                    onCheckedChange={(checked) =>
                      setEditingTransaction({
                        ...editingTransaction,
                        isRecurring: checked,
                      })
                    }
                  />
                  <Label htmlFor="edit-recurring" className="text-sm">
                    <div className="flex items-center space-x-2">
                      <Repeat className="h-4 w-4" />
                      <span>Transacción recurrente mensual</span>
                    </div>
                  </Label>
                </div>

                {/* Día de recurrencia (solo si es recurrente) */}
                {editingTransaction.isRecurring && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-recurring-day">
                      Día del mes para repetir (1-28)
                    </Label>
                    <Input
                      id="edit-recurring-day"
                      type="number"
                      min="1"
                      max="28"
                      value={editingTransaction.recurringDay || 1}
                      onChange={(e) => {
                        const day = Number.parseInt(e.target.value);
                        if (day >= 1 && day <= 28) {
                          setEditingTransaction({
                            ...editingTransaction,
                            recurringDay: day,
                          });
                        }
                      }}
                      placeholder="Ej: 15"
                    />
                  </div>
                )}

                <Button
                  onClick={updateTransaction}
                  className="w-full"
                  size="lg"
                >
                  Actualizar Transacción
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </motion.div>
  );
}
