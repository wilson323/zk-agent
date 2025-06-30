import type React from "react"
import { memo } from 'react'

interface CategoryFilterProps {
  categories: string[]
  activeCategory: string
  onCategoryChange: (category: string) => void
}

export const CategoryFilter = memo<CategoryFilterProps>(({ categories, activeCategory, onCategoryChange }) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 mb-12">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 shadow-sm ${
            activeCategory === category
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
              : 'bg-white/90 text-gray-600 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-800/90 dark:text-gray-300 dark:hover:bg-gray-700 hover:shadow-md hover:scale-105'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  )
})
