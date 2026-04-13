import FeatureCard from "./components/FeatureCard";
import { FEATURE_ITEMS } from "./constants";

function Features() {
  return (
    <section className="bg-primary/3 px-4 py-14 dark:bg-background-dark sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-black tracking-tight text-text-dark dark:text-background-light sm:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-soft-green">
            Bridging the gap between citizen science and urban planning.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURE_ITEMS.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.desc}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default Features;
