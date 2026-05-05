
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  email text,
  city text,
  region text,
  country text,
  ip_first_seen text,
  weekly_digest boolean NOT NULL DEFAULT true,
  instant_alerts boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  logo_url text,
  website_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacies public read" ON public.pharmacies FOR SELECT USING (true);
CREATE POLICY "pharmacies admin write" ON public.pharmacies FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  active_ingredient text NOT NULL,
  presentation text,
  category text,
  indication text,
  manufacturer text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX medications_name_trgm ON public.medications USING gin (name gin_trgm_ops);
CREATE INDEX medications_active_trgm ON public.medications USING gin (active_ingredient gin_trgm_ops);
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meds public read" ON public.medications FOR SELECT USING (true);
CREATE POLICY "meds admin write" ON public.medications FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.medication_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  price numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  product_url text,
  in_stock boolean NOT NULL DEFAULT true,
  scraped_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX prices_med_pharm_time ON public.medication_prices (medication_id, pharmacy_id, scraped_at DESC);
ALTER TABLE public.medication_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prices public read" ON public.medication_prices FOR SELECT USING (true);
CREATE POLICY "prices admin write" ON public.medication_prices FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.medication_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  threshold_pct numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, medication_id)
);
ALTER TABLE public.medication_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "followers own select" ON public.medication_followers FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "followers own insert" ON public.medication_followers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "followers own update" ON public.medication_followers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "followers own delete" ON public.medication_followers FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.search_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text,
  medication_id uuid REFERENCES public.medications(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  region text,
  city text,
  country text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX search_events_created ON public.search_events (created_at DESC);
ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search insert anon" ON public.search_events FOR INSERT WITH CHECK (true);
CREATE POLICY "search admin read" ON public.search_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
