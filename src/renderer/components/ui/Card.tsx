import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  hoverable?: boolean;
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  className = '',
  padding = 'md',
  onClick,
  hoverable = false,
}: CardProps) {
  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700
        ${paddingClasses[padding]}
        ${hoverable ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  colorClass?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorClass = 'text-primary-600',
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className={`mt-2 text-3xl font-bold ${colorClass}`}>{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center">
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
              <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">vs yesterday</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-700 ${colorClass}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
