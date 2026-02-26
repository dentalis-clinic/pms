/**
 * Clinic configuration for Phase 1 (single clinic).
 * Used in prescription headers, PDF generation, etc.
 *
 * ✏️  Edit the values below with your real clinic details.
 *
 * TODO: Move to a settings page / database in future phases.
 */
export const CLINIC_CONFIG = {
  name: "Dentalis Dental Care by Jamians",
  shortName: "DDCJ",
  address: {
    line1: "D2/2A, Thokar No - 8, Classic Appartment",
    line2: "Tayyab Masjid Road, Shaheen Bagh",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110025",
  },
  timing: "10:00 AM - 2:00 PM",
  phones: [
    "+91 98765 43210",
    "+91 98765 43211",
    "+91 98765 43212",
  ],
  email: "clinic@dentalis.com",
  website: "www.dentalis.com",
  doctorName: "Dr. Umar Farooque",
  doctorQualifications: "BDS, MDS (Prosthodontics)",
  registrationNumber: "DL-12345",
  logo: "/logo.png",
} as const;
