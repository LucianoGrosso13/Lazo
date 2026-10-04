import { LandingHero } from "@/components/landing/hero";
import { LandingSections } from "@/components/landing/sections";
import { LandingAtmosphere } from "@/components/landing/atmosphere";
import { LandingMotionPolicy } from "@/components/landing/motion-policy";

export default function Home() {
  return (
    <LandingMotionPolicy>
      <LandingAtmosphere />
      <LandingHero />
      <LandingSections />
    </LandingMotionPolicy>
  );
}
