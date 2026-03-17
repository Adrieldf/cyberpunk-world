import { createClient } from '@supabase/supabase-js'

// Need these available when running locally `npm run seed`
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// To bypass RLS and seed the db, we need the Service Role Key, not the Anon Key!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// A realistic array of global mega-cities strictly formatted for D3
const CITIES = [
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, population: 37400000 },
  { name: 'Delhi', country: 'India', lat: 28.7041, lng: 77.1025, population: 29399141 },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737, population: 26317104 },
  { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333, population: 21846507 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332, population: 21671908 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357, population: 20485965 },
  { name: 'Dhaka', country: 'Bangladesh', lat: 23.8103, lng: 90.4125, population: 20283552 },
  { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777, population: 20185064 },
  { name: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074, population: 19433000 },
  { name: 'Osaka', country: 'Japan', lat: 34.6937, lng: 135.5023, population: 19222665 },
  { name: 'New York City', country: 'USA', lat: 40.7128, lng: -74.0060, population: 18804000 },
  { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278, population: 8982000 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, population: 2161000 },
  { name: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050, population: 3645000 },
  { name: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173, population: 11920000 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, population: 5312163 },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708, population: 3331420 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, population: 5703600 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792, population: 14368000 },
  { name: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437, population: 3990456 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816, population: 15154000 },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lng: 28.0473, population: 5635127 },
]

async function seed() {
  console.log("Starting Neon Triad City Seeder...")
  
  // Wipe existing
  const { error: delErr } = await supabase.from('cities').delete().neq('population', -1) // Deletes all
  if (delErr) {
      console.error("Failed wiping cities:", delErr.message)
      return
  }

  // Insert the payload! Because players will build up the cities, we reset base population to tiny amounts
  // so the player impact is highly visible on the map geometry!
  const starterPayload = CITIES.map(c => ({
      ...c,
      population: Math.floor(c.population / 1000000) // Drops numbers from 37M down to ~37 for the ThreeJS box height math
  }))

  const { error } = await supabase.from('cities').insert(starterPayload)

  if (error) {
    console.error("Error inserting cities:", error.message)
  } else {
    console.log(`Successfully seeded ${starterPayload.length} global cities!`)
  }
}

seed()
