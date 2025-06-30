// @ts-nocheck
import * as React from "react"

import { motion, AnimatePresence } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-input focus-visible:border-primary",
        filled: "bg-accent/50 border-transparent focus-visible:bg-background focus-visible:border-primary",
        outlined: "border-2 border-input focus-visible:border-primary",
        underlined: "border-0 border-b-2 border-input rounded-none focus-visible:border-primary bg-transparent",
        floating: "border-input focus-visible:border-primary pt-6 pb-2"
      },
      size: {
        sm: "h-8 px-2 text-xs",
        default: "h-10 px-3",
        lg: "h-12 px-4 text-base",
        xl: "h-14 px-5 text-lg"
      },
      state: {
        default: "",
        error: "border-destructive focus-visible:border-destructive focus-visible:ring-destructive",
        success: "border-green-500 focus-visible:border-green-500 focus-visible:ring-green-500",
        warning: "border-yellow-500 focus-visible:border-yellow-500 focus-visible:ring-yellow-500"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default"
    },
  }
)

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant,
    size,
    state,
    type = "text",
    label,
    helperText,
    errorMessage,
    successMessage,
    leftIcon,
    rightIcon,
    loading = false,
    clearable = false,
    showPasswordToggle = false,
    floatingLabel = false,
    placeholder,
    value,
    onClear,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [showPassword, setShowPassword] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(!!value)

    const inputRef = React.useRef<HTMLInputElement>(null)

    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current!)

    // Listen for value changes
    React.useEffect(() => {
      setHasValue(!!value)
    }, [value])

    // Determine current state
    const currentState = errorMessage ? "error" : successMessage ? "success" : state

    // Determine input variant
    const inputVariant = floatingLabel ? "floating" : variant

    // Handle focus events
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      props.onBlur?.(e)
    }

    // Handle value changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value)
      props.onChange?.(e)
    }

    // Clear input
    const handleClear = () => {
      if (inputRef.current) {
        inputRef.current.value = ""
        setHasValue(false)
        onClear?.()
      }
    }

    // Toggle password visibility
    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword)
    }

    // Calculate input type
    const inputType = type === "password" && showPassword ? "text" : type

    return (
      <div className="w-full space-y-2">
        {/* Label */}
        {label && !floatingLabel && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}

          {/* Floating label */}
          {floatingLabel && label && (
            <motion.label
              className={cn(
                "absolute left-3 text-muted-foreground pointer-events-none transition-all duration-200",
                isFocused || hasValue
                  ? "top-2 text-xs text-primary"
                  : "top-1/2 transform -translate-y-1/2 text-sm"
              )}
              animate={{
                y: isFocused || hasValue ? -8 : 0,
                scale: isFocused || hasValue ? 0.85 : 1,
                color: isFocused ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"
              }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {label}
            </motion.label>
          )}

          {/* Input */}
          <input
            type={inputType}
            className={cn(
              inputVariants({ variant: inputVariant, size, state: currentState }),
              leftIcon && "pl-10",
              (rightIcon || clearable || showPasswordToggle || loading) && "pr-10",
              className
            )}
            ref={inputRef}
            placeholder={floatingLabel ? "" : placeholder}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            {...props}
          />

          {/* Right icon area */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {/* Loading state */}
            {loading && (
              <motion.div
                className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            )}

            {/* Clear button */}
            {clearable && hasValue && !loading && (
              <motion.button
                type="button"
                onClick={handleClear}
                className="text-muted-foreground hover:text-foreground transition-colors"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}

            {/* Password toggle */}
            {type === "password" && showPasswordToggle && !loading && (
              <motion.button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-muted-foreground hover:text-foreground transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </motion.button>
            )}

            {/* Status icons */}
            {!loading && currentState === "error" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-destructive"
              >
                <AlertCircle className="w-4 h-4" />
              </motion.div>
            )}

            {!loading && currentState === "success" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-green-500"
              >
                <Check className="w-4 h-4" />
              </motion.div>
            )}

            {/* Custom right icon */}
            {rightIcon && !loading && (
              <div className="text-muted-foreground">
                {rightIcon}
              </div>
            )}
          </div>

          {/* Focus indicator */}
          <motion.div
            className="absolute bottom-0 left-0 h-0.5 bg-primary"
            initial={{ width: 0 }}
            animate={{ width: isFocused ? "100%" : 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        </div>

        {/* Helper text and error messages */}
        <AnimatePresence mode="wait">
          {errorMessage && (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-destructive flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3" />
              {errorMessage}
            </motion.p>
          )}

          {successMessage && !errorMessage && (
            <motion.p
              key="success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-green-600 flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              {successMessage}
            </motion.p>
          )}

          {helperText && !errorMessage && !successMessage && (
            <motion.p
              key="helper"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-muted-foreground"
            >
              {helperText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }

