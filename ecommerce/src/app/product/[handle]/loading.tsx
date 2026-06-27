export default function Loading() {
  return (
    <section className="section-shell pb-16 pt-6 md:pb-20 md:pt-8">
      <div className="mb-4 h-3 w-72 rounded-full bg-[#eaded3]" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] xl:gap-12">
        <div className="space-y-5">
          <div className="rounded-[30px] border border-white/70 bg-[rgba(255,252,248,0.92)] p-3 shadow-[0_18px_60px_rgba(97,52,27,0.08)] md:p-4">
            <div className="grid gap-3 md:grid-cols-[88px_minmax(0,1fr)] md:gap-4">
              <div className="hidden md:flex md:flex-col md:gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-24 rounded-2xl bg-[#efe4d8]" />
                ))}
              </div>
              <div className="aspect-[4/5] rounded-[26px] bg-gradient-to-br from-[#efe3d7] via-[#f8eee5] to-[#e8dccf]" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-24 rounded-[22px] bg-[#efe4d8]" />
            <div className="h-24 rounded-[22px] bg-[#efe4d8]" />
          </div>
        </div>

        <div className="space-y-6 rounded-[30px] border border-white/80 bg-[rgba(255,253,250,0.96)] p-5 shadow-[0_18px_60px_rgba(97,52,27,0.08)] md:p-6">
          <div className="h-5 w-28 rounded-full bg-[#efe4d8]" />
          <div className="h-12 w-4/5 rounded-2xl bg-[#efe4d8]" />
          <div className="h-10 w-44 rounded-2xl bg-[#efe4d8]" />
          <div className="h-28 rounded-[24px] bg-[#efe4d8]" />
          <div className="h-36 rounded-[24px] bg-[#efe4d8]" />
        </div>
      </div>
    </section>
  );
}