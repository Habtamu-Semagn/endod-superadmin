"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getOrganisation } from "@/lib/organisations";

export default function OrganisationDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || "";
  const org = getOrganisation(id);

  const [fileName, setFileName] = useState<string>("");
  const [uploaded, setUploaded] = useState<boolean>(false);

  if (!org) {
    return (
      <div className="space-y-6">
        <section>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organisation not found</h1>
          <p className="text-xs text-slate-500 mt-1">The requested organisation does not exist.</p>
        </section>
        <button
          onClick={() => router.push("/super-admin/organisations")}
          className="px-4 py-2 text-xs font-semibold bg-[#0d5c52] hover:bg-[#09473f] text-white rounded-xl transition-all shadow-sm"
        >
          Back to Organisations
        </button>
      </div>
    );
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFileName(f.name);
      setUploaded(false);
    }
  };

  const handleUpload = () => {
    if (fileName) setUploaded(true);
  };

  const fields: { label: string; value: string }[] = [
    { label: "Organisation Name", value: org.name },
    { label: "License Number", value: org.licenseNumber },
    { label: "Phone Number", value: org.phoneNumber },
    { label: "City", value: org.city },
    { label: "Address", value: org.address },
    { label: "Type", value: org.type },
    { label: "Facilities", value: String(org.facilityCount) },
    { label: "Status", value: org.statusBadge },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{org.name}</h1>
            <p className="text-xs text-slate-500 mt-1">Organisation details and license documentation.</p>
          </div>
          <button
            onClick={() => router.push("/super-admin/organisations")}
            className="px-4 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm"
          >
            Back to List
          </button>
        </div>
      </section>

      {/* Details */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Organisation Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.label}>
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{f.label}</p>
              <p className="text-sm text-slate-900 mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* License Doc Upload */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">License Document Upload</h3>
        <p className="text-xs text-slate-500 mb-4">Upload the organisation license document (PDF or image).</p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="cursor-pointer px-4 py-2 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-all shadow-sm">
            Choose File
            <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFile} />
          </label>
          <span className="text-xs text-slate-500 truncate max-w-xs">{fileName || "No file selected"}</span>
          <button
            onClick={handleUpload}
            disabled={!fileName}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all shadow-sm ${
              fileName
                ? "bg-[#0d5c52] hover:bg-[#09473f] text-white"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            Upload
          </button>
        </div>
        {uploaded && (
          <p className="mt-3 text-xs font-semibold text-emerald-700">License document uploaded successfully.</p>
        )}
      </section>
    </div>
  );
}
