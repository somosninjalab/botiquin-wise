ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sex text CHECK (sex IN ('femenino','masculino','otro','prefiero_no_decir')),
  ADD COLUMN IF NOT EXISTS birth_date date;