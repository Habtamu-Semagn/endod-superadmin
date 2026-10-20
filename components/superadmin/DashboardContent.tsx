import { } from "react";

interface DashboardContentProps {}


export default function DashboardContent() {
  return (
    <>
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Super Admin Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Welcome back, System Admin. Real-time infrastructure overview and network activities.</p>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-soft hover:shadow-card transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </div>
              <span className="">Total Organizations</span>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="5" cy="10" r="1.5"></circle><circle cx="10" cy="10" r="1.5"></circle><circle cx="15" cy="10" r="1.5"></circle></svg>
            </button>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">1,248</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <svg className="w-3 h-3 text-emerald-600 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 10l7-7m0 0l7 7m-7-7v18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/></svg>
              +12%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            24 new registered this week
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-soft hover:shadow-card transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </div>
              <span className="">Registered Users</span>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="5" cy="10" r="1.5"></circle><circle cx="10" cy="10" r="1.5"></circle><circle cx="15" cy="10" r="1.5"></circle></svg>
            </button>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">482,910</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <svg className="w-3 h-3 text-emerald-600 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 10l7-7m0 0l7 7m-7-7v18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/></svg>
              +8.4%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            3,410 active sessions today
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-soft hover:shadow-card transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </div>
              <span className="">Active Digital Cards</span>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="5" cy="10" r="1.5"></circle><circle cx="10" cy="10" r="1.5"></circle><circle cx="15" cy="10" r="1.5"></circle></svg>
            </button>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">329,450</span>
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
              <svg className="w-3 h-3 text-emerald-600 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 10l7-7m0 0l7 7m-7-7v18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/></svg>
              +15.2%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            Issued across 42 state regions
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-soft hover:shadow-card transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </div>
              <span className="">Pending Reviews</span>
            </div>
            <button className="text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><circle cx="5" cy="10" r="1.5"></circle><circle cx="10" cy="10" r="1.5"></circle><circle cx="15" cy="10" r="1.5"></circle></svg>
            </button>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">38</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              Action Req.
            </span>
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            14 high priority facility audits
          </p>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-soft">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Organization Growth &amp; Onboarding</h3>
              <button className="text-slate-400 hover:text-slate-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
              </button>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-700"></span> Hospitals &amp; Clinics
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-300"></span> Pharmacies &amp; Labs
              </span>
            </div>
          </div>
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 self-start sm:self-auto">
            <button className="px-3 py-1 rounded-lg bg-teal-700 text-white shadow-2xs">Week</button>
            <button className="px-3 py-1 rounded-lg hover:text-slate-900 transition">Month</button>
            <button className="px-3 py-1 rounded-lg hover:text-slate-900 transition">Year</button>
          </div>
        </div>
        <div className="pt-4 pb-1">
          <div className="relative h-44 w-full">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 600 160">
              <defs>
                <linearGradient id="gradientTeal" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stop-color="#0f766e" stop-opacity="0.15"/>
                  <stop offset="100%" stop-color="#0f766e" stop-opacity="0.0"/>
                </linearGradient>
              </defs>
              <line stroke="#f1f5f9" stroke-dasharray="4 4" stroke-width="1.5" x1="0" x2="600" y1="20" y2="20"/>
              <line stroke="#f1f5f9" stroke-dasharray="4 4" stroke-width="1.5" x1="0" x2="600" y1="65" y2="65"/>
              <line stroke="#f1f5f9" stroke-dasharray="4 4" stroke-width="1.5" x1="0" x2="600" y1="110" y2="110"/>
              <line stroke="#e2e8f0" stroke-width="1.5" x1="0" x2="600" y1="150" y2="150"/>
              <path d="M 0,105 C 100,105 130,55 200,60 C 270,65 300,15 380,25 C 450,35 500,85 600,60 L 600,150 L 0,150 Z" fill="url(#gradientTeal)"/>
              <path d="M 0,105 C 100,105 130,55 200,60 C 270,65 300,15 380,25 C 450,35 500,85 600,60" fill="none" stroke="#0f766e" stroke-linecap="round" stroke-width="3"/>
              <path d="M 0,120 C 100,120 140,140 210,100 C 280,60 320,135 410,120 C 490,110 520,70 600,80" fill="none" stroke="#5eead4" stroke-linecap="round" stroke-width="2.5"/>
              <circle className="cursor-pointer" cx="380" cy="25" fill="#0f766e" r="4.5" stroke="#ffffff" stroke-width="2"/>
              <circle className="cursor-pointer" cx="210" cy="100" fill="#2dd4bf" r="4" stroke="#ffffff" stroke-width="2"/>
            </svg>
            <div className="absolute top-2 left-64 bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded-md shadow-md pointer-events-none transform -translate-x-1/2">
              <span className="font-bold">+148 Hospitals</span> (Peak Verified)
            </div>
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-400 mt-2 px-2">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Organization Approvals Awaiting Review</h3>
            <p className="text-xs text-slate-500">Facilities requiring super admin verification and token issuance</p>
          </div>
          <button className="text-xs font-semibold text-teal-700 hover:text-teal-800 transition">View All 14</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400">
                <th className="py-2.5 px-3">Facility Name</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">License ID</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <tr className="hover:bg-slate-50/80 transition">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center font-bold text-[10px]">STJ</div>
                    <div>
                      <p className="font-bold text-slate-900">St. Jude Regional Medical Center</p>
                      <p className="text-[10px] text-slate-400">Chicago, IL • 450 Beds</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-slate-600 font-medium">General Hospital</td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-500">IL-HOSP-9482</td>
                <td className="py-3 px-3 text-slate-500">Today, 09:20</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pending Level 2</span>
                </td>
                <td className="py-3 px-3 text-right space-x-1.5">
                  <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition shadow-2xs">Approve</button>
                  <button className="px-2 py-1 text-[11px] font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition">Inspect</button>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 border border-sky-100 text-sky-800 flex items-center justify-center font-bold text-[10px]">NV</div>
                    <div>
                      <p className="font-bold text-slate-900">NovaCare Specialized Pediatrics</p>
                      <p className="text-[10px] text-slate-400">Austin, TX • 120 Beds</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-slate-600 font-medium">Specialized Clinic</td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-500">TX-CLIN-1049</td>
                <td className="py-3 px-3 text-slate-500">Yesterday</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Doc Verification</span>
                </td>
                <td className="py-3 px-3 text-right space-x-1.5">
                  <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition shadow-2xs">Approve</button>
                  <button className="px-2 py-1 text-[11px] font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition">Inspect</button>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/80 transition">
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 text-purple-800 flex items-center justify-center font-bold text-[10px]">MP</div>
                    <div>
                      <p className="font-bold text-slate-900">MediPulse Express Pharmacy Chain</p>
                      <p className="text-[10px] text-slate-400">18 Locations • Seattle, WA</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-slate-600 font-medium">Pharmacy Chain</td>
                <td className="py-3 px-3 font-mono text-[11px] text-slate-500">WA-PHAR-8831</td>
                <td className="py-3 px-3 text-slate-500">Oct 24</td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Audit Needed</span>
                </td>
                <td className="py-3 px-3 text-right space-x-1.5">
                  <button className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-teal-700 text-white hover:bg-teal-800 transition shadow-2xs">Approve</button>
                  <button className="px-2 py-1 text-[11px] font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition">Inspect</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Recently Active Facilities</h3>
            <span className="text-[11px] font-semibold text-teal-700">Digital Cards Active</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/20 transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">MH</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">MetroHealth Hub</h4>
                  <p className="text-[10px] text-slate-500">Tier-1 Trauma Center • 62 Doctors</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">Enabled</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/20 transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">AP</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Apex Pathology Labs</h4>
                  <p className="text-[10px] text-slate-500">Diagnostic Hub • 14 Centers</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">Enabled</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/20 transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">CV</div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Crestview Oncology</h4>
                  <p className="text-[10px] text-slate-500">Specialty Hospital • 88 Doctors</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium">Syncing</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Administrative Audit Stream</h3>
            <span className="text-[11px] text-slate-400">Live feed</span>
          </div>
          <div className="relative pl-4 space-y-3.5 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            <div className="relative">
              <span className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-teal-600 ring-4 ring-white"></span>
              <p className="text-xs font-medium text-slate-800">
                <span className="font-bold text-teal-800">Admin Sarah</span> verified St. Jude Regional
              </p>
              <p className="text-[10px] text-slate-400">12 minutes ago • Automated webhook notified</p>
            </div>
            <div className="relative">
              <span className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white"></span>
              <p className="text-xs font-medium text-slate-800">
                Card batch <span className="font-mono font-bold text-slate-700">#9042</span> authorized for MetroHealth
              </p>
              <p className="text-[10px] text-slate-400">45 minutes ago • 5,000 digital health cards</p>
            </div>
            <div className="relative">
              <span className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-sky-500 ring-4 ring-white"></span>
              <p className="text-xs font-medium text-slate-800">
                API token refreshed for <span className="font-bold text-slate-700">Central Health DB</span>
              </p>
              <p className="text-[10px] text-slate-400">2 hours ago • Automated Security Routine</p>
            </div>
          </div>
        </div>
      </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-soft">
          <h3 className="text-sm font-bold text-slate-900 mb-1">System Health &amp; Active Alerts</h3>
          <p className="text-xs text-slate-400 mb-3">Critical updates across distributed clusters</p>
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-100 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <div>
                <p className="text-xs font-bold text-rose-900">North District Card Delay</p>
                <p className="text-[11px] text-rose-700 mt-0.5">2 clinics reporting smart-reader sync lag (&gt;4.2s).</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-100 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <div>
                <p className="text-xs font-bold text-amber-900">Credential Renewals Due</p>
                <p className="text-[11px] text-amber-700 mt-0.5">14 facility digital signatures expire within 48h.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-teal-50/80 border border-teal-100 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <div>
                <p className="text-xs font-bold text-teal-900">Scheduled Ledger Sync</p>
                <p className="text-[11px] text-teal-700 mt-0.5">Routine verification sync programmed at 02:00 UTC.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Verification API Cluster</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 99.99% Operational
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">National Rx Database Sync</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 12ms Latency
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-soft lg:col-span-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900">Network Pulse Today</h3>
            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">Live Data</span>
          </div>
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-teal-800 text-white shadow-md shadow-teal-800/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-teal-200">Total Card Scans</p>
                <p className="text-lg font-extrabold mt-0.5">48,219 <span className="text-xs font-normal text-teal-300">verifications</span></p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-700/60 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-teal-900 text-white shadow-md shadow-teal-900/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-teal-200">Claims Processed</p>
                <p className="text-lg font-extrabold mt-0.5">$1,482,900 <span className="text-xs font-normal text-teal-300">USD</span></p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-800/60 flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
                <span className="text-slate-600">Active Facilities Online</span>
                <span className="text-teal-700">98.4% (1,228 / 1,248)</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-teal-600 h-2 rounded-full" style={{ width: "98.4%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
