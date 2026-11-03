/** Shapes the admin API returns (the hospital service's, passed through). */

export type Stage = "totp" | "enroll" | "full";

export type Me = {
  stage: Stage;
  admin: { id: string; email: string; name: string };
  reauth_valid_until: string | null;
};

export type Contact = { name: string; title?: string | null; email: string; phone?: string | null };

export type ApplicationStatus = "draft" | "submitted" | "rejected" | "approved" | "suspended";

export type ApplicationSummary = {
  hospital_id: string;
  code: string;
  name: string;
  facility_type: string | null;
  ownership: string | null;
  city: string | null;
  status: ApplicationStatus;
  hospital_status: HospitalStatus;
  created_at: string;
  submitted_at: string | null;
  demo_at: string | null;
  contact: Contact | null;
};

export type DocumentItem = {
  kind: string;
  label: string;
  uploaded: boolean;
  filename?: string;
  content_type?: string;
  size?: number;
  uploaded_at?: string | null;
};

export type Application = {
  hospital_id: string;
  code: string;
  name: string;
  status: ApplicationStatus;
  hospital_status: HospitalStatus;
  complete: boolean;
  created_at: string | null;
  submitted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  contact: { full_name: string | null; title: string | null; phone: string | null; email: string | null };
  facility: {
    facility_type: string | null;
    ownership: string | null;
    name: string;
    name_am: string | null;
    city: string | null;
    phone: string | null;
    services: string[];
    open_hours: string | null;
    /**
     * Birr, as text with two decimals ("0.00": free visits). Absent from
     * applications made before the hospital service asked for it; null when
     * not given.
     */
    price_in_person?: string | null;
    /** Set in the hospital's Settings after approval (video visits are optional). */
    price_video?: string | null;
    video_enabled?: boolean;
  };
  location: { address: string | null; latitude: number | null; longitude: number | null };
  documents: { license_number: string | null; items: DocumentItem[] };
  demo: { demo_at: string; timezone: string; minutes: number } | null;
};

export type HospitalStatus = "pending" | "approved" | "suspended";

export type Hospital = {
  id: string;
  code: string;
  name: string;
  name_am: string | null;
  status: HospitalStatus;
  listed: boolean;
  missing_for_listing: string[];
  kind: string | null;
  facility_type: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  services: string[];
  open_hours: string | null;
  created_at?: string;
  contact?: { name: string; email: string; phone: string } | null;
};

export type Dashboard = {
  pending_applications: number | null;
  approved_hospitals: number | null;
  /** Hospitals signed up and not approved yet (any application stage). */
  pending_hospitals: number | null;
  awaiting_review: ApplicationSummary[];
  /** Submitted company applications; null while TenaCare is not connected or failed. */
  pending_company_applications: number | null;
  approved_companies: number | null;
  awaiting_company_review: CompanyApplicationSummary[];
  companies_connected: boolean;
  /** The patient platform's counts; null while it is not connected or failed. */
  platform_connected: boolean;
  platform: PlatformStats | null;
  errors: string[];
};

// --- the patient platform (its /internal/admin API, through the admin API) ---------------

export type PlatformStats = {
  users_total: number;
  users_new_7d: number;
  users_suspended: number;
  bookings_today: number;
  bookings_week: number;
  open_prescriptions: number;
  generated_at: string | null;
};

export type PatientStatus = "active" | "suspended" | "deactivated";

/** A patient account: account data only, never health data. */
export type PatientAccount = {
  dedan_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  status: PatientStatus;
  linked_hospitals: number;
  suspended_at: string | null;
  suspended_reason: string | null;
  suspended_by: string | null;
};

export type PatientSearch = { items: PatientAccount[]; limit: number | null };

export type CardCheck = {
  dedan_id: string;
  issued_at: string | null;
  account_status: PatientStatus;
  signing_available: boolean;
  signature_checked: boolean;
  signature_valid: boolean | null;
  valid: boolean;
};

export type PlatformReport = {
  available: boolean;
  detail?: string;
  status?: string | null;
  database_ok?: boolean | null;
  redis_configured?: boolean | null;
  redis_ok?: boolean | null;
  worker_last_heartbeat?: string | null;
  worker_ok?: boolean | null;
  dead_letters?: number | null;
  outbox_backlog?: number | null;
  outbox_oldest_at?: string | null;
};

