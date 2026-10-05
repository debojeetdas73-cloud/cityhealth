-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'patient');
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'successful', 'failed', 'refunded');

-- SHARED
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  date_of_birth date,
  gender text,
  blood_group text,
  city text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'patient') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATALOGUE
CREATE TABLE public.specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  medical_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Stethoscope',
  keywords text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.specialties TO anon, authenticated;
GRANT ALL ON public.specialties TO service_role;
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Specialties are public" ON public.specialties FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage specialties" ON public.specialties FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  city text NOT NULL,
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text,
  rating numeric(2,1) NOT NULL DEFAULT 4.5,
  reviews_count int NOT NULL DEFAULT 0,
  image_url text,
  about text NOT NULL DEFAULT '',
  emergency boolean NOT NULL DEFAULT true,
  established int,
  beds int,
  hours text NOT NULL DEFAULT 'Open 24 hours',
  departments text[] NOT NULL DEFAULT '{}',
  services text[] NOT NULL DEFAULT '{}',
  facilities text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hospitals TO anon, authenticated;
GRANT ALL ON public.hospitals TO service_role;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hospitals are public" ON public.hospitals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage hospitals" ON public.hospitals FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  specialty_id uuid NOT NULL REFERENCES public.specialties(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  qualification text NOT NULL DEFAULT 'MBBS, MD',
  experience_years int NOT NULL DEFAULT 5,
  rating numeric(2,1) NOT NULL DEFAULT 4.5,
  reviews_count int NOT NULL DEFAULT 0,
  fee int NOT NULL DEFAULT 500,
  gender text NOT NULL DEFAULT 'Female',
  city text NOT NULL,
  photo_url text,
  about text NOT NULL DEFAULT '',
  languages text[] NOT NULL DEFAULT '{English,Hindi}',
  education text[] NOT NULL DEFAULT '{}',
  expertise text[] NOT NULL DEFAULT '{}',
  services text[] NOT NULL DEFAULT '{}',
  consultation_types text[] NOT NULL DEFAULT '{In-clinic,Video}',
  slots text[] NOT NULL DEFAULT '{09:30 AM,10:30 AM,11:30 AM,02:00 PM,04:30 PM,05:30 PM}',
  available_today boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.doctors TO anon, authenticated;
GRANT ALL ON public.doctors TO service_role;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors are public" ON public.doctors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage doctors" ON public.doctors FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.health_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  price int NOT NULL,
  discounted_price int NOT NULL,
  description text NOT NULL DEFAULT '',
  tests text[] NOT NULL DEFAULT '{}',
  services text[] NOT NULL DEFAULT '{}',
  duration text NOT NULL DEFAULT '2-3 hours',
  eligibility text NOT NULL DEFAULT 'Adults 18 years and above',
  category text NOT NULL DEFAULT 'Preventive',
  city text NOT NULL,
  image_url text,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.health_packages TO anon, authenticated;
GRANT ALL ON public.health_packages TO service_role;
ALTER TABLE public.health_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Packages are public" ON public.health_packages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage packages" ON public.health_packages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  price int NOT NULL,
  period text NOT NULL DEFAULT 'year',
  tagline text NOT NULL DEFAULT '',
  discount_percent int NOT NULL DEFAULT 0,
  benefits text[] NOT NULL DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are public" ON public.subscription_plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage plans" ON public.subscription_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- PATIENT DATA
CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relation text NOT NULL,
  date_of_birth date,
  gender text,
  phone text,
  blood_group text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own family members" ON public.family_members FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER family_members_updated_at BEFORE UPDATE ON public.family_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  record_type text NOT NULL DEFAULT 'Report',
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_records TO authenticated;
GRANT ALL ON public.health_records TO service_role;
ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own health records" ON public.health_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE SEQUENCE public.booking_ref_seq START 125;

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  booking_ref text NOT NULL UNIQUE DEFAULT 'MED-APT-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.booking_ref_seq')::text, 5, '0'),
  appointment_date date NOT NULL,
  appointment_time text NOT NULL,
  consultation_type text NOT NULL DEFAULT 'In-clinic',
  booking_for text NOT NULL DEFAULT 'self',
  family_member_id uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
  patient_name text NOT NULL,
  patient_dob date,
  patient_gender text,
  patient_phone text NOT NULL,
  patient_email text,
  notes text,
  fee int NOT NULL DEFAULT 0,
  discount int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
GRANT USAGE ON SEQUENCE public.booking_ref_seq TO authenticated, service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own appointments" ON public.appointments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read appointments" ON public.appointments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update appointments" ON public.appointments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.package_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.health_packages(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  booking_ref text NOT NULL UNIQUE DEFAULT 'MED-PKG-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.booking_ref_seq')::text, 5, '0'),
  booking_date date NOT NULL,
  booking_time text NOT NULL,
  patient_name text NOT NULL,
  patient_phone text NOT NULL,
  patient_email text,
  amount int NOT NULL DEFAULT 0,
  discount int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_bookings TO authenticated;
GRANT ALL ON public.package_bookings TO service_role;
ALTER TABLE public.package_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own package bookings" ON public.package_bookings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read package bookings" ON public.package_bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER package_bookings_updated_at BEFORE UPDATE ON public.package_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '1 year',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id uuid,
  payment_type text NOT NULL DEFAULT 'appointment',
  amount int NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  payment_method text NOT NULL,
  transaction_id text NOT NULL,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Insert own payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own payments" ON public.payments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query text NOT NULL,
  matched_specialty text,
  results_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.search_logs TO anon, authenticated;
