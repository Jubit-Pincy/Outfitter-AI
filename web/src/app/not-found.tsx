import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[52ch] py-16 text-center">
      <h1 className="text-[29px] leading-[1.05] font-semibold tracking-[-0.025em]">
        Nothing here.
      </h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        That page doesn&apos;t exist. Today is where the picks are.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-[10px] bg-ink px-5 py-3 text-[14.5px] font-semibold text-paper transition-colors hover:bg-fern"
      >
        Back to Today
      </Link>
    </div>
  );
}
