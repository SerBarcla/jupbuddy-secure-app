import type { FC, ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  icon?: React.ElementType;
  variant?: 'primary' | 'secondary' | 'danger';
  [key: string]: any;
}

const variants: { [key: string]: string } = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
};

export const Button: FC<ButtonProps> = ({ children, icon: Icon, variant = 'primary', ...props }) => (
  <button
    {...props}
    className={`font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 ${variants[variant]} ${props.className || ''}`}
  >
    {Icon && <Icon className="w-5 h-5" />}
    {children}
  </button>
);