GRANT SELECT ON public.search_logs TO authenticated;
GRANT ALL ON public.search_logs TO service_role;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log a search" ON public.search_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read search logs" ON public.search_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own conversations" ON public.chat_conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own chat messages" ON public.chat_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ SEED DATA ============
INSERT INTO public.specialties (slug, name, medical_name, description, icon, keywords, sort_order) VALUES
('eye-care','Eye Care','Ophthalmology','Vision, cataract, retina and eye surgery care','Eye','{eye,eyes,vision,sight,ophthalmology,ophthalmologist,cataract,retina,glaucoma,spectacles,blurry vision,eye checkup,eye specialist,eye doctor,eye hospital,lasik}',1),
('cardiology','Cardiology','Cardiology','Heart, blood pressure and cardiac care','HeartPulse','{heart,cardiac,cardiology,cardiologist,chest pain,bp,blood pressure,hypertension,ecg,heart specialist,palpitations,cholesterol}',2),
('dermatology','Dermatology','Dermatology','Skin, hair and cosmetic treatments','Sparkles','{skin,skin doctor,dermatology,dermatologist,acne,pimples,hair fall,hair,rash,eczema,psoriasis,allergy,skin specialist}',3),
('dentistry','Dentistry','Dental Care','Teeth, gums, braces and oral surgery','Smile','{teeth,tooth,dental,dentist,dentistry,cavity,braces,gums,root canal,toothache,oral,teeth cleaning}',4),
('orthopedics','Orthopedics','Orthopedics','Bones, joints, spine and sports injuries','Bone','{bone,bones,joint,knee,back pain,spine,orthopedic,orthopedics,orthopaedic,fracture,arthritis,shoulder,sports injury}',5),
('neurology','Neurology','Neurology','Brain, nerves, migraine and stroke care','Brain','{brain,nerve,neurology,neurologist,migraine,headache,seizure,epilepsy,stroke,memory,paralysis}',6),
('pediatrics','Pediatrics','Pediatrics','Newborn, child health and vaccinations','Baby','{child,children,kid,baby,pediatrics,pediatrician,paediatric,vaccination,newborn,infant,child specialist}',7),
('ent','ENT','Otorhinolaryngology','Ear, nose, throat, sinus and hearing','Ear','{ear,nose,throat,ent,sinus,hearing,tonsils,vertigo,snoring,cold,voice}',8),
('gynecology','Gynecology','Gynecology & Obstetrics','Women''s health, pregnancy and fertility','Flower2','{women,gynecology,gynecologist,pregnancy,pregnant,obstetrics,period,pcos,fertility,menstrual,maternity}',9),
('general-medicine','General Medicine','Internal Medicine','Fever, diabetes, infections and general health','Stethoscope','{general,physician,fever,diabetes,sugar,thyroid,infection,cough,cold,weakness,general medicine,internal medicine,body pain}',10),
('oncology','Oncology','Medical Oncology','Cancer screening, diagnosis and treatment','Ribbon','{cancer,oncology,oncologist,tumour,tumor,chemotherapy,lump,biopsy,screening}',11),
('gastroenterology','Gastroenterology','Gastroenterology','Stomach, liver and digestive care','Pill','{stomach,gastro,gastroenterology,gastroenterologist,liver,digestion,acidity,ulcer,gas,constipation,piles,endoscopy}',12);

