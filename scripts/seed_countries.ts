import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import worldCountries from 'world-countries'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// Major global countries we previously seeded with custom populations.
// We will preserve these custom scaled population values, and give everyone else 0.
const ORIGINAL_COUNTRIES = {
  'US': { lat: 38.9072, lng: -77.0369, population: Math.floor(331002651 / 10000000) },
  'CN': { lat: 39.9042, lng: 116.4074, population: Math.floor(1439323776 / 10000000) },
  'IN': { lat: 28.6139, lng: 77.2090, population: Math.floor(1380004385 / 10000000) },
  'JP': { lat: 35.6762, lng: 139.6503, population: Math.floor(126476461 / 10000000) },
  'BR': { lat: -15.8267, lng: -47.9218, population: Math.floor(212559417 / 10000000) },
  'GB': { lat: 51.5074, lng: -0.1278, population: Math.floor(67886011 / 10000000) },
  'DE': { lat: 52.5200, lng: 13.4050, population: Math.floor(83783942 / 10000000) },
  'FR': { lat: 48.8566, lng: 2.3522, population: Math.floor(65273511 / 10000000) },
  'AU': { lat: -35.2809, lng: 149.1300, population: Math.floor(25499884 / 10000000) },
  'CA': { lat: 45.4215, lng: -75.6972, population: Math.floor(37742154 / 10000000) },
  'RU': { lat: 55.7558, lng: 37.6173, population: Math.floor(145934462 / 10000000) },
  'ZA': { lat: -25.7479, lng: 28.2293, population: Math.floor(59308690 / 10000000) }, 
  'NG': { lat: 9.0765, lng: 7.3986, population: Math.floor(206139589 / 10000000) }, 
  'MX': { lat: 19.4326, lng: -99.1332, population: Math.floor(128932753 / 10000000) },
  'AR': { lat: -34.6037, lng: -58.3816, population: Math.floor(45195774 / 10000000) },
  'EG': { lat: 30.0444, lng: 31.2357, population: Math.floor(102334404 / 10000000) },
  'ID': { lat: -6.2088, lng: 106.8456, population: Math.floor(273523615 / 10000000) }, 
}

async function seed() {
  console.log("Starting Full Global Neon Triad Seeder (250 Countries)...")
  
  // Wipe existing
  const { error: delErr } = await supabase.from('countries').delete().neq('population', -1) 
  if (delErr) {
      console.error("Failed wiping countries:", delErr.message)
      return
  }

  // Map the 250 countries into our Supabase payload format!
  const starterPayload = worldCountries.map(c => {
    // Check if this country was part of the original seeded powers dataset
    const original = ORIGINAL_COUNTRIES[c.cca2 as keyof typeof ORIGINAL_COUNTRIES]

    return {
      name: c.name.common,
      iso_code: c.cca2,
      // If we provided a specific capital marker before, respect it, otherwise fallback to the geographic center
      lat: original ? original.lat : c.latlng[0],
      lng: original ? original.lng : c.latlng[1],
      // If it's a new country, initialize its population strictly to 0
      population: original ? original.population : 0
    }
  })

  // Supabase limits bulk inserts, so we chunk it just to be safe (max ~1000 rows usually, but we have 250)
  // 250 rows goes perfectly through a standard insert!
  const { error } = await supabase.from('countries').insert(starterPayload)

  if (error) {
    console.error("Error inserting countries:", error.message)
  } else {
    console.log(`Successfully seeded ${starterPayload.length} global countries onto the globe!`)
  }
}

seed()
