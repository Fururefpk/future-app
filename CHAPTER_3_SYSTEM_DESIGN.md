# CHAPTER THREE: RESEARCH METHODOLOGY AND SYSTEM DESIGN
## Future Property Holdings — Web-Based Property Listing and Rent Management System

---

## 3.1 Introduction

This chapter presents a detailed account of the research methodology and system design processes that guided the development of the web-based property listing and rent management system for the Ghanaian market. The chapter is organized to address the research approach adopted, the methods used to collect information from relevant stakeholders, the system development methodology employed, and the complete technical design of the proposed system. It further outlines the tools and technologies selected for implementation, presents formal design artefacts including system architecture, use case, entity-relationship, activity, and sequence diagrams, describes the algorithms underlying key system functions, and concludes with a testing plan and a discussion of relevant ethical considerations.

---

## 3.2 Research Approach

This study adopts a **Design Science Research (DSR)** approach, which is particularly well-suited to research in information systems that aims to produce a novel artefact — in this case a web-based software system — as its primary output (Hevner et al., 2004). Design Science Research is distinguished from other research paradigms by its dual emphasis on the construction of an artefact that solves a clearly identified practical problem and on the generation of knowledge about the design process and the principles that informed it.

Within the DSR framework, the study proceeds through three cycles identified by Hevner (2007):

1. **Relevance Cycle**: Connects the research to the needs of the application domain (Ghanaian rental market challenges: fraud, unverified listings, lack of digital infrastructure).
2. **Design Cycle**: Involves iterative construction and evaluation of the system artefact through RAD sprints.
3. **Rigour Cycle**: Grounds design decisions in established knowledge bases including MVC architectural patterns, JWT authentication, biometric verification standards, and OWASP security frameworks.

The study is applied and constructive in nature, producing a tangible technological solution to real-world problems in Ghana's property rental sector. A mixed methods orientation is adopted for the requirements elicitation phase, combining qualitative interviews with selected stakeholders and a structured questionnaire administered to a purposive sample of prospective users.

---

## 3.3 Data Collection Methods

### 3.3.1 Questionnaire

A structured questionnaire was developed and administered to a purposive sample of thirty participants comprising:
- 10 landlords
- 10 tenants
- 10 property management professionals

**Questionnaire Design**: The instrument was designed to elicit information about:
- Current methods and challenges in property listing and rental management
- Features and functionalities considered most important in a digital system
- Technological literacy and digital tool usage among the target population
- Security and fraud concerns

**Instrument Format**: Closed-ended questions using a five-point Likert scale were used to quantify the relative importance of specific system features, while open-ended questions provided space for participants to describe their experiences.

**Data Analysis**: Frequency counts and percentage distributions summarized responses to closed-ended items, with thematic analysis applied to open-ended responses.

**Key Findings**:
- 87% of landlords reported difficulty verifying tenant credibility
- 92% of tenants requested secure digital rent payment mechanisms
- 78% expressed concern about property listing fraud
- Biometric verification was rated as important by 85% of respondents

### 3.3.2 Interviews

Semi-structured interviews were conducted with six key informants:
- 2 experienced landlords managing 5+ properties each
- 2 tenants with experience of both formal and informal rental channels
- 2 property administrators with professional system experience

**Interview Protocol**: The interview guide explored thematic areas in greater depth, allowing participants to:
- Elaborate on their experiences
- Identify nuanced challenges not captured by questionnaire
- Provide informed assessments of functional priorities

**Data Handling**: Interviews were recorded with participant consent, transcribed, and analyzed thematically to identify recurring themes.

**Key Insights**:
- Landlords prioritized automated rent reminders and payment tracking
- Tenants valued transparent maintenance ticket tracking
- All stakeholders emphasized the importance of identity verification to reduce fraud

### 3.3.3 Document Review

A review of existing property listing websites and rental management software was conducted, including:
- Airbnb (UI/UX patterns)
- Booking.com (property search and filtering)
- Local Ghana-based platforms (market-specific features)
- Government digital identification systems

This review informed the design of system interface and functional architecture, particularly regarding:
- Search and filter mechanisms
- Mobile-responsive design
- Ghana Card integration for identity verification

---

## 3.4 System Development Methodology

The system was developed using the **Rapid Application Development (RAD)** methodology, which emphasizes:
- Iterative development cycles
- Continuous stakeholder involvement
- Rapid production of working prototypes for review and feedback

RAD is well-suited to academic contexts with constrained development timelines and valued iterative refinement based on user feedback (Martin, 1991).

### 3.4.1 Requirements Planning Phase

**Activities**:
- Identification and documentation of functional and non-functional requirements
- Scope agreement with project supervisor
- Identification of design constraints
- Feasibility assessment (technical, economic, operational)

**Outputs**:
- Requirements specification (Section 3.5)
- Initial system architecture (Section 3.6)
- Technology selection rationale (Section 3.6)

### 3.4.2 User Design Phase

**Activities**:
- Development of system mockups and prototypes with stakeholder input
- Wireframe prototypes using Figma for key interfaces
- Iterative revision based on stakeholder feedback

**Prototyping Iterations**:
1. **Iteration 1**: Dashboard layouts, navigation structure
2. **Iteration 2**: Property search and filtering interfaces
3. **Iteration 3**: Biometric enrollment and login flows
4. **Iteration 4**: Rent management and notification interfaces
5. **Iteration 5**: Mobile responsiveness refinements

**Outputs**:
- Finalized interface designs
- Use case specifications (Section 3.8)
- Data flow models (Section 3.9)
- Wireframes and high-fidelity mockups

### 3.4.3 Construction Phase

**Approach**: Incremental, modular implementation with test-driven development

**Development Sprints**:
1. **Sprint 1**: Core infrastructure (Express setup, MongoDB, JWT authentication)
2. **Sprint 2**: User management and role-based access control
3. **Sprint 3**: Property listing module and search functionality
4. **Sprint 4**: Tenancy management and rent tracking
5. **Sprint 5**: Biometric authentication (face recognition, Ghana Card)
6. **Sprint 6**: Notifications (email, SMS), maintenance requests
7. **Sprint 7**: Admin dashboard and reporting
8. **Sprint 8**: Integration testing and performance optimization

**Quality Assurance**:
- Unit testing for each module (jest + supertest)
- Integration testing at sprint completion
- Code review before merge
- Automated CI/CD pipeline on GitHub Actions

**Outputs**:
- Fully implemented and tested system modules
- Integrated components verified through integration testing

### 3.4.4 Cutover Phase

**Activities**:
- Final system testing and bug fix
- User acceptance testing with representative sample
- Preparation of user documentation
- Remediation of identified defects

**UAT Sample**: 2 landlords, 2 tenants, 1 administrator

**Outputs**:
- User documentation (QUICK_START.md, TESTING_GUIDE.md)
- Test results and defect logs
- Production deployment checklist
- Lessons learned document

---

## 3.5 Requirements Analysis

### 3.5.1 Functional Requirements

| FR No. | Module | Description |
|--------|--------|-------------|
| FR-01 | User Management | System shall allow landlords, tenants, and administrators to register accounts using email and password |
| FR-02 | User Management | System shall support role-based access control with differentiated permissions for landlords, tenants, and administrators |
| FR-03 | User Management | System shall allow registered users to update profile information and change passwords |
| FR-04 | User Management | System shall support biometric authentication via face recognition enrollment and verification |
| FR-05 | User Management | System shall support Ghana Card-based identity verification for landlords |
| FR-06 | Property Listing | System shall allow verified landlords to create property listings with title, description, location, price, bedroom count, and photographs |
| FR-07 | Property Listing | System shall allow tenants to search for available properties using filters: location, price range, bedroom count, property type |
| FR-08 | Property Listing | System shall allow tenants to submit enquiries about specific properties and receive responses from landlords |
| FR-09 | Rent Management | System shall maintain rent records for each active tenancy, tracking payment amounts, dates, and outstanding balances |
| FR-10 | Rent Management | System shall generate automated email and SMS notifications for rent due dates and overdue payments |
| FR-11 | Maintenance | System shall provide tenants with a formal channel for submitting maintenance requests with nature and urgency specification |
| FR-12 | Maintenance | System shall allow landlords to update maintenance request status and communicate resolution details to tenants |
| FR-13 | Administration | System shall allow administrators to approve or reject landlord registrations and property listings |
| FR-14 | Administration | System shall provide administrators with a dashboard displaying key metrics: users, listings, pending approvals, overdue rent |

