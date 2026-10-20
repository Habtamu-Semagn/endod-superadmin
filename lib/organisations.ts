export interface Organisation {
  id: string;
  initials: string;
  name: string;
  shortName: string;
  type: string;
  licenseNumber: string;
  phoneNumber: string;
  city: string;
  address: string;
  facilityCount: number;
  status: "Active" | "Pending" | "Suspended" | "Audit";
  statusBadge: string;
  statusBadgeClass: string;
}

export const organisations: Organisation[] = [
  { id: "stj", initials: "STJ", name: "St. Jude Regional Medical Center", shortName: "St. Jude Regional Center", type: "General Hospital", licenseNumber: "IL-HOSP-9482", phoneNumber: "+1 (312) 555-0142", city: "Chicago", address: "2160 S Ashland Ave, Chicago, IL 60608", facilityCount: 12, status: "Audit", statusBadge: "Audit Level 2", statusBadgeClass: "bg-amber-50 text-amber-800 border border-amber-200" },
  { id: "nvc", initials: "NV", name: "NovaCare Specialized Pediatrics", shortName: "NovaCare Specialized Pediatrics", type: "Pediatrics Clinic", licenseNumber: "TX-CLIN-1049", phoneNumber: "+1 (512) 555-0198", city: "Austin", address: "4800 Burnet Rd, Austin, TX 78756", facilityCount: 4, status: "Pending", statusBadge: "Doc Review", statusBadgeClass: "bg-blue-50 text-blue-700 border border-blue-200" },
  { id: "apx", initials: "AX", name: "Apex Diagnostic Labs Network", shortName: "Apex Diagnostic Labs", type: "Pathology & Lab", licenseNumber: "CA-LAB-8812", phoneNumber: "+1 (408) 555-0173", city: "San Jose", address: "1250 S 10th St, San Jose, CA 95112", facilityCount: 28, status: "Active", statusBadge: "Active", statusBadgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  { id: "bsc", initials: "BS", name: "BioScript Pharmacy Group", shortName: "BioScript Pharmacy Group", type: "Retail Pharmacy", licenseNumber: "FL-PHAR-4401", phoneNumber: "+1 (305) 555-0166", city: "Miami", address: "900 NW 17th Ave, Miami, FL 33136", facilityCount: 62, status: "Active", statusBadge: "Active", statusBadgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
];

export function getOrganisation(id: string): Organisation | undefined {
  return organisations.find((o) => o.id === id);
}
