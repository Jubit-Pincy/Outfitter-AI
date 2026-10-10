export function PageHeader({
  title,
  lede,
}: {
  title: string;
  lede?: string;
}) {
  return (
    <>
      <h1 className="mb-1.5 text-[29px] leading-[1.05] font-semibold tracking-[-0.025em] sm:text-4xl">
        {title}
      </h1>
      {lede ? (
        <p className="mb-6 text-[15px] text-ink-soft sm:mb-7">{lede}</p>
      ) : null}
    </>
  );
}