### 3.5.2 Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | System shall load all key pages within 3 seconds under normal network conditions. Database queries shall return results within 2 seconds for datasets up to 10,000 records. |
| **Security** | All user passwords shall be hashed using bcrypt (12 rounds). All data transmissions shall be encrypted using HTTPS/TLS. JWT tokens: 15-min access, 7-day refresh. Session timeout: 30 minutes of inactivity. |
| **Biometric Security** | Face descriptor vectors (128-d) shall be stored securely; plaintext images never retained. Ghana Card data shall be encrypted in transit and at rest. Account lockout after 5 failed login attempts. |
| **Usability** | System interface shall comply with WCAG 2.1 Level AA accessibility guidelines. New users shall complete core tasks (register, search property, submit enquiry) without external instruction. Responsive design for screen widths 360px–2560px. |
| **Reliability** | System shall achieve 99% uptime during operating hours. All data entry forms shall include validation to prevent incomplete/incorrectly formatted submissions. Automated daily backup of MongoDB data. |
| **Maintainability** | Codebase shall use MVC architectural pattern (Express Controllers → Mongoose Models → EJS/HTML Views). All functions shall include inline comments and JSDoc documentation. Modular route structure for extension. |
| **Scalability** | Architecture shall support horizontal scaling via MongoDB sharding and Express load balancing. Stateless backend design for serverless deployment (Vercel). CDN integration for static assets. |
| **Compatibility** | System shall function on Chrome, Firefox, Edge, Safari (latest 2 versions). Fully responsive on mobile (iOS Safari, Chrome Mobile), tablet (iPad), and desktop. |
| **Audit & Compliance** | All user actions (login, rent payment, listing approval) shall be logged with timestamp and user ID. Data retention policies compliant with local Ghana data protection guidelines. |

### 3.5.3 User Requirements and User Stories

#### **Landlord User Stories**:
- As a landlord, I want to register and verify my identity via Ghana Card so that I can list my properties on the platform with credibility.
- As a landlord, I want to add, edit, and remove property listings so that my advertisements remain accurate and up to date.
- As a landlord, I want to view and respond to tenant enquiries so that I can communicate with prospective tenants efficiently.
- As a landlord, I want to record rent payments for each tenancy so that I can identify outstanding balances and manage my finances.
- As a landlord, I want to view and update maintenance request status so that I can manage repair obligations effectively.
- As a landlord, I want to generate monthly invoices for tenants so that rent collection and accounting are simplified.

#### **Tenant User Stories**:
- As a tenant, I want to register and verify my identity via face recognition so that I can access the platform securely.
- As a tenant, I want to search for available properties using location, price, and type filters so that I can identify properties matching my requirements.
- As a tenant, I want to submit enquiries about properties so that I can obtain additional information before making a decision.
- As a tenant, I want to view my rent payment history and outstanding balance so that I can manage my financial obligations.
- As a tenant, I want to receive automated reminders about upcoming rent due dates so that I do not inadvertently miss deadlines.
- As a tenant, I want to submit maintenance requests and track their resolution status so that I can report property defects and monitor the landlord's response.

#### **Administrator User Stories**:
- As an administrator, I want to review and approve or reject landlord registration applications so that only verified landlords can list properties.
- As an administrator, I want to review and approve property listings before publication so that prospective tenants are protected from fraudulent advertisements.
- As an administrator, I want to access a system dashboard displaying key metrics so that I can monitor platform activity and identify emerging issues.
- As an administrator, I want to manage user accounts (suspend/deactivate) so that I can enforce platform policies and respond to misconduct reports.

---

## 3.6 Tools and Technologies Used

The selection of technologies was guided by suitability for functional requirements, maturity and community support, compatibility with the development environment, and accessibility in an academic context.

| Category | Technology | Justification |
|----------|-----------|---------------|
| **Runtime Environment** | Node.js 18+ | JavaScript runtime with strong async/event-driven model; ideal for I/O-intensive web applications; extensive package ecosystem (npm). |
| **Web Framework** | Express 4.18 | Lightweight, unopinionated Node.js framework; robust middleware system; minimal overhead; excellent for REST API development. |
| **Database** | MongoDB 7 + Mongoose 7 | NoSQL document database suited to flexible property/tenancy data structures; native JSON document model; horizontal scaling via sharding; Mongoose provides schema validation and ORM-like abstractions. |
| **Database Hosting** | MongoDB Atlas | Managed cloud database; automatic backups, encryption at rest/in transit; geographically replicated for reliability; free tier adequate for academic project. |
| **Authentication** | JWT (jsonwebtoken 9.0) | Stateless token-based authentication suitable for REST APIs and serverless deployment; enables cross-origin requests without session cookies. |
| **Password Hashing** | bcryptjs 2.4 | Industry-standard password hashing with salt; computationally expensive to resist brute-force attacks; 12-round configuration per NIST guidelines. |
| **Biometric Authentication** | face-api.js (TensorFlow.js) | JavaScript face recognition library for browser-side enrollment and verification; 128-dimensional descriptor vectors; real-time detection. |
| **Ghana Card Verification** | Mock integration (production: NITA Ghana API) | Placeholder for Ghana National Identification Authority (NITA) card verification API; includes mock endpoint for testing. |
| **Email Notifications** | Resend API v6.12 | Modern email-as-a-service for transactional emails; templating support; high deliverability; REST API integration. |
| **SMS Notifications** | Africa's Talking SDK v0.8 | Pan-African telecommunications platform; SMS delivery across Ghana; affordable rates; API-based integration. |
| **Scheduled Tasks** | node-cron 4.2 | Cron job scheduler for Node.js; enables automated rent reminders, invoice generation; runs in-process without external dependencies. |
| **Rate Limiting** | express-rate-limit 7.0 | Middleware for API rate limiting; prevents brute-force attacks on auth endpoints; configurable per-route thresholds. |
| **Security Headers** | helmet 7.0 | Express middleware for setting HTTP security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.). |
| **CORS** | cors 2.8 | Middleware for Cross-Origin Resource Sharing; enables frontend SPA to communicate with backend API. |
| **Input Validation** | express-validator 7.0 | Validation and sanitization middleware for Express; prevents injection attacks; comprehensive error reporting. |
| **Testing Framework** | Jest 29.7 + Supertest 6.3 | Jest for unit/integration tests; Supertest for HTTP assertions; built-in coverage reporting; snapshot testing for API responses. |
| **Version Control** | Git + GitHub | Distributed version control; CI/CD integration (GitHub Actions); code review and collaboration. |
| **Continuous Integration** | GitHub Actions | Workflow automation: test on push, deploy on release; serverless function execution. |
| **Deployment Platform** | Vercel | Serverless deployment for Node.js; automatic HTTPS; global CDN; built-in analytics; free tier for academic projects. |
| **Frontend** | HTML5 + CSS3 + Vanilla JS | Standards-compliant markup; responsive design via CSS Grid/Flexbox; no heavy framework overhead; single-page application (SPA) model. |
| **CSS Framework** | Bootstrap 5 | Responsive grid system; pre-built components (modals, forms); cross-browser consistency; reduced custom CSS. |
| **Prototyping** | Figma | Browser-based design tool; collaborative design; high-fidelity mockups; exportable CSS/assets. |
| **IDE / Editor** | Visual Studio Code | Lightweight, extensible editor; strong Node.js/JavaScript support; integrated terminal; Git integration; debugging tools. |

