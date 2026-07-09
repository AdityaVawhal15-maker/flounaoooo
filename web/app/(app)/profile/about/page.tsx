import Image from "next/image";
import { SubPage } from "@/components/profile/SubPage";
import { Card } from "@/components/ui/Card";

export default function AboutPage() {
  return (
    <SubPage title="About">
      <div className="flex flex-col items-center py-4 text-center">
        <Image src="/logo.png" alt="Radiues" width={84} height={84} />
        <h2 className="mt-3 text-[18px] font-bold text-ink">Radiues</h2>
        <p className="text-[12px] text-cocoa">Version 0.1.0 · by Algorithec Pvt Ltd</p>
      </div>

      <Card>
        <p className="text-[13px] leading-relaxed text-cocoa">
          Radiues is your AI decision engine. Instead of switching between apps and
          comparing prices yourself, you tell Radiues what you need — it searches
          across restaurants and mobility partners, applies the best offers, reads the
          reviews, and gives you one clear answer.
        </p>
        <p className="mt-3 text-[13px] font-semibold text-ink">
          Stop searching. Start deciding.
        </p>
      </Card>
    </SubPage>
  );
}
