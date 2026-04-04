import React from 'react'

interface AlertProps {
  children: React.ReactNode
  variant?: 'default' | 'destructive' | 'success'
  className?: string
}

export function Alert({ children, variant = 'default', className = '' }: AlertProps) {
  const baseClasses = 'p-4 rounded-lg border'
  const variantClasses = {
    default: 'bg-blue-50 border-blue-200 text-blue-800',
    destructive: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800'
  }

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  )
}

export function AlertDescription({ children }: { children: React.ReactNode }) {
  return <div className="text-sm">{children}</div>
}