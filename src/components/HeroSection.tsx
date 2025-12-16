export const HeroSection = () => {
  return (
    <div className="flex-1 flex flex-col justify-center px-8">
      <div className="max-w-2xl">
        <h1 className="text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6">
          Share big.{" "}
          <span className="text-primary">Share secure.</span>{" "}
          <span className="block mt-2">Stay limitless.</span>
        </h1>

        <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
          Transfer files of any size with enterprise-grade security.
          Powered by Azure, trusted by professionals.
        </p>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl font-bold text-primary mb-1">256-bit</div>
              <div className="text-sm text-muted-foreground">Encryption</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">Unlimited</div>
              <div className="text-sm text-muted-foreground">File Size</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-1">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime SLA</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
