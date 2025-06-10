"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GripVertical, X } from "lucide-react"
import { formatForInput } from "@/lib/formatters"

interface Category {
  name: string
  percentage: number
  icon: string
}

interface DraggableCategoryProps {
  categoryKey: string
  category: Category
  index: number
  availableIcons: Array<{ name: string; icon: any; label: string }>
  iconMap: Record<string, any>
  onUpdateName: (key: string, name: string) => void
  onUpdateIcon: (key: string, icon: string) => void
  onUpdatePercentage: (key: string, value: string) => void
  onDelete: (key: string) => void
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, dropIndex: number) => void
}

export function DraggableCategory({
  categoryKey,
  category,
  index,
  availableIcons,
  iconMap,
  onUpdateName,
  onUpdateIcon,
  onUpdatePercentage,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}: DraggableCategoryProps) {
  return (
    <Card
      className="p-4 cursor-move hover:shadow-md transition-shadow"
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
    >
      {/* Versión para móviles - diseño tipo formulario */}
      <div className="md:hidden space-y-4">
        {/* Header con drag handle y delete */}
        <div className="flex items-center justify-between">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
          <Button variant="ghost" size="sm" onClick={() => onDelete(categoryKey)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nombre de la categoría */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Nombre</label>
          <Input
            value={category.name}
            onChange={(e) => onUpdateName(categoryKey, e.target.value)}
            className="w-full"
            placeholder="Nombre de la categoría"
          />
        </div>

        {/* Icono y Porcentaje en una fila */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Icono</label>
            <Select value={category.icon} onValueChange={(value) => onUpdateIcon(categoryKey, value)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    {React.createElement(iconMap[category.icon] || iconMap.DollarSign, {
                      className: "h-4 w-4",
                    })}
                    <span className="text-sm">
                      {availableIcons.find((icon) => icon.name === category.icon)?.label || "Icono"}
                    </span>
                  </div>
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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Porcentaje</label>
            <div className="relative">
              <Input
                type="text"
                value={formatForInput(category.percentage)}
                onChange={(e) => onUpdatePercentage(categoryKey, e.target.value)}
                className="w-full pr-8"
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Versión para desktop - elementos en línea */}
      <div className="hidden md:flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Select value={category.icon} onValueChange={(value) => onUpdateIcon(categoryKey, value)}>
            <SelectTrigger className="w-16">
              <SelectValue>
                {React.createElement(iconMap[category.icon] || iconMap.DollarSign, {
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
            onChange={(e) => onUpdateName(categoryKey, e.target.value)}
            className="flex-1"
            placeholder="Nombre de la categoría"
          />
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              value={formatForInput(category.percentage)}
              onChange={(e) => onUpdatePercentage(categoryKey, e.target.value)}
              className="w-20"
              placeholder="0"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onDelete(categoryKey)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
