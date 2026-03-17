import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
export const supabase = createClient(supabaseUrl, supabaseKey)

export interface CountryData {
  id: string
  name: string
  iso_code: string
  lat: number
  lng: number
  population: number
  color: string
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
