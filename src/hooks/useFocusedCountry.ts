import { useState, useEffect } from 'react'
import { CountryData } from './useCountries'

// Module-level singleton — lets Scene set it and AuthProfile read it
// without prop drilling or a context provider.
let focusedCountry: CountryData | null = null
const listeners = new Set<(c: CountryData | null) => void>()

export function setFocusedCountry(country: CountryData | null) {
  focusedCountry = country
  listeners.forEach(l => l(country))
}

export function useFocusedCountry() {
  const [country, setCountry] = useState<CountryData | null>(focusedCountry)

  useEffect(() => {
    listeners.add(setCountry)
    return () => { listeners.delete(setCountry) }
  }, [])

  return country
}
