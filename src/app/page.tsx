import Link from "next/link";
import Image from "next/image";
import PublicBookingForm from "@/components/booking/PublicBookingForm";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image src="/logo.png" alt="DentalisPMS Logo" width={180} height={50} className="h-14 w-auto" priority />
          </div>
          <p className="mt-1 text-body-sm text-text-hint">
            Book your dental appointment
          </p>
        </div>

        <PublicBookingForm />

        <p className="text-center text-caption text-text-tertiary">
          <Link href="/admin/login" className="hover:text-text-secondary">
            Login as Admin
          </Link>
        </p>
      </div>
    </div>
  );
}
