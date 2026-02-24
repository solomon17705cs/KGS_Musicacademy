<div align="center">

# 🎵 KGS Music Academy

### A Modern Student Progress Tracking System for Music Academies

[![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**KGS Music Academy** is a cross-platform mobile application built with **React Native** and **Expo** that empowers music academies to manage student progress tracking with distinct dashboards for **admins**, **students**, and **parents** — all powered by a secure **Supabase** backend with Row Level Security.

---

[Features](#-features) •
[Architecture](#-architecture) •
[Tech Stack](#-tech-stack) •
[Getting Started](#-getting-started) •
[Database Schema](#-database-schema) •
[Project Structure](#-project-structure) •
[License](#-license)

</div>

---

## ✨ Features

### 🔐 Authentication & Authorization
- **Email/Password Sign-Up & Sign-In** with Supabase Auth
- **Role-based account creation** — users register as either a `Student` or `Parent`
- **Admin role** managed at the database level for privileged access
- **Automatic session management** with token refresh and persistence
- **Protected routing** — users are redirected based on their role upon login

### 👨‍🎓 Student Portal
- **Progress Dashboard** — view your latest theory and practical grades at a glance
- **Status Indicators** — color-coded badges (`Excellent`, `Good`, `Needs Improvement`, `Struggling`) for quick assessment
- **Instructor Notes** — read detailed feedback from your music instructors
- **Enrollment Info** — see your instrument and enrollment year
- **Pull-to-Refresh** — get the latest progress updates instantly

### 👨‍👩‍👧 Parent Portal
- **Child Progress Monitoring** — parents can view all enrolled children's progress
- **Same rich dashboard** as students with theory & practical grades, status badges, and instructor notes
- **Real-time data** via Supabase with pull-to-refresh support

### 🛡️ Admin Dashboard
- **Student Management** — view all enrolled students with their instruments
- **Statistics Overview** — quick stats card showing total students count
- **Progress Editing** — tap any student to update their theory grade, practical grade, status levels, and instructor notes
- **Create Progress Records** — each save creates a new progress record, preserving the full history
- **Role-guarded access** — only admins can access the admin dashboard; unauthorized users are redirected

### 👤 Profile Management
- **User Profile View** — displays full name, email, account type, and membership date
- **Role Badge** — color-coded role indicator (Admin: red, Parent: blue, Student: green)
- **Sign Out** — securely log out from any screen

### 🎨 UI/UX
- **Clean, modern design** with a cohesive blue (`#1e40af`) and slate color palette
- **Card-based layouts** with shadow elevation for depth
- **Lucide icons** throughout the interface for a polished look
- **Keyboard-aware forms** with `KeyboardAvoidingView` for iOS and Android
- **Loading states & error handling** on every screen with user-friendly messages
- **Empty states** with helpful guidance when no data is available
- **Custom 404 page** with navigation back to home

---

## 🏗 Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     KGS Music Academy App                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────┐   ┌───────────────┐   ┌──────────────────┐  │
│  │  Auth      │   │  Student/     │   │  Admin           │  │
│  │  Screens   │   │  Parent Tabs  │   │  Dashboard       │  │
│  │           │   │               │   │                  │  │
│  │ • Login    │   │ • Progress    │   │ • Student List   │  │
│  │ • Sign Up  │   │ • Profile     │   │ • Edit Progress  │  │
│  └─────┬─────┘   └───────┬───────┘   └────────┬─────────┘  │
│        │                 │                     │            │
│  ┌─────┴─────────────────┴─────────────────────┴─────────┐  │
│  │              Auth Context (React Context API)          │  │
│  │   • Session management  • Profile loading              │  │
│  │   • Sign in/up/out      • Role-based state             │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────┴───────────────────────────┐  │
│  │             Supabase Client (lib/supabase.ts)          │  │
│  │   • Auth API    • Database queries   • RLS enforced    │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
            ┌──────────────────────────────────┐
            │       Supabase Cloud             │
            │                                  │
            │  ┌────────────┐  ┌────────────┐  │
            │  │  Auth      │  │  PostgreSQL │  │
            │  │  Service   │  │  Database   │  │
            │  └────────────┘  └────────────┘  │
            │                                  │
            │  ┌────────────────────────────┐  │
            │  │  Row Level Security (RLS)  │  │
            │  │  • Per-role access control  │  │
            │  │  • Data isolation           │  │
            │  └────────────────────────────┘  │
            └──────────────────────────────────┘
```

### Routing Architecture

The app uses **Expo Router** (file-based routing) with the following navigation structure:

```
app/
├── _layout.tsx              →  Root layout (AuthProvider wrapper + Stack navigator)
├── index.tsx                →  Entry point (role-based redirect)
├── login.tsx                →  Login screen
├── signup.tsx               →  Registration screen
├── +not-found.tsx           →  404 error screen
│
├── (tabs)/                  →  Student & Parent views (Tab navigator)
│   ├── _layout.tsx          →  Tab layout (Progress + Profile tabs)
│   ├── progress.tsx         →  Progress dashboard (theory & practical)
│   └── profile.tsx          →  User profile & sign out
│
└── (admin)/                 →  Admin-only views (Stack navigator)
    ├── dashboard.tsx        →  Admin dashboard with student list + stats
    └── edit-progress/
        └── [id].tsx         →  Dynamic route: edit a student's progress
```

### Authentication Flow

```
App Launch
    │
    ▼
┌──────────────┐     No session      ┌──────────────┐
│  index.tsx   │ ──────────────────▶  │  login.tsx   │
│  (Loading)   │                      │              │
└──────┬───────┘                      └──────┬───────┘
       │                                     │
       │ Has session                         │ Sign in
       │                                     ▼
       ▼                              ┌──────────────┐
┌──────────────┐                      │  Supabase    │
│ Load Profile │                      │  Auth API    │
│  from DB     │                      └──────┬───────┘
└──────┬───────┘                             │
       │                                     │ Success
       ▼                                     ▼
  ┌────────────────────────┐          ┌──────────────┐
  │  Role Check            │          │ Load Profile │
  │                        │          │ & Redirect   │
  │  role === 'admin'  ────┼──▶  /(admin)/dashboard  │
  │  role === 'student' ───┼──▶  /(tabs)/progress    │
  │  role === 'parent' ────┼──▶  /(tabs)/progress    │
  └────────────────────────┘          └──────────────┘
```

### State Management

The app follows a **Context-based state management** pattern:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Global Auth State** | React Context (`AuthContext`) | Session, user, profile, and auth methods |
| **Local Screen State** | React `useState` | Form inputs, loading states, errors |
| **Server State** | Supabase Client | Direct database queries with RLS |
| **Navigation State** | Expo Router | File-based routing with automatic deep linking |

---

## 🛠 Tech Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React Native | 0.81.4 | Cross-platform mobile UI |
| **Platform** | Expo | 54 | Development tooling, native APIs, build system |
| **Router** | Expo Router | 6.x | File-based navigation with typed routes |
| **Language** | TypeScript | 5.9 | Type-safe development |
| **Backend** | Supabase | 2.58+ | Auth, PostgreSQL database, RLS |
| **Icons** | Lucide React Native | 0.544 | Beautiful, consistent icon set |
| **Animations** | React Native Reanimated | 4.1 | Smooth native animations |
| **Gestures** | React Native Gesture Handler | 2.28 | Touch gesture support |
| **UI Components** | React Native core | — | ActivityIndicator, ScrollView, etc. |
| **Networking** | react-native-url-polyfill | 2.0 | URL API polyfill for Supabase compatibility |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** or **yarn**
- **Expo CLI** (installed globally or via `npx`)
- A **Supabase** project ([create one free](https://supabase.com))

### 1. Clone the Repository

```bash
git clone https://github.com/solomon17705cs/KGS_Musicacademy.git
cd KGS_Musicacademy
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Navigate to **SQL Editor** and run the migration file:

```sql
-- Paste the contents of:
-- supabase/migrations/20260224135502_create_music_academy_schema.sql
```

This will create:
- `profiles` table (user roles & metadata)
- `students` table (student enrollment data)
- `progress_records` table (theory & practical progress)
- All RLS policies for role-based access
- Performance indexes
- Auto-updated `updated_at` triggers

3. To create an **admin user**:
   - Sign up through the app as a regular user
   - Go to Supabase Dashboard → Table Editor → `profiles`
   - Change the user's `role` from `'student'` or `'parent'` to `'admin'`

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> You can find these values in your Supabase project under **Settings → API**.

### 5. Start the Development Server

```bash
npm run dev
```

This will open the Expo development tools. From there you can:
- Press **`w`** to open in a web browser
- Press **`i`** to open in iOS Simulator
- Press **`a`** to open in Android Emulator
- Scan the QR code with the **Expo Go** app on your phone

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Expo development server |
| `npm run build:web` | Export a production web build |
| `npm run lint` | Run the Expo linter |
| `npm run typecheck` | Run TypeScript type checking |

---

## 🗄 Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────┐
│        profiles          │
├─────────────────────────┤
│ PK  id (uuid)           │──── References auth.users
│     email (text)         │
│     full_name (text)     │
│     role (text)          │     ← 'student' | 'parent' | 'admin'
│     created_at           │
│     updated_at           │
└─────────┬──────┬────────┘
          │      │
    user_id│      │parent_id
          │      │
          ▼      ▼
┌─────────────────────────┐
│        students          │
├─────────────────────────┤
│ PK  id (uuid)           │
│ FK  user_id (uuid)      │──── nullable, links student account
│ FK  parent_id (uuid)    │──── nullable, links parent account
│     full_name (text)     │
│     date_of_birth (date) │
│     enrollment_date (date)│
│     instrument (text)    │
│     created_at           │
│     updated_at           │
└─────────┬───────────────┘
          │
          │ student_id
          ▼
┌─────────────────────────┐
│    progress_records      │
├─────────────────────────┤
│ PK  id (uuid)           │
│ FK  student_id (uuid)   │──── CASCADE on delete
│     theory_grade (text)  │
│     practical_grade (text)│
│     theory_status (text) │     ← 'excellent' | 'good' | 'needs_improvement' | 'struggling'
│     practical_status     │     ← same enum values
│     notes (text)         │
│ FK  updated_by (uuid)   │──── admin who made the update
│     created_at           │
│     updated_at           │
└─────────────────────────┘
```

### Row Level Security (RLS) Policies

| Table | Policy | Roles | Access |
|-------|--------|-------|--------|
| `profiles` | Users can view own profile | All authenticated | `SELECT` where `auth.uid() = id` |
| `profiles` | Users can update own profile | All authenticated | `UPDATE` where `auth.uid() = id` |
| `students` | Students can view own record | Student, Parent, Admin | `SELECT` — students see own, parents see children, admins see all |
| `students` | Admins can insert students | Admin | `INSERT` |
| `students` | Admins can update students | Admin | `UPDATE` |
| `students` | Admins can delete students | Admin | `DELETE` |
| `progress_records` | Students/parents can view progress | Student, Parent, Admin | `SELECT` — scoped to own student records or admin |
| `progress_records` | Admins can insert progress records | Admin | `INSERT` |
| `progress_records` | Admins can update progress records | Admin | `UPDATE` |
| `progress_records` | Admins can delete progress records | Admin | `DELETE` |

### Database Indexes

| Index | Table | Column | Purpose |
|-------|-------|--------|---------|
| `idx_students_user_id` | students | user_id | Fast student lookup by user account |
| `idx_students_parent_id` | students | parent_id | Fast lookup of parent's children |
| `idx_progress_student_id` | progress_records | student_id | Fast progress lookup by student |
| `idx_profiles_role` | profiles | role | Fast role-based queries |

---

## 📁 Project Structure

```
KGS_Musicacademy/
│
├── app/                              # Expo Router screens (file-based routing)
│   ├── _layout.tsx                   # Root layout — AuthProvider + Stack navigator
│   ├── index.tsx                     # Entry screen — role-based redirect
│   ├── login.tsx                     # Login form (email + password)
│   ├── signup.tsx                    # Registration (name, email, password, role)
│   ├── +not-found.tsx                # 404 page
│   │
│   ├── (tabs)/                       # Student & Parent tab navigator
│   │   ├── _layout.tsx               # Bottom tab configuration (Progress + Profile)
│   │   ├── progress.tsx              # Progress dashboard with grade cards
│   │   └── profile.tsx               # User profile with sign-out
│   │
│   └── (admin)/                      # Admin-only screens
│       ├── dashboard.tsx             # Student list + stats overview
│       └── edit-progress/
│           └── [id].tsx              # Dynamic route — edit a specific student's progress
│
├── contexts/
│   └── AuthContext.tsx               # Global auth state (session, profile, sign in/up/out)
│
├── hooks/
│   └── useFrameworkReady.ts          # Framework readiness hook for web platform
│
├── lib/
│   └── supabase.ts                   # Supabase client initialization with platform config
│
├── types/
│   ├── database.ts                   # TypeScript types (Profile, Student, ProgressRecord, etc.)
│   └── env.d.ts                      # Environment variable type declarations
│
├── supabase/
│   └── migrations/
│       └── 20260224135502_create_music_academy_schema.sql   # Full database schema + RLS
│
├── assets/
│   └── images/
│       ├── icon.png                  # App icon
│       └── favicon.png               # Web favicon
│
├── app.json                          # Expo configuration (plugins, orientation, etc.)
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration with path aliases
├── LICENSE                           # MIT License
└── README.md                         # This file
```

---

## 🔑 Key Implementation Details

### Supabase Client Configuration

The Supabase client (`lib/supabase.ts`) is configured with platform-aware settings:
- **Web**: Uses default browser storage for session persistence
- **Native (iOS/Android)**: Disables default `localStorage` (not available natively)
- **Auto-refresh tokens** and **session persistence** are enabled
- **Session URL detection** is disabled (not needed for mobile)

### Type Safety

All database entities are strongly typed in `types/database.ts`:

```typescript
type UserRole = 'student' | 'parent' | 'admin';
type ProgressStatus = 'excellent' | 'good' | 'needs_improvement' | 'struggling';

interface Profile { id, email, full_name, role, created_at, updated_at }
interface Student { id, user_id, parent_id, full_name, date_of_birth, enrollment_date, instrument, ... }
interface ProgressRecord { id, student_id, theory_grade, practical_grade, theory_status, practical_status, notes, ... }
interface StudentWithProgress extends Student { progress?: ProgressRecord }
```

### Progress Status System

The app uses a 4-tier status system with consistent color coding across all screens:

| Status | Color | Hex Code |
|--------|-------|----------|
| 🟢 Excellent | Green | `#22c55e` |
| 🔵 Good | Blue | `#3b82f6` |
| 🟡 Needs Improvement | Amber | `#f59e0b` |
| 🔴 Struggling | Red | `#ef4444` |

---

## 📱 Screens Overview

| Screen | Route | Access | Description |
|--------|-------|--------|-------------|
| **Login** | `/login` | Public | Email/password sign-in form |
| **Sign Up** | `/signup` | Public | Account registration with role selection |
| **Progress** | `/(tabs)/progress` | Student, Parent | View theory & practical grades with status |
| **Profile** | `/(tabs)/profile` | Student, Parent | View account info and sign out |
| **Admin Dashboard** | `/(admin)/dashboard` | Admin only | View all students with stats |
| **Edit Progress** | `/(admin)/edit-progress/[id]` | Admin only | Update a student's grades, status, and notes |
| **Not Found** | `+not-found` | All | 404 error page with home link |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** your changes: `git commit -m 'Add my feature'`
4. **Push** to the branch: `git push origin feature/my-feature`
5. **Open** a Pull Request

### Code Style Guidelines

- Use **TypeScript** for all new files
- Follow the existing **component structure** (functional components with `StyleSheet`)
- Keep styles in a `StyleSheet.create()` block at the bottom of each file
- Use **Lucide icons** for consistency
- Ensure all database queries respect the existing **RLS policies**

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for KGS Music Academy**

*Empowering music education through technology*

</div>
