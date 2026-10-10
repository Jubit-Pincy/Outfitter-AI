"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[52ch] py-16 text-center">
      <h1 className="text-[29px] leading-[1.05] font-semibold tracking-[-0.025em]">
        That didn&apos;t load.
      </h1>
      <p className="mt-2 text-[15px] text-ink-soft">
        Something went wrong putting this page together. Your wardrobe is
        untouched.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-[10px] bg-ink px-5 py-3 text-[14.5px] font-semibold text-paper transition-colors hover:bg-fern"
      >
        Try again
      </button>
    </div>
  );
}