INSERT INTO public.hospitals (slug,name,city,address,phone,rating,reviews_count,image_url,about,emergency,established,beds,departments,services,facilities,featured) VALUES
('apollo-hospitals-chennai','Apollo Hospitals','Chennai','21 Greams Lane, Off Greams Road, Chennai 600006','+91 44 2829 3333',4.8,12480,'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=70','A multi-specialty tertiary care hospital known for cardiac sciences, transplants and preventive health programmes.',true,1983,560,'{Cardiology,Ophthalmology,Orthopedics,Neurology,Oncology,General Medicine}','{"24x7 Emergency","Diagnostic Imaging","Pharmacy","Health Checkups","Ambulance"}','{Parking,Cafeteria,"Wheelchair Access",ATM,"In-house Lab"}',true),
('fortis-hospital-bengaluru','Fortis Hospital','Bengaluru','154/9 Bannerghatta Road, Bengaluru 560076','+91 80 6621 4444',4.7,9840,'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=70','Advanced care hospital with strong cardiac, neuro and orthopedic programmes serving South Bengaluru.',true,2006,400,'{Cardiology,Neurology,Orthopedics,Gastroenterology,Pediatrics}','{"24x7 Emergency","Cath Lab","Physiotherapy","Health Checkups"}','{Parking,Cafeteria,"Wheelchair Access","In-house Lab"}',true),
('max-super-speciality-delhi','Max Super Speciality Hospital','New Delhi','1 2 Press Enclave Road, Saket, New Delhi 110017','+91 11 2651 5050',4.6,8620,'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=70','Super speciality hospital offering oncology, transplant and critical care with modern diagnostics.',true,2006,530,'{Oncology,Cardiology,Neurology,Dermatology,ENT}','{"24x7 Emergency","Cancer Care","Radiology","Health Checkups"}','{Parking,Cafeteria,Pharmacy,"Wheelchair Access"}',true),
('manipal-hospital-bengaluru','Manipal Hospital','Bengaluru','98 HAL Airport Road, Bengaluru 560017','+91 80 2502 4444',4.6,7310,'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=70','Trusted multi-speciality hospital with a large outpatient network and preventive health packages.',true,1991,600,'{"General Medicine",Orthopedics,Gynecology,Pediatrics,Dentistry}','{"24x7 Emergency","Maternity Care","Vaccination","Health Checkups"}','{Parking,Cafeteria,"Wheelchair Access",ATM}',true),
('kokilaben-hospital-mumbai','Kokilaben Dhirubhai Ambani Hospital','Mumbai','Rao Saheb Achutrao Patwardhan Marg, Andheri West, Mumbai 400053','+91 22 3099 9999',4.8,11250,'https://images.unsplash.com/photo-1580281658223-9b93f18ae9ae?auto=format&fit=crop&w=1200&q=70','Quaternary care hospital with robotic surgery, neurosciences and a dedicated cancer centre.',true,2009,750,'{Neurology,Oncology,Cardiology,Gastroenterology,Ophthalmology}','{"24x7 Emergency","Robotic Surgery","Advanced Imaging","Health Checkups"}','{Parking,Cafeteria,Pharmacy,"Wheelchair Access","In-house Lab"}',true),
('aiims-delhi','AIIMS','New Delhi','Ansari Nagar East, New Delhi 110029','+91 11 2658 8500',4.5,20140,'https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=1200&q=70','Premier public medical institute offering the full spectrum of specialities and research-led care.',true,1956,2500,'{"General Medicine",Neurology,Oncology,Pediatrics,ENT,Ophthalmology}','{"24x7 Emergency","Trauma Centre","Research Programs","Diagnostics"}','{Pharmacy,"Wheelchair Access","In-house Lab"}',false),
('narayana-health-city-bengaluru','Narayana Health City','Bengaluru','258/A Bommasandra Industrial Area, Hosur Road, Bengaluru 560099','+91 80 7122 2222',4.5,6480,'https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=1200&q=70','High-volume cardiac care campus with affordable surgical programmes and preventive screening.',true,2000,1500,'{Cardiology,Orthopedics,"General Medicine",Gastroenterology}','{"24x7 Emergency","Cardiac Surgery","Health Checkups","Dialysis"}','{Parking,Cafeteria,Pharmacy}',false),
('medanta-gurugram','Medanta - The Medicity','Gurugram','CH Baktawar Singh Road, Sector 38, Gurugram 122001','+91 124 414 1414',4.7,8950,'https://images.unsplash.com/photo-1519494080410-f9aa76cb4283?auto=format&fit=crop&w=1200&q=70','Multi-super-speciality institute known for heart, liver and neurosciences institutes.',true,2009,1250,'{Cardiology,Gastroenterology,Neurology,Orthopedics,Oncology}','{"24x7 Emergency","Liver Transplant","Advanced Imaging","Health Checkups"}','{Parking,Cafeteria,Pharmacy,"Wheelchair Access",ATM}',true),
('rainbow-childrens-hyderabad','Rainbow Children''s Hospital','Hyderabad','22 Road No 10, Banjara Hills, Hyderabad 500034','+91 40 4466 5555',4.7,5320,'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1200&q=70','Dedicated paediatric and perinatal hospital with neonatal intensive care and child development services.',true,1999,250,'{Pediatrics,Gynecology,"General Medicine"}','{"24x7 Emergency","NICU","Vaccination","Child Development"}','{Parking,Cafeteria,"Play Area","Wheelchair Access"}',false),
('sankara-nethralaya-chennai','Sankara Nethralaya','Chennai','18 College Road, Nungambakkam, Chennai 600006','+91 44 2827 1616',4.9,7890,'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=70','Renowned eye care institute offering cataract, retina, cornea and paediatric ophthalmology services.',false,1978,180,'{Ophthalmology}','{"Cataract Surgery","Retina Clinic","LASIK","Eye Checkups"}','{Parking,Pharmacy,"Wheelchair Access","Optical Store"}',true);

INSERT INTO public.doctors (slug,name,specialty_id,hospital_id,qualification,experience_years,rating,reviews_count,fee,gender,city,photo_url,about,languages,education,expertise,services,consultation_types,available_today,featured)
SELECT d.slug, d.name, s.id, h.id, d.qualification, d.exp, d.rating, d.reviews, d.fee, d.gender, h.city, d.photo,
  'Dr. ' || split_part(d.name,' ',2) || ' is a ' || s.medical_name || ' specialist at ' || h.name || ' with ' || d.exp || ' years of clinical experience. Known for a patient-first approach, careful diagnosis and clear explanations.',
  d.langs::text[], d.edu::text[], d.exper::text[], d.serv::text[], d.ctypes::text[], d.today, d.featured
