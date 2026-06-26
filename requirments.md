# 🧠 STRESS SAVIORS — Master Project Blueprint
> Doctor–Patient Telehealth Platform | Pakistan-wide | Web → Mobile

---

## 📌 PROJECT OVERVIEW

**Stress Saviors** is a full-stack telehealth platform operating across all cities of Pakistan. It connects patients with verified mental health professionals and general doctors via online appointments, video consultations, and chat. Inspired by platforms like Marham.pk, it goes further with real-time scheduling, payment integration, and a robust multi-role admin system.

---

## 🏗️ TECH STACK

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript                                                                      
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod validation
- **Real-time:** Supabase Realtime (channels)
- **Video Calls:** Daily.co or 100ms SDK (WebRTC)
- **Notifications:** react-hot-toast + Supabase Realtime
- **Charts/Analytics:** Recharts

### Backend
- **BaaS:** Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- **API Layer:** Next.js API Routes + Supabase Edge Functions (Deno)
- **Auth:** Supabase Auth (email/password, Google OAuth, Phone OTP)
- **File Storage:** Supabase Storage (doctor documents, profile photos, prescriptions)
- **Emails:** Resend (transactional emails)
- **SMS/OTP:** Twilio or Jazz/Telenor Pakistan SMS gateway
- **Payments:** JazzCash + EasyPaisa + Stripe (international cards)
- **Scheduling:** Custom slot engine on PostgreSQL

### Infrastructure & DevOps
- **Hosting:** Vercel (Next.js) + Supabase Cloud
- **CDN:** Vercel Edge Network
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry (errors) + Vercel Analytics
- **Environment:** `.env.local` → Vercel Environment Variables

### Mobile (Phase 2)
- **Framework:** React Native + Expo
- **Shared logic:** Same Supabase backend, shared TypeScript types

---

## 📁 PROJECT FOLDER STRUCTURE

```
stress-saviors/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Landing page, about, contact
│   │   ├── page.tsx              # Landing/Home
│   │   ├── doctors/page.tsx      # Browse doctors (public)
│   │   └── layout.tsx
│   ├── (auth)/                   # Auth pages
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (patient)/                # Patient dashboard
│   │   ├── dashboard/page.tsx
│   │   ├── appointments/page.tsx
│   │   ├── doctors/page.tsx
│   │   ├── prescriptions/page.tsx
│   │   ├── payments/page.tsx
│   │   ├── profile/page.tsx
│   │   └── layout.tsx
│   ├── (doctor)/                 # Doctor dashboard
│   │   ├── dashboard/page.tsx
│   │   ├── appointments/page.tsx
│   │   ├── patients/page.tsx
│   │   ├── schedule/page.tsx
│   │   ├── earnings/page.tsx
│   │   ├── profile/page.tsx
│   │   └── layout.tsx
│   ├── (admin)/                  # Super Admin dashboard
│   │   ├── dashboard/page.tsx
│   │   ├── doctors/page.tsx      # Approve/reject doctors
│   │   ├── patients/page.tsx
│   │   ├── appointments/page.tsx
│   │   ├── payments/page.tsx
│   │   ├── staff/page.tsx        # Sub-admin management
│   │   ├── reports/page.tsx
│   │   └── layout.tsx
│   └── api/                      # API Routes
│       ├── payments/
│       ├── appointments/
│       ├── notifications/
│       └── webhooks/
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── shared/                   # Shared across roles
│   ├── patient/                  # Patient-specific components
│   ├── doctor/                   # Doctor-specific components
│   └── admin/                    # Admin-specific components
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts
│   ├── validations/              # Zod schemas
│   ├── utils/                    # Helper functions
│   ├── payments/                 # JazzCash, EasyPaisa, Stripe wrappers
│   └── notifications/            # Email + SMS helpers
├── hooks/                        # Custom React hooks
├── store/                        # Zustand stores
├── types/                        # Global TypeScript types
├── supabase/
│   ├── migrations/               # Database migrations (SQL)
│   ├── functions/                # Edge Functions
│   └── seed.sql
├── public/
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 🗄️ DATABASE SCHEMA (Supabase / PostgreSQL)

```sql
-- ENUMS
CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin', 'super_admin');
CREATE TYPE doctor_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled', 'no_show');
CREATE TYPE appointment_type AS ENUM ('video', 'chat', 'in_person');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('jazzcash', 'easypaisa', 'stripe', 'bank_transfer');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');

