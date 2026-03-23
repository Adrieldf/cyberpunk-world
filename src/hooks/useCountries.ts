import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface CountryData {
  id: string
  name: string
  iso_code: string
  lat: number
  lng: number
  population: number
  color: string
}

// Module-level refetch registry — lets any component trigger a countries refresh
// without prop drilling (used by the debug panel in AuthProfile)
let _refetch: (() => void) | null = null
export function triggerCountriesRefetch() {
  _refetch?.()
}

// Global hook to access and subscribe to country populations
export function useCountries() {
  const [countries, setCountries] = useState<CountryData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchCountries = useCallback(async () => {
    setIsLoading(true)
    
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      // Sort by population so the biggest rendering structures are prominent
      .order('population', { ascending: false })

    if (error) {
      console.error('Error fetching countries:', error.message)
    } else if (data) {
      setCountries(data as CountryData[])
    }
    
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // Register this fetch instance as the global refetcher
    _refetch = fetchCountries

    fetchCountries()

    // Real-time population tracker
    const countriesChannel = supabase
      .channel('public:countries')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'countries' },
        (payload) => {
          const updatedCountry = payload.new as CountryData
          
          setCountries((currentCountries) => {
            return currentCountries.map(country => 
              country.id === updatedCountry.id ? updatedCountry : country
            ).sort((a, b) => b.population - a.population) // keep sorted
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(countriesChannel)
      _refetch = null
    }
  }, [fetchCountries])

  // Call the atomic Postgres RPC function to safely join
  const joinCountry = async (countryId: string) => {
    const { error } = await supabase.rpc('join_country', { target_country_id: countryId })
    if (error) {
       console.error("Failed to join country:", error.message)
       throw error
    }
  }

  return { countries, isLoading, joinCountry }
}

