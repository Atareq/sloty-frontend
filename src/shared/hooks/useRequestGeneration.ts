import { useCallback, useRef } from 'react'

/**
 * Guards live-search responses so an older in-flight request cannot
 * overwrite a newer query's results.
 */
export function useRequestGeneration() {
  const generationRef = useRef(0)

  const nextGeneration = useCallback((): number => {
    generationRef.current += 1
    return generationRef.current
  }, [])

  const isCurrent = useCallback((generation: number): boolean => {
    return generationRef.current === generation
  }, [])

  return { nextGeneration, isCurrent }
}

