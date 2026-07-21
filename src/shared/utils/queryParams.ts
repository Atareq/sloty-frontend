import type { QueryParamValue } from './buildPathWithQuery'

function getSearchParams(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
}

function isValidQueryParamValue(
  value: QueryParamValue,
): value is string | number | boolean {
  return value !== null && value !== undefined && value !== ''
}

function formatSearchParams(searchParams: URLSearchParams): string {
  const queryString = searchParams.toString()

  return queryString ? `?${queryString}` : ''
}

export function getQueryParam(search: string, key: string): string {
  return getSearchParams(search).get(key) ?? ''
}

export function getBooleanQueryParam(
  search: string,
  key: string,
): boolean | '' {
  const value = getQueryParam(search, key)

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return ''
}

export function getNumberQueryParam(search: string, key: string): number | '' {
  const value = getQueryParam(search, key)

  if (value === '') {
    return ''
  }

  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : ''
}

export function removeQueryParam(search: string, key: string): string {
  const searchParams = getSearchParams(search)

  searchParams.delete(key)

  return formatSearchParams(searchParams)
}

export function setQueryParam(
  search: string,
  key: string,
  value: QueryParamValue,
): string {
  const searchParams = getSearchParams(search)

  if (isValidQueryParamValue(value)) {
    searchParams.set(key, String(value))
  } else {
    searchParams.delete(key)
  }

  return formatSearchParams(searchParams)
}

export function toQueryObject(search: string): Record<string, string> {
  return Object.fromEntries(getSearchParams(search).entries())
}
