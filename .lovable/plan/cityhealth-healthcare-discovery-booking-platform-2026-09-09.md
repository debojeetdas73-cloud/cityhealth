# cityhealth — Healthcare Discovery & Booking Platform

A premium healthcare platform: find doctors, hospitals and health packages, book appointments with a demo-only payment flow, manage a subscription, chat with an AI health assistant, and administer everything from an admin area.

## Look and feel

- Palette: white base, deep navy text (#0B2545), teal accent (#0E7C7B), soft mint surfaces (#E6F4F1).
- Fonts: Sora for headings, Manrope for body.
- Clean rounded cards, subtle shadows, gentle hover/fade motion. No heavy gradients, no clutter.

## Accounts and data

Real accounts and a real database. Patients sign up and log in; appointments, packages, subscriptions, family members and demo payments are saved to their account. Admins get a separate role with access to the admin area.

## Pages

Public
- Home: hero with the universal search, specialty grid, top hospitals, recommended doctors, health packages, subscription, AI assistant, how it works, why cityhealth, FAQ, footer.
- Search results: combined doctors/hospitals/packages results with filters (location, specialty, hospital, availability, fee, experience, rating, consultation type, gender) and sorting.
- Doctor profile: full profile, calendar, time slots, related doctors.
- Hospital profile: departments, doctors, services, facilities, hours, emergency info, packages, placeholder map.
- Health packages list and package detail.
- Subscription plans page.
- Login / Sign up.

Patient (signed in)
- Booking flow: doctor → date → slot → patient details (self or family member) → summary → demo payment → confirmation with booking + transaction IDs, download and add-to-calendar.
- My Appointments: upcoming / completed / cancelled, with view, reschedule, cancel (confirmation required).
- Dashboard: next appointment, subscription status, booked packages, quick actions.
- My Health: records, family members.
- Subscription dashboard: plan, benefits, member discount on packages, renew/cancel.
- AI Assistant chat.

Admin
- Overview with key metrics and search analytics (top searched specialties).
- Manage hospitals, doctors, appointments, health packages, subscriptions, users, payments.

## Universal search

One search box understands plain language and synonyms: "eye" → ophthalmology/eye specialists/eye hospitals, "I need a skin doctor" → dermatologists, "full body checkup" → health packages, "Apollo Hospital" → that hospital and its doctors. Matching runs against specialties, symptom keywords, doctor names, hospital names and package names, then routes to a results page with the right filter pre-applied. Specialty cards on the home page open results pre-filtered.

## AI assistant

A real AI assistant (Lovable AI) that understands free text, suggests the likely specialty, recommends doctors, hospitals and packages from the live database, and answers subscription questions. It always shows a medical disclaimer, never diagnoses or prescribes, and directs emergencies to emergency services.

## Payments — demo only

No real payment gateway of any kind. The payment screen is clearly labelled "Demo Payment — no real money will be charged", offers demo UPI / card / net banking as UI only, never collects real card, CVV, PIN or bank credentials, simulates processing, and produces success or failure states with demo transaction IDs (e.g. DEMO-TXN-7F29A8). Successful demo payments confirm the appointment or package booking. The same demo flow covers subscription purchase.

## Data seeded at launch

Realistic demo content so every screen is populated: ~12 specialties, ~10 hospitals across Indian cities, ~40 doctors with photos, fees, ratings, experience and slots, ~12 health packages, 3 subscription plans, plus demo patient and admin accounts.

## Technical notes

- React + TypeScript + Tailwind on TanStack Start; reusable component library, responsive throughout, loading/empty/error states everywhere.
- Database tables: profiles, user_roles, specialties, hospitals, doctors, doctor_slots, appointments, patients/family_members, health_packages, package_bookings, subscription_plans, subscriptions, payments, chat_conversations, chat_messages, search_logs. Row-level security on all user data; roles in a separate table with a security-definer check.
- Data access goes through a typed service layer so a Java Spring Boot REST backend can replace it later with minimal changes; a suggested REST endpoint map is documented in the repo.
- AI chat runs server-side through Lovable AI with the assistant's tools reading the live doctor/hospital/package data.
- Search analytics recorded on each search to power the admin analytics view.

## Build order

1. Design system, layout, navigation, footer, seeded database and auth.
2. Home page and universal search + results.
3. Doctor and hospital profiles.
4. Booking flow with demo payment and confirmation.
5. Health packages and package booking.
6. Subscription plans, purchase and dashboard.
7. Patient dashboard, My Appointments, My Health, family members.
8. AI assistant.
9. Admin area and analytics.
