

## Night Address Verification System - Implementation Plan

### Overview
A professional HR background-check web platform that verifies employee residential addresses during night hours. The system includes a public marketing website and a secure role-based application with Admin and Employee dashboards.

---

### 🎨 Design Direction
- **Style**: Enterprise HR SaaS with a clean, trustworthy aesthetic
- **Primary Colors**: Deep blue (#1e3a5f) for trust, slate grays for professionalism
- **Accent**: Teal/green for success states, amber for warnings
- **Typography**: Clean, modern fonts with clear hierarchy
- **UI Elements**: Subtle animations, status badges, professional iconography

---

### Part 1: Public Marketing Website

**Landing Page**
- Hero section with compelling headline about accurate address verification
- "Request Demo" and "Sign In" call-to-action buttons
- How It Works section with 4 illustrated steps
- Why Night Verification benefits section
- Security & Privacy assurances
- Professional footer with navigation

**About / Use Case Page**
- Explanation of HR background check use cases
- Corporate onboarding and compliance benefits
- Trust and workforce reliability messaging

---

### Part 2: Authentication System

**Database Setup**
- User profiles table linked to Supabase auth
- Roles table (admin/employee) with secure role checking
- Employees table for invite management
- Verification records table for tracking submissions

**Unified Sign In Page**
- Single sign-in page for all users
- Email and password authentication
- Automatic role detection and routing after login
- Redirect to appropriate dashboard based on role

**Invite Acceptance Flow**
- Welcome page for employees opening invite links
- Password setup form
- Terms acceptance
- Automatic account creation and routing

---

### Part 3: Admin Dashboard

**Layout**
- Sidebar navigation with collapsible menu
- Top bar with admin profile and notifications
- Clean, enterprise-grade interface

**Dashboard Overview**
- Statistics widgets: Total Employees, Verified, Pending, Failed
- Quick action buttons
- Recent verification activity feed

**Employee Management**
- Employee table with search and filters
- Status indicators: Invited, Pending, Verified, Reverification Required
- View invite links with copy-to-clipboard functionality
- Individual employee detail views

**Create Employee (Invite)**
- Form: Full Name, Email, Phone Number
- Generate secure invite link
- Display link on screen with copy button
- Link visible in employee table for easy sharing

**Verification Review**
- View submitted addresses with map preview
- Verification result details: coordinates, timestamp, status
- Approve/reject verification
- Request re-verification button

**Admin Settings**
- Default verification window configuration (10 PM - 4 AM)
- Company profile information
- Security settings

---

### Part 4: Employee Dashboard

**Dashboard Home**
- Current verification status display
- Clear next-step instructions
- Status cards: Pending Address, Awaiting Window, Verified, Re-verify

**Address Submission**
- Full address form with validation
- Optional landmark field
- Verification window selection (within allowed range)
- Confirmation before submission

**Night-Time Location Verification**
- Only accessible during selected verification window
- Clear consent notice about location access
- "Confirm My Location Now" button
- Browser Geolocation API integration
- Loading animation during verification
- Success/failure feedback with clear messaging
- Verification locks after successful confirmation

**Re-verification Flow**
- Alert banner when admin requests re-verification
- Repeat the one-time verification process
- Status update after completion

---

### Security & Compliance Features
- Role-based access control via Supabase RLS
- Secure invite link generation and validation
- One-time location verification (no tracking)
- Consent-based data collection
- Proper session management and authentication

---

### Pages Summary

| Page | Access Level |
|------|--------------|
| Landing Page | Public |
| About Page | Public |
| Sign In | Public |
| Invite Accept | Invited Employees Only |
| Admin Dashboard | Admin Only |
| Employee Management | Admin Only |
| Verification Review | Admin Only |
| Admin Settings | Admin Only |
| Employee Dashboard | Employee Only |
| Address Submission | Employee Only |
| Location Verification | Employee Only |

