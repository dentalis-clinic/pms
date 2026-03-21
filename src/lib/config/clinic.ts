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
  timing: "Sat-Thu: 10:00 AM - 2:00 PM, 4:00 PM - 10:00 PM\nFri: 4:00 PM - 10:00 PM",
  phones: [
    "+91-8700510032", "+91-7838344590", "011-45656948",
  ],
  email: "dentalis.delhi@gmail.com",
  website: "www.dentalis.co.in",
  logo: "/logo.png",
} as const;
