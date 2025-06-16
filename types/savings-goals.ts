export interface SavingsGoal {
  id: string
  userId: string
  name: string
  description?: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  category: string
  icon: string
  color: string
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}

export interface SavingsContribution {
  id: string
  goalId: string
  userId: string
  amount: number
  description?: string
  date: string
  type: "deposit" | "withdrawal"
}

export const GOAL_CATEGORIES = [
  { value: "travel", label: "Viaje", icon: "Plane" },
  { value: "electronics", label: "Electrónicos", icon: "Laptop" },
  { value: "car", label: "Vehículo", icon: "Car" },
  { value: "home", label: "Casa/Hogar", icon: "Home" },
  { value: "education", label: "Educación", icon: "GraduationCap" },
  { value: "emergency", label: "Emergencia", icon: "Shield" },
  { value: "investment", label: "Inversión", icon: "TrendingUp" },
  { value: "other", label: "Otro", icon: "Target" },
] as const

export const GOAL_COLORS = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#F97316", // orange
] as const
