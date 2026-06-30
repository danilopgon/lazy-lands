import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes without conflicts — clsx + twMerge.
 *
 * @param {ClassValue[]} inputs - One or more class values (strings, arrays, or objects) to merge.
 * @returns {string} The merged CSS class string with Tailwind conflicts resolved.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