-- PROFILES (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'patient',
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  city TEXT,
  date_of_birth DATE,
  gender gender,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOCTOR PROFILES
CREATE TABLE doctor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  status doctor_status DEFAULT 'pending',
  specialization TEXT NOT NULL,
  sub_specialization TEXT,
  qualification TEXT[] NOT NULL,          -- ['MBBS', 'FCPS']
  experience_years INT NOT NULL,
  pmdc_number TEXT UNIQUE NOT NULL,       -- Pakistan Medical & Dental Council No.
  bio TEXT,
  consultation_fee NUMERIC(10,2) NOT NULL,
  follow_up_fee NUMERIC(10,2),
  languages TEXT[] DEFAULT ARRAY['Urdu', 'English'],
  cities TEXT[],                          -- Cities where available
  hospital_affiliations TEXT[],
  documents JSONB,                        -- {pmdc_cert, degree, cnic}
  rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  total_consultations INT DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOCTOR AVAILABILITY SLOTS
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES doctor_profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,               -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INT DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- APPOINTMENTS
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES profiles(id),
  doctor_id UUID REFERENCES doctor_profiles(id),
  appointment_type appointment_type NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT DEFAULT 30,
  patient_notes TEXT,
  doctor_notes TEXT,
  prescription_url TEXT,
  video_room_url TEXT,
  consultation_fee NUMERIC(10,2) NOT NULL,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENTS
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID REFERENCES profiles(id),
  doctor_id UUID REFERENCES doctor_profiles(id),
  amount NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) DEFAULT 0,   -- Stress Saviors commission
  doctor_earning NUMERIC(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  transaction_id TEXT UNIQUE,
  gateway_response JSONB,
  refund_id TEXT,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REVIEWS
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID UNIQUE REFERENCES appointments(id),
  patient_id UUID REFERENCES profiles(id),
  doctor_id UUID REFERENCES doctor_profiles(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT,                              -- 'appointment', 'payment', 'system'
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ADMIN STAFF (sub-admins with specific access)
CREATE TABLE admin_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  permissions JSONB NOT NULL,             -- {can_approve_doctors, can_manage_payments, ...}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHAT MESSAGES
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  message TEXT,
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PLATFORM SETTINGS
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 👤 DASHBOARD 1: PATIENT (User)

### Features
- **Register/Login** — Email, Google, Phone OTP
- **Browse Doctors** — Filter by specialization, city, fee, rating, availability
- **Doctor Profile** — View qualifications, reviews, fees, available slots
- **Book Appointment** — Select date/time slot → Choose type (video/chat) → Pay
- **My Appointments** — Upcoming, past, cancelled with status tracking
- **Video Consultation** — In-app WebRTC video call at appointment time
- **Chat** — Real-time chat with doctor during/after consultation
- **Prescriptions** — Download PDF prescriptions from doctor
- **Payments & History** — View all transactions, download receipts
- **Reviews** — Rate and review doctor after consultation
- **Profile** — Personal info, medical history, notification settings
- **Notifications** — Appointment reminders, updates via bell + SMS + email

### Patient User Flow
```
Landing Page (no login required)
    ↓
Browse Disease Categories (Mental Health, Skin, General, etc.)
    ↓
Select Category → See Doctors List (no login required)
    ↓
Click Doctor → View Full Profile (no login required)
    ↓
Select Appointment Slot (no login required)
    ↓
Select Type: Video / Chat (no login required)
    ↓
── REGISTER/LOGIN GATE ──
"Almost done! Create a free account to confirm your booking."
    ↓
Register (name, email/phone, password) ← ONLY HERE
OR Login if already have account
[Booking summary shown on side: doctor, date, time, fee]
    ↓
Payment Screen (JazzCash / EasyPaisa / Card)
    ↓
Booking Confirmed ✅ → Redirect to Patient Dashboard
    ↓
Reminder Sent (SMS + Email, 1hr before)
    ↓
Join Consultation (Video / Chat)
    ↓
Doctor shares Prescription (PDF)
    ↓
Leave Review
```

> **Agent Notes for this flow:**
> - Store selected slot + doctor in `sessionStorage` before showing register gate — restore it immediately after login/register so user lands on payment, not back to step one
> - Register form at gate: name, phone/email, password ONLY — no extra fields
> - Show booking summary card during registration so user stays confident
> - After register/login, auto-redirect to payment with pre-filled appointment details
> - Collect extra profile info (DOB, city, gender) later inside patient dashboard

---

## 🩺 DASHBOARD 2: DOCTOR

### Registration & Approval Flow
```
Register (email + phone) → Fill Doctor Profile Form →
Upload Documents (PMDC cert, Degree, CNIC) → Submit for Review →
Super Admin Reviews → Approved/Rejected (email notification) →
Profile Goes LIVE → Doctor can set availability
```

### Features
- **Dashboard Home** — Today's appointments, earnings summary, notifications
- **Appointment Management** — Upcoming, past, cancel with reason
- **Schedule Management** — Set weekly availability slots, block dates
- **Patient Records** — View patient history, previous consultations
- **Consultation Room** — Join video call, in-call chat, share screen
- **Prescriptions** — Write and send digital prescription (PDF generated)
- **Earnings** — Earnings per appointment, monthly summary, payout history
- **Reviews** — View patient reviews and ratings
- **Profile** — Update bio, specializations, fees, photos
- **Documents** — Upload/update credentials

---

## 🛡️ DASHBOARD 3: SUPER ADMIN

### Super Admin Powers
- Full system access — all users, doctors, appointments, payments
- Create sub-admins with granular permissions
- Approve/reject/suspend doctors
- Platform-wide settings (commission rates, payment gateways)

### Sub-Admin Permission System (JSONB)
```json
{
  "can_approve_doctors": true,
  "can_reject_doctors": false,
  "can_view_payments": true,
  "can_refund_payments": false,
  "can_manage_patients": true,
  "can_view_reports": true,
  "can_send_notifications": false,
  "can_manage_staff": false
}
```

### Features
- **Dashboard** — Platform KPIs: total users, revenue, active doctors, appointments today
- **Doctor Management** — Review applications, view documents, approve/reject/suspend
- **Patient Management** — View all patients, flag/suspend accounts
- **Appointment Oversight** — All appointments, filter by status/date/city
- **Payment Management** — All transactions, refund management, payout tracking
- **Staff Management** — Create/update/delete sub-admin accounts + permissions
- **Reports & Analytics** — Revenue charts, user growth, city-wise stats, doctor performance
- **Platform Settings** — Commission rate, payment gateway keys, SMS/email settings
- **Notifications** — Broadcast notifications to all users/doctors/specific segment
- **Audit Logs** — All admin actions logged for accountability

---

## 💳 PAYMENT INTEGRATION

### Payment Methods
| Method | Use Case | Integration |
|--------|----------|-------------|
| JazzCash | PKR mobile wallet | JazzCash REST API |
| EasyPaisa | PKR mobile wallet | Telenor EasyPaisa API |
| Stripe | Credit/Debit cards | Stripe.js + Webhooks |
| Bank Transfer | Manual (for high-value) | Manual admin confirmation |

### Payment Flow
```
Patient selects appointment →
System calculates: Consultation Fee + Platform Fee (e.g. 10%) →
Patient chooses payment method →
Redirect to gateway or in-app payment →
Webhook confirms payment →
Appointment status → 'scheduled' →
Doctor earning recorded →
Receipt emailed to patient
```

### Commission Model
```
Patient pays: PKR 1,000
Platform fee (10%): PKR 100
Doctor earns: PKR 900
Payouts: Weekly/Monthly bank transfer to doctor
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Auth Strategy (Supabase Auth + RLS)
- JWT-based sessions managed by Supabase
- Role stored in `profiles.role`
- Row Level Security (RLS) policies on all tables
- Middleware in Next.js checks role → redirects to correct dashboard

### RLS Policy Example
```sql
-- Patients can only see their own appointments
CREATE POLICY "patients_own_appointments" ON appointments
  FOR SELECT USING (auth.uid() = patient_id);

-- Doctors see appointments assigned to them
CREATE POLICY "doctors_own_appointments" ON appointments
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM doctor_profiles WHERE id = doctor_id)
  );