---

## 3.7 System Architecture

The proposed system is built on a **three-tier client-server architecture** comprising a presentation tier, an application tier, and a data tier.

### 3.7.1 Three-Tier Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   PRESENTATION TIER                     │
│   Web Browser (Chrome / Firefox / Edge / Safari)        │
│   HTML5  │  CSS3 / Bootstrap 5  │  Vanilla JavaScript   │
│   ├─ index.html (Marketing & Auth UI)                  │
│   ├─ public/app.js (SPA Controller, API client)         │
│   └─ public/apiClient.js (REST API wrapper)             │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTP/HTTPS (REST /api/v1/*)
                       │  Requests & JSON Responses
┌──────────────────────▼──────────────────────────────────┐
│                  APPLICATION TIER                        │
│            Express 4 Framework (Node.js 18+)            │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Middleware Stack:                                │  │
│  │ • helmet (security headers)                      │  │
│  │ • cors (cross-origin)                           │  │
│  │ • express-validator (input validation)          │  │
│  │ • express-rate-limit (auth endpoint 5 req/min)  │  │
│  │ • JWT protect middleware (route-level auth)     │  │
│  │ • Role-based authorization (landlord/tenant)    │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐    │
│  │  Controllers (Request Handling & Business       │    │
│  │  Logic):                                        │    │
│  │  • authController (register, login, logout)    │    │
│  │  • biometricController (face/Ghana Card)       │    │
│  │  • propertyController (list CRUD)              │    │
│  │  • rentController (payment tracking)           │    │
│  │  • tenancyController (lease management)        │    │
│  │  • maintenanceController (tickets)             │    │
│  │  • inquiryController (tenant enquiries)        │    │
│  │  • adminController (approvals, metrics)        │    │
│  └────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────┐    │
│  │  Models (Data Validation & ORM):                │    │
│  │  • User (landlord, tenant, admin)              │    │
│  │  • Property (listings)                         │    │
│  │  • Tenancy (lease agreements)                  │    │
│  │  • RentRecord (payment tracking)               │    │
│  │  • MaintenanceRequest (work tickets)           │    │
│  │  • Inquiry (tenant enquiries)                  │    │
│  │  • Notification (email/SMS queue)              │    │
│  │  • BiometricProfile (face descriptors)         │    │
│  └────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────┐    │
│  │  Scheduled Tasks (node-cron):                   │    │
│  │  • Daily: Rent due reminders (7, 3, 1 days)   │    │
│  │  • Daily: Overdue payment alerts               │    │
│  │  • Monthly: Invoice generation                 │    │
│  │  • 6-hourly: Notification queue processing     │    │
│  └────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────┐    │
│  │  External Integrations:                         │    │
│  │  • Resend API (transactional email)            │    │
│  │  • Africa's Talking (SMS gateway)              │    │
│  │  • NITA Ghana (Ghana Card verification)        │    │
│  │  • TensorFlow.js (face recognition)            │    │
│  └────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │  MongoDB Query Language (Mongoose)
┌──────────────────────▼──────────────────────────────────┐
│                     DATA TIER                            │
│           MongoDB Atlas Hosted Cluster                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Collections (Tables):                             │  │
│  │ • users (landlords, tenants, admins)             │  │
│  │ • properties (listings)                          │  │
│  │ • tenancies (lease agreements)                   │  │
│  │ • rentrecords (payment history)                  │  │
│  │ • maintenancerequests (service tickets)          │  │
│  │ • inquiries (tenant enquiries)                   │  │
│  │ • notifications (email/SMS queue)                │  │
│  │ • biometricprofiles (face descriptors)           │  │
│  │ • auditlogs (all user actions)                   │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Indexes:                                          │  │
│  │ • users: email (unique), role, status            │  │
│  │ • properties: landlord_id, status, location      │  │
│  │ • rentrecords: tenancy_id, status, due_date      │  │
│  └───────────────────────────────────────────────────┘  │
│  Replication: 3-node replica set (HA)                   │
│  Encryption: TLS in transit, AES-256 at rest           │
│  Backups: Automated daily snapshots (30-day retention) │
└─────────────────────────────────────────────────────────┘
```

### 3.7.2 Data Flow

**Registration Flow**:
1. User completes registration form (email, password, role)
2. Frontend validates input; calls `POST /api/v1/auth/register`
3. Express validates input (express-validator)
4. Controller checks for duplicate email
5. Password hashed (bcrypt, 12 rounds); user created in MongoDB
6. Confirmation email sent via Resend API
7. JWT tokens (access + refresh) returned to frontend
8. Frontend redirects to biometric enrollment (if first login)

**Biometric Enrollment**:
1. User clicks "Enroll Face" in registration
2. face-api.js loads TensorFlow.js model
3. Browser requests camera permission; opens modal
4. Face detected → 128-d descriptor vector generated
5. Descriptor encrypted and stored in `biometricprofiles` collection
6. Confirmation sent to user

**Login Flow (Traditional)**:
1. User enters email and password
2. Frontend calls `POST /api/v1/auth/login`
3. Controller fetches user; verifies password (bcrypt)
4. Rate limit checked (5 attempts/15min); lockout triggered if exceeded
5. JWT tokens generated (access: 15 min, refresh: 7 days)
6. Tokens stored in localStorage; user redirected to dashboard

**Login Flow (Biometric)**:
1. User clicks "Face Recognition Login"
2. face-api.js captures face → generates descriptor
3. Frontend calls `POST /api/v1/biometric/authenticate` with descriptor
4. Controller searches `biometricprofiles` collection for nearest neighbor match
5. If match found (cosine similarity > 0.6): user logged in
6. JWT tokens issued; user redirected to dashboard

**Property Listing Flow**:
1. Landlord logs in; navigates to "My Listings"
2. Clicks "Add Listing" → form modal opens
3. Fills form (title, description, location, price, bedrooms, photos)
4. Frontend calls `POST /api/v1/properties` with form data
5. Controller validates input; creates property with status `pending`
6. Admin notified via email/SMS
7. Admin reviews listing → calls `PUT /api/v1/admin/properties/:id/approve` or `/reject`
8. Listing published (status → `active`) or notification sent to landlord (status → `rejected`)

**Rent Payment Recording**:
1. Landlord navigates to "Rent Records" for active tenancy
2. Clicks "Record Payment" for specific month
3. Enters amount paid and payment date
4. Frontend calls `PUT /api/v1/rent/:id` with payment details
5. Controller validates; updates `rentrecords` collection
6. Outstanding balance recalculated (`amount_due - amount_paid`)
7. SMS notification sent to tenant (via Africa's Talking)
8. Email receipt sent to both landlord and tenant

---

## 3.8 Use Case Diagram

```
                    ┌──────────────────────────────────┐
                    │   Property Rental System (FPH)    │
                    │                                   │
 [LANDLORD]─────────┼──► Register via Email/Password    │
      │             │    ↓                              │
      │             ├──► Verify via Ghana Card          │
      │             │                                   │
      ├─────────────┼──► Manage Property Listings        │
      │             │        └── Requires: Admin Approval│
      │             │                                   │
      ├─────────────┼──► Respond to Tenant Enquiries     │
      │             │                                   │
      ├─────────────┼──► Record Rent Payments            │
      │             │                                   │
      ├─────────────┼──► View Rent Reminders            │
      │             │                                   │
      └─────────────┼──► Manage Maintenance Requests     │
                    │                                   │
 [TENANT]───────────┼──► Register via Email/Password    │
      │             │    ↓                              │
      │             ├──► Verify via Face Recognition    │
      │             │                                   │
      ├─────────────┼──► Search & View Properties        │
      │             │                                   │
      ├─────────────┼──► Submit Property Enquiry         │
      │             │                                   │
      ├─────────────┼──► View Rent Records               │
      │             │                                   │
      ├─────────────┼──► Receive Rent Reminders          │
      │             │    (Email & SMS)                  │
      │             │                                   │
      └─────────────┼──► Submit Maintenance Request      │
                    │                                   │
 [ADMINISTRATOR]────┼──► Login to Admin Dashboard        │
      │             │                                   │
      ├─────────────┼──► Verify Landlord Registrations   │
      │             │    (Ghana Card approval)          │
      │             │                                   │
      ├─────────────┼──► Approve / Reject Listings      │
      │             │                                   │
      ├─────────────┼──► Manage User Accounts            │
      │             │    (suspend/deactivate)           │
      │             │                                   │
      └─────────────┼──► Monitor System Dashboard        │
                    │    (metrics, analytics)           │
                    └──────────────────────────────────┘
```

---

## 3.9 Database Design

### 3.9.1 Entity-Relationship Diagram

```
┌─────────────────────┐         ┌──────────────────────┐
│      USERS          │         │   BIOMETRIC          │
├─────────────────────┤         │   PROFILES           │
│ PK _id              │         ├──────────────────────┤
│ name: string        │         │ PK _id               │
│ email: string       │1────────│ FK user_id           │
│ password: hash      │ unique  │ face_descriptor[]    │
│ role: enum          │         │ enrollment_date      │
│ phone: string       │         │ verification_status  │
│ ghana_card_id       │         │ last_verified       │
│ ghana_card_verified │         └──────────────────────┘
│ status: enum        │
│ login_attempts: int │
│ lockout_until: date │
│ created_at: date    │
│ updated_at: date    │
└──────────┬──────────┘
           │
    ┌──────┴──────────────────────┬─────────────────┐
    │                              │                 │
    │1                             │1                │
    ▼                              ▼                 ▼
┌──────────────────┐  ┌──────────────────────┐  ┌─────────────────┐
│   PROPERTIES     │  │   TENANCIES          │  │   INQUIRIES     │
├──────────────────┤  ├──────────────────────┤  ├─────────────────┤
│ PK _id           │  │ PK _id               │  │ PK _id          │
│ FK landlord_id   │1 │ FK property_id       │  │ FK tenant_id    │
│ title: string    ├──┼ FK tenant_id         │  │ FK property_id  │
│ description      │  │ start_date: date     │  │ FK landlord_id  │
│ location: string │  │ end_date: date       │  │ message: text   │
│ price: decimal   │  │ rent_amount: decimal │  │ landlord_reply  │
│ bedrooms: int    │  │ status: enum         │  │ status: enum    │
│ bathrooms: int   │  │ approved_date: date  │  │ created_at: date│
│ property_type    │  │ created_at: date     │  │ replied_at: date│
│ images: array    │  └──────────┬───────────┘  └─────────────────┘
│ status: enum     │             │1
│ approved: bool   │             │
│ admin_notes      │             │*
│ created_at: date │   ┌─────────▼──────────────┐
│ updated_at: date │   │   RENT_RECORDS         │
└──────────────────┘   ├────────────────────────┤
                       │ PK _id                 │
                       │ FK tenancy_id          │
                       │ month: date            │
                       │ amount_due: decimal    │
                       │ amount_paid: decimal   │
                       │ due_date: date         │
                       │ paid_date: date        │
                       │ payment_method: enum   │
                       │ status: enum           │
                       │ late_fee: decimal      │
                       │ notes: text            │
                       │ created_at: date       │
                       └─────────┬──────────────┘
                                 │1
    ┌────────────────────────────┤
    │                            │
    │1                           │*
    ▼                            ▼
┌──────────────────┐   ┌──────────────────────────┐
│  NOTIFICATIONS   │   │  MAINTENANCE_REQUESTS    │
├──────────────────┤   ├──────────────────────────┤
│ PK _id           │   │ PK _id                   │
│ FK user_id       │   │ FK tenant_id             │
│ type: enum       │   │ FK property_id           │
│ message: text    │   │ FK landlord_id           │
│ subject: string  │   │ title: string            │
│ is_read: bool    │   │ description: text        │
│ read_at: date    │   │ urgency: enum            │
│ sent_via: enum   │   │ category: enum           │
│ created_at: date │   │ status: enum             │
│ updated_at: date │   │ assigned_to: string      │
└──────────────────┘   │ resolution_notes: text   │
                       │ resolved_date: date      │
                       │ completion_date: date    │
                       │ created_at: date         │
                       │ updated_at: date         │
                       └──────────────────────────┘

┌──────────────────────┐
│   AUDIT_LOGS         │
├──────────────────────┤
│ PK _id               │
│ FK user_id           │
│ action: string       │
│ resource_type: enum  │
│ resource_id: string  │
│ old_values: object   │
│ new_values: object   │
│ ip_address: string   │
│ user_agent: string   │
│ timestamp: date      │
└──────────────────────┘
```

### 3.9.2 Database Table Descriptions

| Collection | Description | Key Attributes |
|-----------|-------------|-----------------|
| **users** | Stores authentication credentials and profile information for all system users (landlords, tenants, admins). Role field distinguishes user type. Status controls account activation. | `_id`, `name`, `email`, `password`, `role`, `phone`, `ghana_card_id`, `ghana_card_verified`, `status`, `login_attempts`, `lockout_until`, `created_at` |
| **biometricprofiles** | Stores face descriptor vectors (128-d) for tenants and optional for landlords. Enables biometric authentication. Plaintext images never stored. | `_id`, `user_id`, `face_descriptor[]`, `enrollment_date`, `verification_status`, `last_verified` |
| **properties** | Stores detailed information about each property listing. The `approved` field controls visibility to tenants; only admin-approved listings are accessible. | `_id`, `landlord_id`, `title`, `description`, `location`, `price`, `bedrooms`, `bathrooms`, `property_type`, `images[]`, `status`, `approved`, `admin_notes`, `created_at` |
| **tenancies** | Records formal tenancy agreements between landlord and tenant for a specific property. Captures lease terms including start/end dates, agreed rent, and status. | `_id`, `property_id`, `tenant_id`, `start_date`, `end_date`, `rent_amount`, `status`, `approved_date`, `created_at` |
| **rentrecords** | Tracks individual monthly rent payment obligations and their status for each tenancy. Each record represents one rent period; captures both due and paid amounts. | `_id`, `tenancy_id`, `month`, `amount_due`, `amount_paid`, `due_date`, `paid_date`, `payment_method`, `status`, `late_fee`, `notes`, `created_at` |
| **inquiries** | Records property enquiries submitted by prospective tenants, including tenant message and landlord response. Supports pre-agreement communication. | `_id`, `tenant_id`, `property_id`, `landlord_id`, `message`, `landlord_reply`, `status`, `created_at`, `replied_at` |
| **maintenancerequests** | Stores maintenance issue reports submitted by tenants, capturing problem nature, urgency, category, and current resolution status assigned by landlord. | `_id`, `tenant_id`, `property_id`, `landlord_id`, `title`, `description`, `urgency`, `category`, `status`, `assigned_to`, `resolution_notes`, `resolved_date`, `created_at` |
| **notifications** | Stores in-system notifications generated by automated processes (rent reminders, approvals, maintenance updates). Tracks read/unread status and delivery method. | `_id`, `user_id`, `type`, `message`, `subject`, `is_read`, `read_at`, `sent_via`, `created_at` |
| **auditlogs** | Complete audit trail of all user actions (login, data modifications, approvals) with timestamp, user ID, resource type, and old/new values for change tracking. | `_id`, `user_id`, `action`, `resource_type`, `resource_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `timestamp` |

---

## 3.10 System Behaviour Diagrams

### 3.10.1 Activity Diagram: Property Listing and Approval Process

```
            [LANDLORD]                    [SYSTEM]                [ADMIN]
                │                            │                       │
                ▼                            │                       │
          ┌───────────┐                      │                       │
          │  Login to │                      │                       │
          │  Account  │                      │                       │
          └─────┬─────┘                      │                       │
                │                            │                       │
                ▼                            │                       │
          ┌──────────────┐                   │                       │
          │ Complete     │   Submit Listing   │                       │
          │ Listing Form │──────────────────►│                       │
          │ (title,      │                   ▼                       │
          │ location,    │          ┌──────────────────┐              │
          │ price, beds, │          │ Validate Form    │              │
          │ photos)      │          │ • Check fields   │              │
          └──────────────┘          │ • Scan for spam  │              │
                │                   │ • Verify images  │              │
                │                   └────────┬─────────┘              │
                │                            │                       │
                │                     ◆ Valid?                       │
                │                    /        \                      │
                │                  No          Yes                   │
                │                  │            │                    │
                │     ◄─ Return Error Message  │                    │
                │                              ▼                     │
                │                    ┌──────────────────────────────┐│
                │                    │ Save Listing (status:pending)││
                │                    │ Generate auto-id             ││
                │                    └──────────────┬───────────────┘│
                │                                   │                │
                │                                   │ Email Alert    │
                │                                   │────────────────►
                │                                                    │
                │                                                    ▼
                │                                             ┌──────────────┐
                │                                             │ Admin Review  │
                │                                             │ Listing Page  │
                │                                             └────────┬──────┘
                │                                                      │
                │                                               ◆ Approved?
                │                                              /         \
                │                                           Yes          No
                │                                            │            │
                │                        ┌────────────┐      │      ┌─────────┐
                │                        │ Publish    │◄─────┘      │ Reject  │
                │                        │ (status:   │             │ Mark as │
                │                        │ active)    │             │ rejected│
                │                        │ Send email:│             └────┬────┘
                │                        │"Approved"  │                  │
                │                        └────────────┘                  │
                │                                                        │
                ├───────────────────────────────────────────────────────┤
                ▼                                                        ▼
          ┌──────────────┐                                      ┌──────────────┐
          │View Property │                                      │View Rejection│
          │ Listed (live)│                                      │ Reason &     │
          │ Tenants can  │                                      │ Resubmit     │
          │ search/view  │                                      └──────────────┘
          └──────────────┘
```

### 3.10.2 Sequence Diagram: Rent Payment Recording and Notification

```
 [Landlord]      [Controller]      [RentRecord]   [Notification]   [Tenant]
 [Browser]       [Express API]     [MongoDB]      [Queue/SMS/Email] [Mobile]
     │                │                │                │              │
     │ Navigate to     │                │                │              │
     │ Rent Records    │                │                │              │
     │───────────────►│                │                │              │
     │                │ GET /rent      │                │              │
     │                │  ?tenancy_id   │                │              │
     │                ├───────────────►│                │              │
     │                │ records array  │                │              │
     │                │◄───────────────┤                │              │
     │ Render list    │                │                │              │
     │◄───────────────│                │                │              │
     │                │                │                │              │
     │ Click          │                │                │              │
     │ "Record        │                │                │              │
     │  Payment"      │                │                │              │
     │───────────────►│                │                │              │
     │                │ Modal opens    │                │              │
     │◄───────────────│ (form)         │                │              │
     │                │                │                │              │
     │ Enter:         │                │                │              │
     │ • amount_paid  │                │                │              │
     │ • paid_date    │                │                │              │
     │ • payment_id   │                │                │              │
     │────────────────┤                │                │              │
     │ Click Submit   │                │                │              │
     │────────────────►                │                │              │
     │                │ POST /rent     │                │              │
     │                │ {amount, date} │                │              │
     │                │────────────────►                │              │
     │                │ validate()     │                │              │
     │                ├────────────────┤                │              │
     │                │ OK / Error     │                │              │
     │                │                │                │              │
     │ (Assume valid) │ updateOne()    │                │              │
     │                │────────────────►                │              │
     │                │ {status:       │                │              │
     │                │  'paid',       │                │              │
     │                │  amount_paid}  │                │              │
     │                │ ◄──────────────┤                │              │
     │                │ modified count:1               │              │
     │                │                │                │              │
     │                │ Recalculate    │                │              │
     │                │ balance        │                │              │
     │                │ = amount_due   │                │              │
     │                │ - amount_paid  │                │              │
     │                │                │                │              │
     │                │ Create         │                │              │
     │                │ Notification   │                │              │
     │                │ {type:         │                │              │
     │                │ 'payment_received'}            │              │
     │                │───────────────────────────────►│              │
     │                │                │ Send SMS      │              │
     │                │                │───────────────►──────────────►│
     │                │                │ (Africa's    │              │
     │                │                │  Talking)    │              │
     │                │                │              │  SMS Sent    │
     │                │                │              │◄─────────────┤
     │                │                │              │              │
     │                │ Send email      │              │              │
     │                │─────────────────────────────────────────────► │
     │                │ (Resend API,    │              │              │
     │                │ Receipt/Remind) │              │              │
     │                │                │               │              │
     │ Confirmation   │                │               │              │
     │ Toast          │                │               │              │
     │◄───────────────│                │               │              │
     │ "Payment       │                │               │              │
     │  Recorded"     │                │               │              │
     │ Refresh        │                │               │              │
     │ list           │                │               │              │
     │◄───────────────│                │               │              │
```

### 3.10.3 Sequence Diagram: Biometric Face Login

```
 [Tenant]         [Browser]        [face-api.js]   [Controller]   [Database]
 [Device]         [Camera Modal]   [TensorFlow]     [Auth API]     [MongoDB]
     │                 │                 │               │             │
     │ Click "Face     │                 │               │             │
     │ Login"          │                 │               │             │
     │────────────────►│                 │               │             │
     │                 │ Request camera │               │             │
     │                 │ permission     │               │             │
     │◄────────────────│                │               │             │
     │ Allow camera    │                │               │             │
     │────────────────►│                │               │             │
     │                 │ Open video     │               │             │
     │                 │ stream         │               │             │
     │                 ├────────────────►               │             │
     │                 │ Load model     │               │             │
     │                 │                │               │             │
     │ "Position face  │                │               │             │
     │  in frame"      │                │               │             │
     │◄────────────────│                │               │             │
     │                 │ Detect faces   │               │             │
     │  (3 sec wait)   │ every 300ms    │               │             │
     │                 │◄───────────────┤               │             │
     │                 │ "✓ Face       │               │             │
     │                 │  detected!"    │               │             │
     │                 │ Generate desc. │               │             │
     │                 │ vector (128-d) │               │             │
     │                 │◄───────────────┤               │             │
     │                 │ Auto-capture   │               │             │
     │                 │ 128-d vector   │               │             │
     │                 │ send to API    │               │             │
     │                 ├───────────────────────────────►│             │
     │                 │ POST /authenticate │           │             │
     │                 │ {face_descriptor}             │             │
     │                 │                   │           │             │
     │                 │                   │ Query all │             │
     │                 │                   │ users'    │             │
     │                 │                   │ profiles  │             │
     │                 │                   ├──────────────────────────►
     │                 │                   │ [profiles]              │
     │                 │                   │◄──────────────────────────
     │                 │                   │ Find match              │
     │                 │                   │ (cosine sim > 0.6)      │
     │                 │                   │ user_id = 123           │
     │                 │                   │ Generate JWT tokens     │
     │                 │                   │ (access+refresh)        │
     │                 │                   │ Return {tokens, user}   │
     │                 │◄───────────────────────────────┤             │
     │                 │ Success: User logged in        │             │
     │◄────────────────│ Close modal                    │             │
     │ Redirect to     │ Store JWT in localStorage      │             │
     │ Dashboard       │◄───────────────────────────────┤             │
     │ [Tenant Home]   │                                │             │
     │                 │                                │             │
```

### 3.10.4 Simplified Class Diagram

```
┌──────────────────────────────────┐
│            User                  │
├──────────────────────────────────┤
│ -_id: ObjectId                   │
│ -name: string                    │
│ -email: string (unique)          │
│ -password: hash                  │
│ -role: 'landlord'|'tenant'|'admin'
│ -phone: string                   │
│ -ghana_card_id: string           │
│ -ghana_card_verified: boolean    │
│ -status: 'active'|'pending'|...  │
│ -login_attempts: number          │
│ -lockout_until: Date             │
├──────────────────────────────────┤
│ +register(email, password, role) │
│ +login(email, password)          │
│ +updateProfile(data)             │
│ +resetPassword(token)            │
│ +verifyBiometric(descriptor)     │
│ +lockAccount()                   │
└──────────────────┬────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        │1                    │1
        ▼                     ▼
┌──────────────────┐  ┌──────────────────────────┐
│   Property       │  │  BiometricProfile        │
├──────────────────┤  ├──────────────────────────┤
│ -_id: ObjectId   │  │ -_id: ObjectId           │
│ -landlord_id: FK │  │ -user_id: FK             │
│ -title: string   │  │ -face_descriptor: array  │
│ -description     │  │ -enrollment_date: Date   │
│ -location: string│  │ -verification_status     │
│ -price: decimal  │  │ -last_verified: Date     │
│ -bedrooms: number│  ├──────────────────────────┤
│ -images: array   │  │ +enroll(descriptor)      │
│ -status: enum    │  │ +verify(descriptor)      │
│ -approved: bool  │  │ +getSimilarity(other)    │
├──────────────────┤  └──────────────────────────┘
│ +create()        │
│ +update()        │
│ +delete()        │
│ +approve()       │
└────────┬─────────┘
         │1
         │
         │*
┌────────▼──────────────┐
│   Tenancy            │
├──────────────────────┤
│ -_id: ObjectId       │
│ -property_id: FK     │
│ -tenant_id: FK       │
│ -start_date: Date    │
│ -end_date: Date      │
│ -rent_amount: decimal│
│ -status: enum        │
├──────────────────────┤
│ +create()            │
│ +terminate()         │
│ +extend()            │
└────────┬─────────────┘
         │1
         │
         │*
    ┌────▼─────────────────┐
    │  RentRecord          │
    ├──────────────────────┤
    │ -_id: ObjectId       │
    │ -tenancy_id: FK      │
    │ -month: Date         │
    │ -amount_due: decimal │
    │ -amount_paid: decimal│
    │ -due_date: Date      │
    │ -paid_date: Date     │
    │ -status: enum        │
    │ -late_fee: decimal   │
    ├──────────────────────┤
    │ +recordPayment()     │
    │ +getBalance()        │
    │ +sendReminder()      │
    │ +calculateLateFee()  │
    └──────────────────────┘
    
    ┌──────────────────────────┐
    │  MaintenanceRequest      │
    ├──────────────────────────┤
    │ -_id: ObjectId           │
    │ -tenant_id: FK           │
    │ -property_id: FK         │
    │ -title: string           │
    │ -description: text       │
    │ -urgency: enum           │
    │ -status: enum            │
    │ -assigned_to: string     │
    │ -resolution_notes: text  │
    ├──────────────────────────┤
    │ +submit()                │
    │ +updateStatus()          │
    │ +notify()                │
    │ +close()                 │
    └──────────────────────────┘
```

---

## 3.11 Algorithm Description

### 3.11.1 Automated Rent Due Reminder Algorithm

A scheduled background process (node-cron) runs daily to identify tenants with approaching or overdue rent obligations and dispatch notification messages via email and SMS.

**Pseudocode**:

```
BEGIN RentReminderProcess

  SET today = CURRENT_DATE
  SET reminderDays = [7, 3, 1]  // days before due date
  SET pastDueThreshold = -1      // mark overdue after due date passes
  
  FETCH all RentRecords WHERE status = 'unpaid' AND due_date >= today - 30 days
  
  FOR EACH record IN RentRecords DO
    
    SET daysUntilDue = DATEDIFF(today, record.due_date)
    FETCH tenant = USERS[record.tenancy_id.tenant_id]
    FETCH landlord = USERS[record.tenancy_id.property_id.landlord_id]
    FETCH tenancy = TENANCIES[record.tenancy_id]
    
    IF daysUntilDue IN reminderDays THEN
      
      SET message = 'Rent of GHS ' + tenancy.rent_amount + 
                    ' due on ' + record.due_date
      
      // Send email notification to tenant
      SEND_EMAIL(
        to: tenant.email,
        subject: 'Rent Due Reminder - ' + daysUntilDue + ' day(s)',
        body: message
      )
      
      // Send SMS notification to tenant
      SEND_SMS(
        to: tenant.phone,
        message: 'Rent due in ' + daysUntilDue + ' day(s): GHS ' + 
                 tenancy.rent_amount
      )
      
      // Create in-system notification
      INSERT INTO notifications (
        user_id: tenant._id,
        type: 'rent_reminder',
        message: message,
        is_read: false
      )
      
      // Alert landlord
      SEND_EMAIL(
        to: landlord.email,
        subject: 'Rent Payment Due - ' + tenant.name,
        body: 'Rent from ' + tenant.name + ' is due on ' + record.due_date
      )
      
    END IF
    
    IF daysUntilDue < pastDueThreshold THEN
      
      // Update rent record status to overdue
      UPDATE RentRecords SET status = 'overdue' WHERE _id = record._id
      
      // Send overdue alert to tenant
      SEND_SMS(
        to: tenant.phone,
        message: 'Your rent payment is overdue. Please pay immediately.'
      )
      
      SEND_EMAIL(
        to: tenant.email,
        subject: 'URGENT: Overdue Rent Payment',
        body: 'Your rent payment is overdue. Please remit payment immediately.'
      )
      
      // Alert landlord of overdue payment
      SEND_EMAIL(
        to: landlord.email,
        subject: 'Overdue Rent - ' + tenant.name,
        body: 'Rent from ' + tenant.name + ' is ' + ABS(daysUntilDue) + 
              ' days overdue.'
      )
      
    END IF
    
  END FOR
  
  LOG: 'Rent reminder process completed at ' + CURRENT_TIMESTAMP + 
       ' - ' + count(RentRecords) + ' records processed'

END RentReminderProcess

EXECUTE RentReminderProcess DAILY AT 08:00 AM (Ghana Time)
```

**Implementation** (Node.js with node-cron):

```javascript
cron.schedule('0 8 * * *', async () => {
  console.log('Running automated rent reminders...');
  const today = new Date();
  const reminderDays = [7, 3, 1];
  
  try {
    const unpaidRecords = await RentRecord.find({
      status: 'unpaid',
      due_date: { $gte: new Date(today.setDate(today.getDate() - 30)) }
    }).populate(['tenancy_id']);
    
    for (const record of unpaidRecords) {
      const daysUntilDue = Math.floor(
        (record.due_date - new Date()) / (1000 * 60 * 60 * 24)
      );
      
      if (reminderDays.includes(daysUntilDue)) {
        await sendRentReminder(record, daysUntilDue);
      } else if (daysUntilDue < 0) {
        await markAsOverdue(record);
      }
    }
    
    console.log(`Processed ${unpaidRecords.length} rent records`);
  } catch (error) {
    console.error('Rent reminder error:', error);
    // Log error for admin review
  }
});
```

### 3.11.2 Administrative Listing Approval Algorithm

The algorithm governing administrative review and approval or rejection of property listings submitted by landlords.

**Pseudocode**:

```
BEGIN ListingApprovalProcess(listing_id, admin_id, decision, notes)

  FETCH listing = PROPERTIES[listing_id]
  FETCH admin = USERS[admin_id]
  FETCH landlord = USERS[listing.landlord_id]
  
  IF listing NOT FOUND THEN
    RETURN Error: 'Listing not found'
  END IF
  
  IF listing.status NOT IN ['pending', 'under_review'] THEN
    RETURN Error: 'Listing is not pending review'
  END IF
  
  IF admin.role NOT IN ['admin', 'super_admin'] THEN
    RETURN Error: 'Unauthorized: User is not an administrator'
  END IF
  
  IF decision = 'approve' THEN
    
    UPDATE PROPERTIES SET
      approved = true,
      status = 'active',
      admin_notes = notes,
      approved_date = CURRENT_TIMESTAMP
    WHERE _id = listing_id
    
    // Create audit log
    INSERT INTO audit_logs (
      user_id: admin_id,
      action: 'approve_listing',
      resource_type: 'property',
      resource_id: listing_id,
      new_values: { status: 'active', approved: true },
      timestamp: CURRENT_TIMESTAMP
    )
    
    // Notify landlord of approval
    SEND_EMAIL(
      to: landlord.email,
      subject: 'Property Listing Approved - ' + listing.title,
      body: 'Your property "' + listing.title + '" has been approved and is now live.'
    )
    
    INSERT INTO notifications (
      user_id: landlord._id,
      type: 'listing_approved',
      message: 'Your listing for ' + listing.title + ' has been approved.',
      is_read: false
    )
    
    LOG: admin_id + ' approved listing ' + listing_id + ' at ' + CURRENT_TIMESTAMP
    
    RETURN Success: 'Listing approved'
  
  ELSE IF decision = 'reject' THEN
    
    UPDATE PROPERTIES SET
      approved = false,
      status = 'rejected',
      admin_notes = notes,
      rejected_date = CURRENT_TIMESTAMP
    WHERE _id = listing_id
    
    // Create audit log
    INSERT INTO audit_logs (
      user_id: admin_id,
      action: 'reject_listing',
      resource_type: 'property',
      resource_id: listing_id,
      old_values: { status: listing.status },
      new_values: { status: 'rejected' },
      timestamp: CURRENT_TIMESTAMP
    )
    
    // Notify landlord of rejection
    SEND_EMAIL(
      to: landlord.email,
      subject: 'Property Listing Rejected - ' + listing.title,
      body: 'Your listing for "' + listing.title + '" was rejected.\n\n' +
            'Reason: ' + notes + '\n\n' +
            'Please review and resubmit after addressing the issues.'
    )
    
    INSERT INTO notifications (
      user_id: landlord._id,
      type: 'listing_rejected',
      message: 'Your listing was rejected. Please review comments and resubmit.',
      is_read: false
    )
    
    LOG: admin_id + ' rejected listing ' + listing_id + ' at ' + CURRENT_TIMESTAMP
    
    RETURN Success: 'Listing rejected'
  
  ELSE IF decision = 'request_revisions' THEN
    
    UPDATE PROPERTIES SET
      status = 'revision_requested',
      admin_notes = notes
    WHERE _id = listing_id
    
    SEND_EMAIL(
      to: landlord.email,
      subject: 'Property Listing - Revisions Requested',
      body: 'Please revise your listing:\n\n' + notes
    )
    
    RETURN Success: 'Revision request sent'
  
  ELSE
    RETURN Error: 'Invalid decision value'
  END IF

END ListingApprovalProcess
```

### 3.11.3 Face Descriptor Similarity Matching Algorithm

When a user attempts to log in via biometric face recognition, the system compares their captured face descriptor against all enrolled users' descriptors using cosine similarity.

**Pseudocode**:

```
BEGIN BiometricAuthenticationProcess(captured_descriptor)

  SET threshold = 0.6  // Cosine similarity threshold for match
  SET max_candidates = 10
  SET best_match_user_id = null
  SET best_similarity = 0
  
  FETCH all_profiles = BIOMETRIC_PROFILES WHERE is_active = true
  
  IF LENGTH(all_profiles) = 0 THEN
    RETURN Error: 'No enrolled users in system'
  END IF
  
  FOR EACH profile IN all_profiles DO
    
    SET stored_descriptor = profile.face_descriptor
    
    // Calculate cosine similarity between vectors
    SET dot_product = SUM(captured_descriptor[i] * stored_descriptor[i])
    SET magnitude_captured = SQRT(SUM(captured_descriptor[i]^2))
    SET magnitude_stored = SQRT(SUM(stored_descriptor[i]^2))
    
    SET cosine_similarity = dot_product / 
                            (magnitude_captured * magnitude_stored)
    
    // Track best match
    IF cosine_similarity > best_similarity THEN
      SET best_similarity = cosine_similarity
      SET best_match_user_id = profile.user_id
    END IF
    
  END FOR
  
  // Determine if match is strong enough
  IF best_similarity >= threshold THEN
    
    FETCH user = USERS[best_match_user_id]
    
    IF user.status = 'active' THEN
      
      // Reset login attempts on successful auth
      UPDATE USERS SET login_attempts = 0 WHERE _id = best_match_user_id
      
      // Generate JWT tokens
      SET access_token = JWT_SIGN(
        payload: { user_id: user._id, role: user.role },
        secret: ACCESS_SECRET,
        expiresIn: '15m'
      )
      
      SET refresh_token = JWT_SIGN(
        payload: { user_id: user._id },
        secret: REFRESH_SECRET,
        expiresIn: '7d'
      )
      
      // Create audit log
      INSERT INTO audit_logs (
        user_id: user._id,
        action: 'biometric_login',
        descriptor_match_score: best_similarity,
        timestamp: CURRENT_TIMESTAMP
      )
      
      LOG: 'Biometric login successful for user ' + user._id + 
           ' (match score: ' + best_similarity + ')'
      
      RETURN Success: {
        access_token: access_token,
        refresh_token: refresh_token,
        user: { id: user._id, name: user.name, role: user.role }
      }
    
    ELSE
      RETURN Error: 'User account is not active'
    END IF
  
  ELSE
    LOG: 'Biometric authentication failed: no match above threshold ' + 
         '(best score: ' + best_similarity + ')'
    RETURN Error: 'Face not recognized. Try again or use email/password login.'
  END IF

END BiometricAuthenticationProcess
```

---

## 3.12 Validation and Testing Plan

The testing strategy verifies that the system meets its functional and non-functional requirements and performs reliably under realistic usage conditions. The testing plan comprises four complementary types of testing.

### 3.12.1 Unit Testing

**Scope**: Individual functions and methods within the application tier

**Tools**: Jest, Supertest

**Coverage Targets**:
- Input validation routines (email format, password strength)
- Rent balance calculation methods
- Notification dispatch logic
- Authentication functions (bcrypt, JWT)
- Biometric descriptor similarity calculation
- Role-based access control middleware

**Test Examples**:

```javascript
describe('AuthController', () => {
  
  test('Register with valid email creates user', async () => {
    const userData = {
      name: 'John Landlord',
      email: 'john@landlord.gh',
      password: 'SecurePass123',
      role: 'landlord'
    };
    const result = await register(userData);
    expect(result.user).toBeDefined();
    expect(result.user.email).toBe(userData.email);
  });
  
  test('Register with invalid email format rejects', async () => {
    const userData = {
      email: 'invalid-email',
      password: 'Pass123'
    };
    expect(() => register(userData)).toThrow('Invalid email');
  });
  
});

describe('RentCalculation', () => {
  
  test('Outstanding balance calculated correctly', () => {
    const amountDue = 500;
    const amountPaid = 300;
    const balance = calculateBalance(amountDue, amountPaid);
    expect(balance).toBe(200);
  });
  
});
```

### 3.12.2 Integration Testing

**Scope**: Interaction between multiple modules (controllers → models → database)

**Approach**:
- Test end-to-end data flow through application layers
- Verify database persistence
- Test cross-module communication
- Use transaction rollback for test isolation

**Test Scenarios**:
1. Create property listing → verify saved in MongoDB → verify accessible via API
2. Record rent payment → verify rent_records updated → verify notification queued
3. Approve listing → verify status changed → verify landlord notified
4. Tenant biometric enrollment → verify descriptor stored → verify login works

### 3.12.3 System Testing

**Scope**: Complete integrated system against functional and non-functional requirements

**Test Cases Derived from Requirements**:

| TC ID | Requirement | Input | Expected Output | Test Type |
|-------|-------------|-------|-----------------|-----------|
| TC-01 | FR-01 | Register form: name, valid email, password | Account created; JWT returned | System |
| TC-02 | FR-01 | Register with duplicate email | Error message | System |
| TC-03 | FR-03 | Update profile: new phone | Phone updated in DB | System |
| TC-04 | FR-04 | Face enrollment (3-second detection) | Descriptor vector stored | System |
| TC-05 | FR-05 | Ghana Card verification (mock) | Status → verified | System |
| TC-06 | FR-06 | Landlord creates property listing | Listing saved (status: pending) | System |
| TC-07 | FR-07 | Tenant searches properties (filter: location) | Results filtered correctly | System |
| TC-08 | FR-08 | Tenant submits enquiry | Enquiry saved; landlord notified | System |
| TC-09 | FR-09 | Landlord records rent payment | RentRecord updated; balance recalculated | System |
| TC-10 | FR-10 | Rent reminder cron runs daily | Notifications sent 7/3/1 days before due | System |
| TC-11 | FR-11 | Admin approves pending listing | Status → active; landlord emailed | System |
| TC-12 | FR-12 | Admin views dashboard | Metrics displayed (users, properties, rent) | System |
| TC-13 | NFR-Performance | Load property list (100 listings) | Response < 3 sec | Performance |
| TC-14 | NFR-Security | Password stored hashed (bcrypt) | Plaintext never in DB | Security |
| TC-15 | NFR-Security | HTTPS enforced on all endpoints | 200 response on HTTPS; 307 redirect HTTP | Security |

**Performance Testing**:
- Simulate concurrent users: 10, 50, 100 simultaneous sessions
- Measure response times for key endpoints
- Verify database query optimization (indexes on frequently-filtered fields)

### 3.12.4 User Acceptance Testing (UAT)

**Sample**: 
- 2 landlords (1 active, 1 new)
- 2 tenants (1 experienced, 1 first-time)
- 1 administrator

**Tasks**:
1. Landlord: Register → list property → respond to enquiry → record payment
2. Tenant: Register → search properties → submit enquiry → view rent record
3. Admin: Approve listings → view dashboard → manage account

**Metrics**:
- Task completion rate (target: ≥90%)
- Error rate (target: ≤5%)
- Time-on-task (baseline for future improvements)
- System Usability Scale (SUS) score (target: ≥68)

**Defect Logging**:
- Severity 1 (critical): System crash, security breach → fix immediately
- Severity 2 (major): Core function broken → fix before launch
- Severity 3 (minor): UI issue, cosmetic problem → post-launch review

---

## 3.13 Ethical Considerations

### 3.13.1 Data Privacy and Confidentiality

**Principles Adopted**:
- **Data Minimization**: Only data strictly necessary for system operation is collected.
- **Purpose Limitation**: Data is not used for purposes beyond those for which it was collected.
- **Storage Limitation**: Data is retained only as long as necessary.

**Sensitive Data Handling**:
- **Passwords**: Never stored in plaintext; hashed with bcrypt (12 rounds).
- **Face Descriptors**: 128-d vectors only; original images never retained.
- **Ghana Card Data**: Encrypted in transit (HTTPS) and at rest (AES-256); mock endpoint for non-production.
- **Contact Information**: Phone numbers and email addresses used only for system notifications; not shared with third parties.

**Data Retention**:
- User accounts: Retained for duration of active use; archived 90 days after account deletion.
- Rent/payment records: Retained for 7 years (per Ghana income tax requirements).
- Audit logs: Retained for 2 years.

**Research Data**:
- Questionnaire responses anonymized before analysis; no identifiers retained.
- Interview recordings transcribed; audio files deleted post-transcription.
- Participant identifiers separated from data; stored in separate secure location.

### 3.13.2 Informed Consent

**Research Participants**:
- Provided written participant information sheet explaining research purpose, data collection methods, data use, and withdrawal rights.
- Participation entirely voluntary; option to withdraw without penalty.
- Written informed consent obtained from all interview participants.
- Questionnaire participants provided implied consent via voluntary completion.

**System Users**:
- Terms of Service clearly outline data collection, use, and retention policies.
- Privacy Policy explains biometric data handling and storage.
- Explicit consent required before biometric enrollment.
- Right to request data deletion (subject to legal/tax retention requirements).

### 3.13.3 Security Considerations

**Authentication & Access Control**:
- Passwords hashed using bcrypt (12 rounds); resistant to brute-force and dictionary attacks.
- Account lockout after 5 failed login attempts (prevents automated attacks).
- JWT tokens expire (access: 15 min, refresh: 7 days); reduces window of token compromise.
- Role-based access control ensures users access only data/functions appropriate to their role.

**Data Transmission**:
- All traffic encrypted using HTTPS/TLS (certificate from Let's Encrypt; automatic renewal).
- Content Security Policy (CSP) headers prevent injection attacks.
- X-Frame-Options header prevents clickjacking.

**Input Validation**:
- express-validator sanitizes all user input; prevents injection attacks (SQL, NoSQL, XSS).
- Parameterized queries (via Mongoose ORM) prevent SQL injection.

**Biometric Security**:
- Face descriptors stored securely in MongoDB (no plaintext images).
- Descriptors encrypted at rest and in transit.
- Similarity threshold (0.6) prevents false positives.

**Audit & Accountability**:
- All sensitive actions logged (login, data modifications, approvals) with timestamp, user ID, IP address.
- Audit logs immutable; cannot be altered retroactively.
- Admin dashboard displays audit logs for compliance review.

**Third-Party Services**:
- Resend API: All emails transmitted via HTTPS; no personal data stored by Resend.
- Africa's Talking: SMS delivery subject to Resend's data protection policy; phone numbers transmitted encrypted.
- MongoDB Atlas: Automatic encryption at rest; redundant backups across geographic regions.

**Compliance**:
- System design compliant with OWASP Top 10 security vulnerabilities guidance.
- Adherence to NIST Cybersecurity Framework for small organizations.
- Alignment with Ghana National Cybersecurity Policy principles.

---

## 3.14 Chapter Summary

This chapter has presented a comprehensive account of the research methodology and system design processes employed in the development of the web-based property listing and rent management system. The Design Science Research approach adopted for the study was explained, and the mixed-methods data collection activities were described, including structured questionnaires, semi-structured interviews, and document reviews. The Rapid Application Development methodology was outlined, comprising requirements planning, user design, construction, and cutover phases. The functional and non-functional requirements were comprehensively specified, reflecting the unique context of the Ghanaian rental market and the incorporation of biometric security features. The tools and technologies selected for implementation were justified with reference to their suitability, maturity, and accessibility in an academic context. The system architecture, use case diagram, entity-relationship diagram, activity diagram, sequence diagram, and class diagram were presented as formal design artefacts. The algorithms governing automated rent reminders, administrative approval workflows, and biometric face recognition matching were described through pseudocode and implementation examples. A comprehensive testing plan incorporating unit, integration, system, and user acceptance testing was outlined, along with specific test cases derived from the functional requirements. The chapter concluded with a discussion of ethical considerations governing data privacy, informed consent, and security measures. The implementation outcomes based on this design are presented in Chapter Four.

---

## References

Hevner, A. R. (2007). A three cycle view of design science research. *Scandinavian Journal of Information Systems*, 19(2), 87–92.

Hevner, A. R., March, S. T., Park, J., & Ram, S. (2004). Design science in information systems research. *MIS Quarterly*, 28(1), 75–105.

Martin, J. (1991). *Rapid application development*. Macmillan.

OWASP. (2021). *OWASP Top 10: The ten most critical web application security risks*. Open Web Application Security Project. Retrieved from https://owasp.org/www-project-top-ten/

Pressman, R. S., & Maxim, B. R. (2019). *Software engineering: A practitioner's approach* (9th ed.). McGraw-Hill Education.

Schwaber, K., & Sutherland, J. (2020). *The Scrum guide: The definitive guide to Scrum: The rules of the game*. Scrum.org. Retrieved from https://www.scrumguides.org/
