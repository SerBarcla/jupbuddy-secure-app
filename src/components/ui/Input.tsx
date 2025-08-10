import type { FC } from 'react';

interface InputProps {
  [key: string]: any;
}

export const Input: FC<InputProps> = (props) => (
  <input {...props} className={`w-full p-2 border border-gray-300 rounded-lg ${props.className || ''}`} />
);
