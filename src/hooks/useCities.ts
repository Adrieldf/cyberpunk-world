import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface CityData {
  id: string
  name: string
  country: string
  lat: number
  lng: number
  population: number
}

// Global hook to access and subscribe to city populations globally map-wide
export function useCities() {
  const [cities, setCities] = useState<CityData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchCities = useCallback(async () => {
    setIsLoading(true)
    
    // In a real app we might only fetch cities in the bounding box
    // But for Neon Triad we'll fetch them all to render the world globally
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      // Sort by population so the biggest cities render first/on top
      .order('population', { ascending: false })

    if (error) {
      console.error('Error fetching cities:', error.message)
    } else if (data) {
      setCities(data as CityData[])
    }
    
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchCities()

    // Real-time population tracker
    const citiesChannel = supabase
      .channel('public:cities')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cities' },
        (payload) => {
          const updatedCity = payload.new as CityData
          
          setCities((currentCities) => {
            return currentCities.map(city => 
              city.id === updatedCity.id ? updatedCity : city
            ).sort((a, b) => b.population - a.population) // keep sorted
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(citiesChannel)
    }
  }, [fetchCities])

  // A helper function to call our Postgres RPC atomic function
  const joinCity = async (cityId: string) => {
    // Note: requires the user to be logged in via Supabase Auth
    const { error } = await supabase.rpc('join_city', { target_city_id: cityId })
    if (error) {
       console.error("Failed to join city:", error.message)
       throw error
    }
  }

  return { cities, isLoading, joinCity }
}
