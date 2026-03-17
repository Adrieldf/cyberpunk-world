-- Drop the old tables entirely to pivot from Cities to Countries
DROP TABLE IF EXISTS public.signs CASCADE;
DROP TABLE IF EXISTS public.cities CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
-- Drop old trigger/functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;
DROP FUNCTION IF EXISTS public.join_city CASCADE;


----------------------------------------------------------
-- 1. COUNTRIES TABLE
----------------------------------------------------------
CREATE TABLE public.countries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  iso_code TEXT NOT NULL UNIQUE,   -- e.g., 'US', 'BR', 'CA'
  lat FLOAT NOT NULL,              -- Capital marker Latitude
  lng FLOAT NOT NULL,              -- Capital marker Longitude
  population INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All countries are viewable by everyone."
  ON public.countries FOR SELECT
  USING ( true );


----------------------------------------------------------
-- 2. PROFILES TABLE (Updated to country_id)
----------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL, 
  credits INTEGER DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING ( true );

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );


----------------------------------------------------------
-- 3. AUTH TRIGGER
----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id); 
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


----------------------------------------------------------
-- 4. REALTIME POPULATION LOGIC (Join Country)
----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_country(target_country_id UUID)
RETURNS void AS $$
DECLARE
  old_country_id UUID;
BEGIN
  -- Get user's current country
  SELECT country_id INTO old_country_id FROM public.profiles WHERE id = auth.uid();

  -- If already in this country, abort
  IF old_country_id = target_country_id THEN
    RETURN;
  END IF;

  -- Decrease population of old country
  IF old_country_id IS NOT NULL THEN
    UPDATE public.countries 
    SET population = population - 1 
    WHERE id = old_country_id;
  END IF;

  -- Increase population of the new country
  UPDATE public.countries 
  SET population = population + 1 
  WHERE id = target_country_id;

  -- Update profile safely
  UPDATE public.profiles 
  SET country_id = target_country_id 
  WHERE id = auth.uid();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
