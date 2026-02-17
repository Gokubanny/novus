import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://novus-vy80.onrender.com/api';