FROM (VALUES
('dr-ananya-sharma','Dr. Ananya Sharma','eye-care','apollo-hospitals-chennai','MBBS, MS (Ophthalmology)',15,4.8,412,1000,'Female','https://randomuser.me/api/portraits/women/44.jpg','{English,Hindi,Tamil}','{"MBBS - Madras Medical College","MS Ophthalmology - AIIMS Delhi"}','{Cataract Surgery,"Retina Care",LASIK,Glaucoma}','{"Eye Checkup","Cataract Surgery","Diabetic Retinopathy Screening"}','{In-clinic,Video}',true,true),
('dr-rahul-menon','Dr. Rahul Menon','eye-care','sankara-nethralaya-chennai','MBBS, MS, FRCS',18,4.9,530,1200,'Male','https://randomuser.me/api/portraits/men/32.jpg','{English,Malayalam,Tamil}','{"MBBS - JIPMER","FRCS - Glasgow"}','{"Corneal Transplant",LASIK,"Paediatric Eye Care"}','{"LASIK Consultation","Cornea Clinic"}','{In-clinic}',true,true),
('dr-priya-nair','Dr. Priya Nair','eye-care','kokilaben-hospital-mumbai','MBBS, DNB (Ophthalmology)',10,4.6,238,900,'Female','https://randomuser.me/api/portraits/women/68.jpg','{English,Hindi,Marathi}','{"MBBS - Grant Medical College","DNB Ophthalmology"}','{"Squint Correction","Dry Eye","Vision Correction"}','{"Eye Checkup","Squint Clinic"}','{In-clinic,Video}',false,false),
('dr-vikram-iyer','Dr. Vikram Iyer','cardiology','apollo-hospitals-chennai','MBBS, MD, DM (Cardiology)',22,4.9,780,1500,'Male','https://randomuser.me/api/portraits/men/45.jpg','{English,Tamil,Hindi}','{"MBBS - CMC Vellore","DM Cardiology - AIIMS"}','{Angioplasty,"Heart Failure","Preventive Cardiology"}','{"ECG & Echo","Angioplasty","Cardiac Consultation"}','{In-clinic,Video}',true,true),
('dr-sneha-kulkarni','Dr. Sneha Kulkarni','cardiology','fortis-hospital-bengaluru','MBBS, MD, DM',14,4.7,455,1300,'Female','https://randomuser.me/api/portraits/women/12.jpg','{English,Kannada,Marathi}','{"MBBS - KEM Mumbai","DM Cardiology - NIMHANS"}','{"Womens Heart Health",Arrhythmia,Hypertension}','{"Heart Screening","Holter Monitoring"}','{In-clinic,Video}',true,true),
('dr-arjun-reddy','Dr. Arjun Reddy','cardiology','medanta-gurugram','MBBS, MD, DM',19,4.8,610,1600,'Male','https://randomuser.me/api/portraits/men/62.jpg','{English,Hindi,Telugu}','{"MBBS - Osmania","DM Cardiology - PGIMER"}','{"Interventional Cardiology","Valve Disease"}','{"Cardiac Consultation","Stress Test"}','{In-clinic}',true,false),
('dr-kavya-desai','Dr. Kavya Desai','cardiology','narayana-health-city-bengaluru','MBBS, MD',9,4.5,190,800,'Female','https://randomuser.me/api/portraits/women/24.jpg','{English,Kannada,Hindi}','{"MBBS - St Johns Bengaluru","MD Medicine"}','{"Preventive Cardiology",Cholesterol}','{"Heart Health Consultation"}','{In-clinic,Video}',true,false),
('dr-neha-gupta','Dr. Neha Gupta','dermatology','max-super-speciality-delhi','MBBS, MD (Dermatology)',12,4.8,690,1100,'Female','https://randomuser.me/api/portraits/women/33.jpg','{English,Hindi}','{"MBBS - Lady Hardinge","MD Dermatology - AIIMS"}','{"Acne & Scars","Hair Loss","Cosmetic Dermatology"}','{"Skin Consultation","Hair Treatment","Chemical Peel"}','{In-clinic,Video}',true,true),
('dr-imran-khan','Dr. Imran Khan','dermatology','kokilaben-hospital-mumbai','MBBS, DDVL',8,4.6,320,950,'Male','https://randomuser.me/api/portraits/men/22.jpg','{English,Hindi,Urdu}','{"MBBS - Seth GS","DDVL - Mumbai"}','{Psoriasis,Eczema,"Skin Allergy"}','{"Skin Consultation","Allergy Testing"}','{In-clinic,Video}',true,false),
('dr-ritu-agarwal','Dr. Ritu Agarwal','dermatology','fortis-hospital-bengaluru','MBBS, MD',16,4.7,410,1200,'Female','https://randomuser.me/api/portraits/women/50.jpg','{English,Hindi,Kannada}','{"MBBS - Bangalore Medical College","MD Dermatology"}','{"Laser Treatments",Pigmentation,"Hair Transplant"}','{"Laser Clinic","Skin Consultation"}','{In-clinic}',false,false),
('dr-sanjay-verma','Dr. Sanjay Verma','dentistry','manipal-hospital-bengaluru','BDS, MDS (Prosthodontics)',13,4.7,375,600,'Male','https://randomuser.me/api/portraits/men/54.jpg','{English,Hindi,Kannada}','{"BDS - Manipal","MDS Prosthodontics"}','{Implants,"Crowns & Bridges","Smile Design"}','{"Dental Implants","Teeth Cleaning","Root Canal"}','{In-clinic}',true,true),
('dr-meera-joshi','Dr. Meera Joshi','dentistry','max-super-speciality-delhi','BDS, MDS (Orthodontics)',11,4.8,290,700,'Female','https://randomuser.me/api/portraits/women/65.jpg','{English,Hindi}','{"BDS - Delhi","MDS Orthodontics"}','{Braces,Aligners,"Paediatric Dentistry"}','{"Braces Consultation","Aligner Treatment"}','{In-clinic,Video}',true,false),
('dr-nikhil-rao','Dr. Nikhil Rao','dentistry','apollo-hospitals-chennai','BDS',6,4.4,120,500,'Male','https://randomuser.me/api/portraits/men/76.jpg','{English,Tamil,Telugu}','{"BDS - Ragas Dental College"}','{"Root Canal",Extraction,Whitening}','{"Dental Checkup","Root Canal"}','{In-clinic}',true,false),
('dr-suresh-pillai','Dr. Suresh Pillai','orthopedics','fortis-hospital-bengaluru','MBBS, MS (Ortho)',20,4.8,540,1200,'Male','https://randomuser.me/api/portraits/men/13.jpg','{English,Malayalam,Kannada}','{"MBBS - Kottayam","MS Orthopedics - CMC"}','{"Knee Replacement","Sports Injury",Arthroscopy}','{"Joint Replacement","Sports Injury Clinic"}','{In-clinic,Video}',true,true),
('dr-anita-bose','Dr. Anita Bose','orthopedics','medanta-gurugram','MBBS, MS, Fellowship Spine',15,4.7,360,1400,'Female','https://randomuser.me/api/portraits/women/72.jpg','{English,Hindi,Bengali}','{"MBBS - Kolkata Medical College","Spine Fellowship - Germany"}','{"Spine Surgery","Back Pain",Scoliosis}','{"Spine Clinic","Back Pain Consultation"}','{In-clinic}',false,false),
('dr-harish-chandra','Dr. Harish Chandra','orthopedics','narayana-health-city-bengaluru','MBBS, DNB (Ortho)',10,4.5,210,900,'Male','https://randomuser.me/api/portraits/men/85.jpg','{English,Hindi,Kannada}','{"MBBS - Mysore","DNB Orthopedics"}','{"Fracture Care",Arthritis,Physiotherapy}','{"Fracture Clinic","Arthritis Care"}','{In-clinic,Video}',true,false),
('dr-latha-subramanian','Dr. Latha Subramanian','orthopedics','apollo-hospitals-chennai','MBBS, MS (Ortho)',17,4.6,280,1100,'Female','https://randomuser.me/api/portraits/women/90.jpg','{English,Tamil}','{"MBBS - Stanley Medical College","MS Orthopedics"}','{"Shoulder Surgery","Hand Surgery"}','{"Shoulder Clinic","Orthopedic Consultation"}','{In-clinic}',true,false),
('dr-rohan-mehta','Dr. Rohan Mehta','neurology','kokilaben-hospital-mumbai','MBBS, MD, DM (Neurology)',18,4.9,620,1500,'Male','https://randomuser.me/api/portraits/men/40.jpg','{English,Hindi,Gujarati}','{"MBBS - KEM Mumbai","DM Neurology - NIMHANS"}','{Stroke,Epilepsy,"Movement Disorders"}','{"Stroke Clinic","EEG","Neurology Consultation"}','{In-clinic,Video}',true,true),
('dr-shalini-rao','Dr. Shalini Rao','neurology','max-super-speciality-delhi','MBBS, DM',12,4.7,340,1300,'Female','https://randomuser.me/api/portraits/women/28.jpg','{English,Hindi}','{"MBBS - Maulana Azad","DM Neurology - AIIMS"}','{Migraine,Headache,"Multiple Sclerosis"}','{"Headache Clinic","Neurology Consultation"}','{In-clinic,Video}',true,false),
('dr-tarun-bhatt','Dr. Tarun Bhatt','neurology','medanta-gurugram','MBBS, MD, DM',14,4.6,275,1400,'Male','https://randomuser.me/api/portraits/men/29.jpg','{English,Hindi}','{"MBBS - PGIMER","DM Neurology"}','{Parkinsons,Dementia,Neuropathy}','{"Memory Clinic","Neurology Consultation"}','{In-clinic}',false,false),
('dr-divya-menon','Dr. Divya Menon','pediatrics','rainbow-childrens-hyderabad','MBBS, MD (Pediatrics)',13,4.9,880,800,'Female','https://randomuser.me/api/portraits/women/17.jpg','{English,Telugu,Malayalam}','{"MBBS - Osmania","MD Pediatrics - CMC Vellore"}','{"Newborn Care",Vaccination,"Child Nutrition"}','{"Child Checkup",Vaccination,"Growth Monitoring"}','{In-clinic,Video}',true,true),
('dr-akash-jain','Dr. Akash Jain','pediatrics','manipal-hospital-bengaluru','MBBS, DNB (Pediatrics)',9,4.6,310,700,'Male','https://randomuser.me/api/portraits/men/91.jpg','{English,Hindi,Kannada}','{"MBBS - JSS Mysore","DNB Pediatrics"}','{"Child Allergy",Asthma,"Fever Management"}','{"Child Consultation","Asthma Clinic"}','{In-clinic,Video}',true,false),
('dr-pooja-shetty','Dr. Pooja Shetty','pediatrics','aiims-delhi','MBBS, MD',7,4.5,160,400,'Female','https://randomuser.me/api/portraits/women/81.jpg','{English,Hindi}','{"MBBS - AIIMS","MD Pediatrics - AIIMS"}','{"Neonatal Care",Immunisation}','{"Child Consultation",Immunisation}','{In-clinic}',true,false),
('dr-manish-tiwari','Dr. Manish Tiwari','ent','max-super-speciality-delhi','MBBS, MS (ENT)',16,4.7,420,900,'Male','https://randomuser.me/api/portraits/men/60.jpg','{English,Hindi}','{"MBBS - KGMU Lucknow","MS ENT"}','{"Sinus Surgery","Hearing Loss","Sleep Apnoea"}','{"ENT Consultation","Hearing Test","Sinus Clinic"}','{In-clinic,Video}',true,true),
('dr-swati-patel','Dr. Swati Patel','ent','aiims-delhi','MBBS, MS',11,4.6,230,500,'Female','https://randomuser.me/api/portraits/women/57.jpg','{English,Hindi,Gujarati}','{"MBBS - BJ Medical Ahmedabad","MS ENT - AIIMS"}','{Vertigo,Tonsillitis,"Voice Disorders"}','{"ENT Consultation","Vertigo Clinic"}','{In-clinic}',true,false),
('dr-ganesh-kumar','Dr. Ganesh Kumar','ent','apollo-hospitals-chennai','MBBS, DLO, DNB',14,4.5,205,850,'Male','https://randomuser.me/api/portraits/men/8.jpg','{English,Tamil}','{"MBBS - Madras Medical College","DNB ENT"}','{"Ear Surgery","Nasal Allergy"}','{"ENT Consultation","Ear Surgery"}','{In-clinic,Video}',false,false),
('dr-radhika-sinha','Dr. Radhika Sinha','gynecology','manipal-hospital-bengaluru','MBBS, MS (OBG)',19,4.9,910,1000,'Female','https://randomuser.me/api/portraits/women/9.jpg','{English,Hindi,Kannada}','{"MBBS - AFMC Pune","MS Obstetrics & Gynaecology"}','{"High-risk Pregnancy",PCOS,Infertility}','{"Antenatal Care","PCOS Clinic","Fertility Consultation"}','{In-clinic,Video}',true,true),
('dr-fatima-ansari','Dr. Fatima Ansari','gynecology','rainbow-childrens-hyderabad','MBBS, DGO, DNB',12,4.7,430,900,'Female','https://randomuser.me/api/portraits/women/37.jpg','{English,Hindi,Telugu,Urdu}','{"MBBS - Deccan College","DNB Obstetrics"}','{"Maternity Care","Menstrual Disorders"}','{"Pregnancy Care","Gynae Consultation"}','{In-clinic,Video}',true,false),
('dr-alka-mishra','Dr. Alka Mishra','gynecology','medanta-gurugram','MBBS, MD (OBG)',15,4.6,350,1200,'Female','https://randomuser.me/api/portraits/women/55.jpg','{English,Hindi}','{"MBBS - KGMU","MD Obstetrics & Gynaecology"}','{"Laparoscopic Surgery",Menopause}','{"Gynae Surgery","Menopause Clinic"}','{In-clinic}',false,false),
('dr-ramesh-babu','Dr. Ramesh Babu','general-medicine','narayana-health-city-bengaluru','MBBS, MD (Internal Medicine)',21,4.7,660,600,'Male','https://randomuser.me/api/portraits/men/36.jpg','{English,Kannada,Telugu,Hindi}','{"MBBS - Kurnool Medical College","MD Internal Medicine"}','{Diabetes,Thyroid,Hypertension}','{"Diabetes Clinic","General Consultation","Health Checkup"}','{In-clinic,Video}',true,true),
('dr-sunita-rani','Dr. Sunita Rani','general-medicine','aiims-delhi','MBBS, MD',10,4.5,240,400,'Female','https://randomuser.me/api/portraits/women/26.jpg','{English,Hindi,Punjabi}','{"MBBS - GMC Amritsar","MD Medicine - AIIMS"}','{"Infectious Disease",Fever,Anaemia}','{"General Consultation","Fever Clinic"}','{In-clinic,Video}',true,false),
('dr-abhishek-das','Dr. Abhishek Das','general-medicine','fortis-hospital-bengaluru','MBBS, MD',8,4.4,175,700,'Male','https://randomuser.me/api/portraits/men/18.jpg','{English,Hindi,Bengali}','{"MBBS - NRS Kolkata","MD Medicine"}','{"Lifestyle Disease","Preventive Health"}','{"General Consultation","Annual Health Review"}','{In-clinic,Video}',true,false),
('dr-veena-krishnan','Dr. Veena Krishnan','general-medicine','apollo-hospitals-chennai','MBBS, MD',17,4.6,390,800,'Female','https://randomuser.me/api/portraits/women/79.jpg','{English,Tamil,Hindi}','{"MBBS - Madras Medical College","MD General Medicine"}','{Diabetes,"Geriatric Care"}','{"Diabetes Clinic","Senior Health"}','{In-clinic}',true,false),
('dr-sameer-qureshi','Dr. Sameer Qureshi','oncology','max-super-speciality-delhi','MBBS, MD, DM (Oncology)',20,4.8,510,1800,'Male','https://randomuser.me/api/portraits/men/70.jpg','{English,Hindi,Urdu}','{"MBBS - AMU","DM Medical Oncology - Tata Memorial"}','{Chemotherapy,"Breast Cancer",Immunotherapy}','{"Oncology Consultation",Chemotherapy,"Cancer Screening"}','{In-clinic}',true,true),
('dr-nandini-roy','Dr. Nandini Roy','oncology','kokilaben-hospital-mumbai','MBBS, MD, DM',13,4.7,300,1700,'Female','https://randomuser.me/api/portraits/women/20.jpg','{English,Hindi,Bengali}','{"MBBS - Calcutta National","DM Oncology - Tata Memorial"}','{"Gynae Oncology","Targeted Therapy"}','{"Cancer Screening","Oncology Consultation"}','{In-clinic,Video}',true,false),
('dr-praveen-nair','Dr. Praveen Nair','oncology','aiims-delhi','MBBS, MD, DM',11,4.5,180,600,'Male','https://randomuser.me/api/portraits/men/47.jpg','{English,Hindi,Malayalam}','{"MBBS - Trivandrum","DM Oncology - AIIMS"}','{"Head & Neck Cancer",Palliative}','{"Oncology Consultation","Palliative Care"}','{In-clinic}',false,false),
('dr-ashok-pandey','Dr. Ashok Pandey','gastroenterology','medanta-gurugram','MBBS, MD, DM (Gastro)',18,4.8,470,1500,'Male','https://randomuser.me/api/portraits/men/52.jpg','{English,Hindi}','{"MBBS - BHU","DM Gastroenterology - PGIMER"}','{Endoscopy,"Liver Disease",IBS}','{Endoscopy,"Liver Clinic","Gastro Consultation"}','{In-clinic,Video}',true,true),
('dr-jyoti-saxena','Dr. Jyoti Saxena','gastroenterology','fortis-hospital-bengaluru','MBBS, MD, DNB',12,4.6,260,1200,'Female','https://randomuser.me/api/portraits/women/61.jpg','{English,Hindi,Kannada}','{"MBBS - Jaipur","DNB Gastroenterology"}','{Acidity,"Colon Health",Colonoscopy}','{Colonoscopy,"Gastro Consultation"}','{In-clinic,Video}',true,false),
('dr-mohan-krishnan','Dr. Mohan Krishnan','gastroenterology','narayana-health-city-bengaluru','MBBS, MD, DM',9,4.4,150,1000,'Male','https://randomuser.me/api/portraits/men/94.jpg','{English,Tamil,Kannada}','{"MBBS - Coimbatore","DM Gastroenterology"}','{"Peptic Ulcer",Piles,Constipation}','{"Gastro Consultation","Endoscopy"}','{In-clinic}',true,false),
('dr-farhan-siddiqui','Dr. Farhan Siddiqui','gastroenterology','kokilaben-hospital-mumbai','MBBS, MD, DM',16,4.7,330,1600,'Male','https://randomuser.me/api/portraits/men/64.jpg','{English,Hindi,Marathi}','{"MBBS - Grant Medical College","DM Gastroenterology"}','{"Fatty Liver",Pancreatitis,ERCP}','{"Liver Clinic",ERCP}','{In-clinic,Video}',true,false)
) AS d(slug,name,spec_slug,hosp_slug,qualification,exp,rating,reviews,fee,gender,photo,langs,edu,exper,serv,ctypes,today,featured)
JOIN public.specialties s ON s.slug = d.spec_slug
JOIN public.hospitals h ON h.slug = d.hosp_slug;

