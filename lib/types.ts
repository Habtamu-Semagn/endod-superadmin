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
  awaiting_review: ApplicationSummary[];
  /** Submitted company applications; null while TenaCare is not connected or failed. */
  pending_company_applications: number | null;
  companies_connected: boolean;
  errors: string[];
};

export type AuditItem = {
  id: string;
  at: string;
  action: string;
  result: "success" | "failure";
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

export type CompanyApplicationStatus = "draft" | "submitted" | "approved" | "rejected";

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