export type ServiceHealth = {
  id: "platform" | "hospital" | "tenacare" | "admin";
  name: string;
  ok: boolean;
  detail: string | null;
  latency_ms: number | null;
  checked_at: string;
  report?: PlatformReport;
};

export type SystemHealth = { checked_at: string; ok: boolean; services: ServiceHealth[] };

export type AuditItem = {
  id: string;
  at: string;
  action: string;
  result: "success" | "failure" | "pending";
  admin_id: string | null;
  admin_email: string | null;
  ip: string | null;
  target_type: string | null;
  target_id: string | null;
  target_name: string | null;
  detail: Record<string, unknown> | null;
};

export type AuditPage = {
  items: AuditItem[];
  total: number;
  page: number;
  page_size: number;
  actions: string[];
  totals: { all: number; success: number; failure: number; sign_in_failures: number };
};

export type AdminRow = {
  id: string;
  email: string;
  name: string;
  active: boolean;
  two_factor: boolean;
  locked: boolean;
  last_login_at: string | null;
  created_at: string | null;
};

// --- companies (TenaCare's platform API, docs/company-onboarding.md) ---------------------

export type CompanyApplicationStatus = "draft" | "submitted" | "approved" | "rejected" | "closed";

export type CompanyContact = { full_name: string; title: string | null; phone: string | null; email: string };

export type CompanyApplicationSummary = {
  id: string;
  legal_name: string;
  trade_name: string | null;
  tin: string;
  sector: string;
  employee_count: number;
  city: string | null;
  status: CompanyApplicationStatus;
  submitted_at: string | null;
  updated_at: string | null;
  contact: CompanyContact | null;
  /** Another application or organisation has this TIN (Amendment 1). */
  duplicate_tin: boolean;
  /** TenaCare does not verify emails yet: always false for now. */
  email_verified: boolean;
};

export type CompanyDocument = {
  kind: string;
  filename: string;
  content_type: string;
  size: number;
  uploaded_at: string | null;
};

export type CompanyApplication = CompanyApplicationSummary & {
  business_license_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  documents: CompanyDocument[];
};

export type CompanyStatus = "active" | "suspended";

export type Company = {
  id: string;
  name: string;
  tin: string;
  status: CompanyStatus;
  created_at: string | null;
  employees: number;
  admins: number;
};

/** Endod's service fee (the patient platform's /internal/admin/fees). Money in santim. */
export type FeeChangeRecord = {
  version: number;
  changed_at: string;
  actor_email: string;
  reason: string;
  before: { enabled: boolean; flat_santim: number; percent_bp: number };
  after: { enabled: boolean; flat_santim: number; percent_bp: number };
};

export type FeeSettings = {
  enabled: boolean;
  flat_santim: number;
  percent_bp: number;
  version: number;
  updated_at: string | null;
  updated_by: string | null;
  currency: string;
  example: { subtotal: number; service_fee: number; total: number };
  limits: { max_flat_santim: number; max_percent_bp: number };
  history: FeeChangeRecord[];
};

export type FeeHospitalRow = {
  hospital_id: string;
  hospital_name: string | null;
  payments: number;
  subtotal: number;
  fees_collected: number;
  fees_owed: number;
  fees_settled: number;
  fees_refunded: number;
  owed_entries: number;
  fees_total: number;
};

export type FeeSummary = {
  currency: string;
  from: string | null;
  to: string | null;
  hospitals: FeeHospitalRow[];
  totals: Omit<FeeHospitalRow, "hospital_id" | "hospital_name" | "owed_entries">;
};

export type FeeEntry = {
  id: string;
  source_type: "booking" | "charge";
  source_id: string;
  hospital_id: string;
  hospital_name: string | null;
  dedan_id: string | null;
  subtotal: number;
  fee: number;
  total: number;
  currency: string;
  method: string;
  reference: string | null;
  collected_by: "endod" | "hospital";
  paid_at: string;
  settlement_status: "collected" | "owed" | "settled" | "refunded";
  settled_at: string | null;
  settlement_reference: string | null;
  settled_by: string | null;
};

export type FeeEntries = { items: FeeEntry[]; total: number; limit: number; offset: number };