INSERT INTO public.health_packages (slug,name,hospital_id,price,discounted_price,description,tests,services,duration,eligibility,category,city,image_url,featured)
SELECT p.slug,p.name,h.id,p.price,p.disc,p.descr,p.tests::text[],p.serv::text[],p.dur,p.elig,p.cat,h.city,p.img,p.featured
FROM (VALUES
('apollo-preventive-health-check','Apollo Preventive Health Check','apollo-hospitals-chennai',4999,3499,'A complete preventive screening covering blood, heart and organ function with a doctor consultation.','{"Complete Blood Count","Blood Sugar (Fasting)","Lipid Profile","Liver Function Test","Kidney Function Test",ECG,"Chest X-Ray","Urine Routine"}','{"Doctor Consultation","General Health Assessment","Diet Counselling","Digital Report"}','3-4 hours','Adults 18 years and above','Preventive','https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1200&q=70',true),
('apollo-full-body-master-check','Full Body Master Health Checkup','apollo-hospitals-chennai',8999,6299,'Our most comprehensive whole-body screening with advanced imaging and specialist review.','{"Complete Blood Count","HbA1c","Thyroid Profile","Lipid Profile","Liver Function Test","Kidney Function Test","Vitamin D","Vitamin B12",ECG,"2D Echo","Ultrasound Abdomen","Chest X-Ray"}','{"Physician Consultation","Specialist Review","Diet Plan","Digital Report"}','5-6 hours','Adults 25 years and above','Comprehensive','https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&w=1200&q=70',true),
('fortis-heart-screening','Fortis Advanced Heart Screening','fortis-hospital-bengaluru',6499,4499,'A focused cardiac risk assessment with treadmill test and cardiologist consultation.','{ECG,"2D Echo","Treadmill Test","Lipid Profile","Blood Sugar",hs-CRP,"Chest X-Ray"}','{"Cardiologist Consultation","Risk Score Report","Lifestyle Counselling"}','4 hours','Adults 30 years and above','Cardiac','https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?auto=format&fit=crop&w=1200&q=70',true),
('fortis-diabetes-care','Diabetes Care Package','fortis-hospital-bengaluru',3499,2399,'Screening and management plan for people with diabetes or high blood sugar risk.','{"Fasting Blood Sugar","Post Prandial Sugar",HbA1c,"Kidney Function Test","Urine Microalbumin","Eye Screening"}','{"Physician Consultation","Diabetic Diet Plan","Foot Care Assessment"}','2-3 hours','Adults with diabetes or family history','Chronic Care','https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=70',false),
('max-womens-wellness','Women''s Wellness Package','max-super-speciality-delhi',5999,4199,'A women-focused health review covering hormones, bone health and cancer screening.','{"Complete Blood Count","Thyroid Profile","Vitamin D","Calcium",Ultrasound Pelvis,"Pap Smear","Mammography (40+)"}','{"Gynaecologist Consultation","Nutrition Counselling","Digital Report"}','4 hours','Women 21 years and above','Women','https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1200&q=70',true),
('max-cancer-screening','Cancer Screening Package','max-super-speciality-delhi',9999,7499,'Early detection screening for the most common cancers with oncologist review.','{"Tumour Markers","Chest X-Ray","Ultrasound Abdomen","Pap Smear","Mammography","Complete Blood Count"}','{"Oncologist Consultation","Risk Assessment","Digital Report"}','5 hours','Adults 40 years and above','Oncology','https://images.unsplash.com/photo-1576671081837-49000212a370?auto=format&fit=crop&w=1200&q=70',false),
('manipal-senior-citizen','Senior Citizen Health Package','manipal-hospital-bengaluru',5499,3899,'Designed for adults above 60 with bone, heart, vision and cognition screening.','{"Complete Blood Count","Blood Sugar","Lipid Profile","Kidney Function Test","Bone Density",ECG,"Eye Checkup"}','{"Physician Consultation","Physiotherapy Assessment","Diet Plan"}','4 hours','Adults 60 years and above','Senior','https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=1200&q=70',false),
('manipal-basic-health','Basic Health Checkup','manipal-hospital-bengaluru',1999,1299,'An affordable annual health snapshot with the essential tests and a doctor review.','{"Complete Blood Count","Blood Sugar","Lipid Profile","Urine Routine",ECG}','{"Doctor Consultation","Digital Report"}','2 hours','Adults 18 years and above','Preventive','https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=70',true),
('kokilaben-executive-health','Executive Health Programme','kokilaben-hospital-mumbai',12999,9499,'A premium executive screening with advanced imaging and same-day specialist consults.','{"Complete Blood Count","Full Biochemistry","Thyroid Profile","Cardiac Markers","Treadmill Test","Ultrasound Abdomen","CT Chest (low dose)","Pulmonary Function Test"}','{"Physician Consultation","Two Specialist Consults","Personal Health Report","Priority Scheduling"}','Full day','Adults 30 years and above','Executive','https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=1200&q=70',true),
('kokilaben-liver-checkup','Liver Health Checkup','kokilaben-hospital-mumbai',4499,3199,'Detailed liver assessment including fibroscan and gastroenterologist review.','{"Liver Function Test","Hepatitis B & C Screening","Ultrasound Abdomen",Fibroscan,"Complete Blood Count"}','{"Gastroenterologist Consultation","Diet Counselling"}','3 hours','Adults 18 years and above','Chronic Care','https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=1200&q=70',false),
('medanta-neuro-checkup','Brain & Nerve Health Checkup','medanta-gurugram',7499,5499,'Neurological screening with imaging for headaches, memory concerns and stroke risk.','{"MRI Brain (plain)",EEG,"Carotid Doppler","Complete Blood Count","Lipid Profile"}','{"Neurologist Consultation","Cognitive Assessment","Digital Report"}','5 hours','Adults 35 years and above','Neuro','https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=70',false),
('sankara-complete-eye-check','Complete Eye Health Check','sankara-nethralaya-chennai',2499,1699,'A full vision and eye health evaluation including retina and glaucoma screening.','{"Vision Test","Refraction Test","Intraocular Pressure","Retina Examination","Corneal Topography","Dry Eye Assessment"}','{"Ophthalmologist Consultation","Spectacle Prescription","Digital Report"}','2 hours','All ages','Eye','https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=1200&q=70',true)
) AS p(slug,name,hosp_slug,price,disc,descr,tests,serv,dur,elig,cat,img,featured)
JOIN public.hospitals h ON h.slug = p.hosp_slug;

INSERT INTO public.subscription_plans (slug,name,price,period,tagline,discount_percent,benefits,featured,sort_order) VALUES
('care','cityhealth Care',999,'year','Everyday savings for individuals',10,'{"10% off all health packages","2 free online consultations","Priority appointment slots","Digital health record vault","Email appointment reminders"}',false,1),
('care-plus','cityhealth Care+',2499,'year','Best value for regular care',20,'{"20% off all health packages","6 free online consultations","Priority appointment slots at all hospitals","Free annual basic health checkup","Add up to 3 family members","24x7 AI health assistant priority"}',true,2),
('family','cityhealth Family',4499,'year','Cover the whole household',25,'{"25% off all health packages","Unlimited online consultations","Add up to 6 family members","Two free annual health checkups","Dedicated care coordinator","Emergency ambulance assistance"}',false,3);