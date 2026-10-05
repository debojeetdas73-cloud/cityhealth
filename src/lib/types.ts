export interface Specialty {
  id: string;
  slug: string;
  name: string;
  medical_name: string;
  description: string;
  icon: string;
  keywords: string[];
  sort_order: number;
}

export interface Hospital {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string | null;
  rating: number;
  reviews_count: number;
  image_url: string | null;
  about: string;
  emergency: boolean;
  established: number | null;
  beds: number | null;
  hours: string;
  departments: string[];
  services: string[];
  facilities: string[];
  featured: boolean;
}

export interface Doctor {
  id: string;
  slug: string;
  name: string;
  specialty_id: string;
  hospital_id: string;
  qualification: string;
  experience_years: number;
  rating: number;
  reviews_count: number;
  fee: number;
  gender: string;
  city: string;
  photo_url: string | null;
  about: string;
  languages: string[];
  education: string[];
  expertise: string[];
  services: string[];
  consultation_types: string[];
  slots: string[];
  available_today: boolean;
  featured: boolean;
  specialty?: Specialty;
  hospital?: Hospital;
}

export interface HealthPackage {
  id: string;
  slug: string;
  name: string;
  hospital_id: string;
  price: number;
  discounted_price: number;
  description: string;
  tests: string[];
  services: string[];
  duration: string;
  eligibility: string;
  category: string;
  city: string;
  image_url: string | null;
  featured: boolean;
  hospital?: Hospital;
}

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  price: number;
  period: string;
  tagline: string;
  discount_percent: number;
  benefits: string[];
  featured: boolean;
  sort_order: number;
}

export interface Appointment {
  id: string;
  user_id: string;
  doctor_id: string;
  hospital_id: string;
  booking_ref: string;
  appointment_date: string;
  appointment_time: string;
  consultation_type: string;
  booking_for: string;
  family_member_id: string | null;
  patient_name: string;
  patient_dob: string | null;
  patient_gender: string | null;
  patient_phone: string;
  patient_email: string | null;
  notes: string | null;
  fee: number;
  discount: number;
  total: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  created_at: string;
  doctor?: Doctor;
  hospital?: Hospital;
}

export interface PackageBooking {
  id: string;
  user_id: string;
  package_id: string;
  hospital_id: string;
  booking_ref: string;
  booking_date: string;
  booking_time: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string | null;
  amount: number;
  discount: number;
  total: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  created_at: string;
  health_package?: HealthPackage;
  hospital?: Hospital;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string;
  plan?: SubscriptionPlan;
}

export interface Payment {
  id: string;
  user_id: string;
  booking_id: string | null;
  payment_type: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id: string;
  payment_status: "pending" | "successful" | "failed" | "refunded";
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  city: string | null;
  avatar_url: string | null;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  full_name: string;
  relation: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  blood_group: string | null;
}

export interface HealthRecord {
  id: string;
  user_id: string;
  title: string;
  record_type: string;
  record_date: string;
  notes: string | null;
}

export interface DoctorFilters {
  specialtySlug?: string;
  hospitalSlug?: string;
  city?: string;
  maxFee?: number;
  minExperience?: number;
  minRating?: number;
  consultationType?: string;
  gender?: string;
  availableToday?: boolean;
  search?: string;
  sort?: string;
}
