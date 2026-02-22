import PublicBookingForm from "@/components/PublicBookingForm";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            DentalisPMS
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Book your dental appointment
          </p>
        </div>

        <PublicBookingForm />
      </div>
    </div>
  );
}
