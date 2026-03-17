import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

// Initialize the Supabase client.
// Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env.local file.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
export const supabase = createClient(supabaseUrl, supabaseKey)

// Define the structure of a sign record from the database
export interface SignData {
  id: string
  user_id?: string
  faction?: 'Syndicate' | 'Zenith' | 'Glitch'
  position: [number, number, number] | any
  rotation: [number, number, number] | any
  image_url: string
  created_at?: string
}

export function useSigns() {
  const [signs, setSigns] = useState<SignData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchSigns = useCallback(async () => {
    setIsLoading(true)
    
    // Fetch all existing signs on mount
    const { data, error } = await supabase
      .from('signs')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching signs:', error.message)
    } else if (data) {
      setSigns(data as SignData[])
    }
    
    setIsLoading(false)
  }, [])

  useEffect(() => {
    // 1. Execute initial data fetch
    fetchSigns()

    // 2. Set up realtime subscription for new signs
    const signsChannel = supabase
      .channel('public:signs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'signs' },
        (payload) => {
          // Whenever a new sign is inserted into the table, update local state immediately
          const newSign = payload.new as SignData
          setSigns((currentSigns) => [...currentSigns, newSign])
        }
      )
      .subscribe()

    // 3. Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(signsChannel)
    }
  }, [fetchSigns])

  // Return the signs array and loading state exactly as requested
  return { signs, isLoading }
}
