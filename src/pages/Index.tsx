import { Header } from "@/components/Header";
import { FileUploadCard } from "@/components/FileUploadCard";
import { HeroSection } from "@/components/HeroSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20">
        <div className="px-4 sm:px-6 lg:container lg:mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16 lg:min-h-[calc(100vh-8rem)]">
            {/* Left side - Upload Card with mobile hero text */}
            <div className="w-full lg:w-auto flex flex-col justify-center lg:justify-start min-h-[calc(100vh-5rem)] lg:min-h-0 items-center py-6 lg:py-12 gap-6">
              {/* Hero text above - mobile only */}
              <div className="lg:hidden text-center space-y-2">
                <h1 className="text-4xl font-bold text-foreground leading-tight">
                  Share big. <span className="text-primary">Share secure.</span>
                </h1>
                <p className="text-2xl font-bold text-foreground">Stay limitless.</p>
              </div>

              <FileUploadCard />

              {/* Stats below - mobile only */}
              <div className="lg:hidden grid grid-cols-3 gap-4 w-full max-w-md">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">256-bit</div>
                  <div className="text-xs text-muted-foreground">Encryption</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">Unlimited</div>
                  <div className="text-xs text-muted-foreground">File Size</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary mb-1">99.9%</div>
                  <div className="text-xs text-muted-foreground">Uptime SLA</div>
                </div>
              </div>
            </div>

            {/* Right side - Hero Content - desktop only */}
            <div className="hidden lg:flex min-h-screen lg:min-h-0 items-center px-4 sm:px-0">
              <HeroSection />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
