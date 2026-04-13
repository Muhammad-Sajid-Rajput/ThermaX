function HeroContent({ titleStart, titleHighlight, titleEnd, subtitle, description }) {
  return (
    <div className="space-y-4">
      <h1 className="text-4xl font-black leading-tight tracking-tight text-text-dark dark:text-background-light sm:text-5xl lg:text-6xl">
        {titleStart}{" "}
        <span className="text-primary underline decoration-primary/30">
          {titleHighlight}
        </span>{" "}
        {titleEnd}
      </h1>
      <p className="max-w-xl text-lg font-medium text-soft-green sm:text-xl">
        {subtitle}
      </p>
      <p className="max-w-2xl text-base leading-relaxed text-text-dark/70 dark:text-background-light/70">
        {description}
      </p>
    </div>
  );
}

export default HeroContent;