-- Admins see all
CREATE POLICY "admins_all_appointments" ON appointments
  FOR ALL USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );
```

---

## 📧 NOTIFICATIONS SYSTEM

| Trigger | Channel | Recipient |
|---------|---------|-----------|
| Appointment booked | Email + SMS + In-app | Patient + Doctor |
| Appointment reminder (1hr before) | SMS + Push | Patient + Doctor |
| Doctor approved | Email + In-app | Doctor |
| Doctor rejected | Email + In-app | Doctor |
| Payment successful | Email | Patient |
| Appointment cancelled | Email + SMS | Both |
| New review | In-app | Doctor |

---

## 🗺️ PAKISTAN CITIES SUPPORT

Support all major cities at launch:
Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Sialkot, Gujranwala, Hyderabad, Abbottabad, Bahawalpur

Doctors can mark cities where they practice in-person; online is nationwide.

---

## 🚀 DEVELOPMENT PHASES

### Phase 1 — Foundation (Weeks 1–3)
- [ ] Project setup (Next.js + Supabase + Tailwind + shadcn)
- [ ] Database schema + migrations
- [ ] Auth system (register, login, OTP, Google)
- [ ] Role-based routing middleware
- [ ] Landing page (public)

### Phase 2 — Patient Dashboard (Weeks 4–6)
- [ ] Browse & search doctors
- [ ] Doctor profile page
- [ ] Appointment booking with slot selection
- [ ] Payment integration (JazzCash + EasyPaisa first)
- [ ] My appointments page
- [ ] Profile management

### Phase 3 — Doctor Dashboard (Weeks 7–9)
- [ ] Doctor registration + document upload
- [ ] Availability schedule management
- [ ] Appointment management
- [ ] Prescription PDF generation
- [ ] Earnings dashboard

### Phase 4 — Admin Dashboard (Weeks 10–12)
- [ ] Super admin panel
- [ ] Doctor approval workflow
- [ ] Sub-admin creation + permission system
- [ ] Reports + analytics
- [ ] Platform settings

### Phase 5 — Real-time Features (Weeks 13–14)
- [ ] Video consultation (Daily.co/100ms integration)
- [ ] Real-time chat (Supabase Realtime)
- [ ] Notification system (email + SMS + in-app)
- [ ] Appointment reminders (cron via Supabase Edge Functions)

### Phase 6 — Polish & Launch (Weeks 15–16)
- [ ] Mobile responsiveness audit
- [ ] Performance optimization
- [ ] Sentry error tracking
- [ ] SEO (doctor listings)
- [ ] Security audit (RLS review)
- [ ] Staging → Production deploy

### Phase 7 — Mobile App (After Web Launch)
- [ ] React Native + Expo setup
- [ ] Reuse shared Supabase types
- [ ] Patient app (iOS + Android)
- [ ] Doctor app
- [ ] Push notifications (Expo)

---

## 🌐 LANDING PAGE SECTIONS

1. **Hero** — "Find Trusted Doctors in Pakistan — Online, Anytime"
2. **How It Works** — 3 steps: Search → Book → Consult
3. **Browse Specializations** — Mental Health, General, Dermatology, etc.
4. **Featured Doctors** — Top-rated verified doctors
5. **Stats** — Doctors registered, cities, consultations done
6. **Testimonials** — Patient reviews
7. **For Doctors** — CTA to register as a doctor
8. **Download App** (Phase 2)
9. **Footer** — Links, social, cities

---

## 🔧 ENVIRONMENT VARIABLES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Payments
JAZZCASH_MERCHANT_ID=
JAZZCASH_PASSWORD=
JAZZCASH_INTEGRITY_SALT=
EASYPAISA_STORE_ID=
EASYPAISA_HASH_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Notifications
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Video
DAILY_API_KEY=
# or
HUNDRED_MS_APP_ACCESS_KEY=
HUNDRED_MS_APP_SECRET=

# App
NEXT_PUBLIC_APP_URL=https://stresssaviors.pk
PLATFORM_FEE_PERCENT=10
```

---

## 📋 AGENT INSTRUCTIONS

> **AI Agents reading this file:** Follow this blueprint strictly. Build features in the order defined in Development Phases. Always:
> - Use TypeScript — no `any` types
> - Write Zod schemas for all form inputs
> - Apply RLS policies for every new table
> - Create reusable components in `/components/shared`
> - Keep Supabase queries in `/lib/supabase/` helper files
> - Write server components by default, client components only when needed
> - All monetary values stored as `NUMERIC(10,2)` in PKR
> - All timestamps in UTC, display in PKT (UTC+5) on frontend
> - Doctor PMDC number must be validated before approval
> - Sensitive admin actions must log to audit_logs table
> - Never expose `SUPABASE_SERVICE_ROLE_KEY` to client

---

## 📞 SUPPORT & CONTACT SYSTEM

- In-app support chat (admin responds)
- Email: support@stresssaviors.pk
- WhatsApp Business integration (Phase 2)

---

*Last updated: June 2026 | Version: 1.0.0*
*Platform: Stress Saviors | Pakistan Telehealth*