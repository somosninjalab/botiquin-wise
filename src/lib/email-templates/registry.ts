import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as priceAlert } from './price-alert'
import { template as searchResults } from './search-results'
import { template as weeklyReminder } from './weekly-reminder'
import { template as partnerLead } from './partner-lead'
import { template as nuevaVersion } from './nueva-version'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'price-alert': priceAlert,
  'search-results': searchResults,
  'weekly-reminder': weeklyReminder,
  'partner-lead': partnerLead,
  'nueva-version': nuevaVersion,
}
