import type { SortDirection } from '../SortOrderToggle/SortOrderToggle'
import {
  SortOrderToggle,
  type SortOrderToggleProps,
} from '../SortOrderToggle/SortOrderToggle'

export type { SortDirection, SortOrderToggleProps as OrderByProps }

/**
 * Shared OrderBy component for list and history ordering.
 * Standardizes the single-control toggle between newest first ('desc') and oldest first ('asc').
 *
 * All list/history ordering should use the shared OrderBy component.
 * Do not create page-specific newest/oldest controls.
 */
export function OrderBy(props: SortOrderToggleProps) {
  return <SortOrderToggle {...props} />
}

export const OrderByButton = OrderBy

