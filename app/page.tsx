import AcademyApp from "./AcademyApp";

const TRAINING_START_SEED = 20260723;

export default function Home() {
  return <AcademyApp initialSeed={TRAINING_START_SEED} />;
}
