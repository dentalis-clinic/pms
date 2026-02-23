import Link from "next/link";
import PublicBookingForm from "@/components/PublicBookingForm";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-heading-2 text-brand-950">
            DentalisPMS
          </h1>
          <p className="mt-1 text-body-sm text-neutral-500">
            Book your dental appointment
          </p>
        </div>

        <PublicBookingForm />

        <p className="text-center text-caption text-neutral-400">
          <Link href="/admin/login" className="hover:text-neutral-600">
            Login as Admin
          </Link>
        </p>
      </div>
    </div>
  );
}
