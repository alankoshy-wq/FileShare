
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, HardDrive, CheckCircle2 } from "lucide-react";

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            <main className="flex-1">
                {/* Hero Section */}
                <section className="px-4 pt-20 pb-2 md:pt-28 md:pb-6 text-center container mx-auto">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
                            Share big. <span className="text-primary">Share secure.</span> {" "}
                            <span className="block text-foreground/80 mt-1">Stay limitless.</span>
                        </h1>

                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            Transfer files of any size with enterprise-grade security.
                            Powered by Google Cloud Storage, trusted by professionals.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                            <Link to="/">
                                <Button
                                    size="lg"
                                    className="h-12 px-8 text-lg rounded-full group"
                                    onClick={() => localStorage.setItem("hasSeenWelcome", "true")}
                                >
                                    Start Transferring
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </div>

                        <div className="pt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                <span>No sign up required</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                <span>Free for everyone</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="px-4 py-8 bg-muted/30 border-t border-border/40">
                    <div className="container mx-auto max-w-6xl">
                        <div className="grid md:grid-cols-3 gap-8">

                            {/* Feature 1 */}
                            <div className="bg-background border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                                    <Shield className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Secure by Design</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Your files are encrypted in transit and at rest. We utilize industry-standard security protocols to ensure your data stays private and protected.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="bg-background border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                                    <HardDrive className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">Share Large Files</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Don't let file size limits hold you back. Share high-resolution videos, large datasets, and complex project files with ease.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="bg-background border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                                    <Zap className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">High Speed Transfer</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Optimized for performance with global edge caching. Our infrastructure ensures you get the best possible speeds for uploads and downloads.
                                </p>
                            </div>

                        </div>
                    </div>
                </section>

                {/* How It Works Section */}
                <section className="px-4 py-10 container mx-auto">
                    <div className="max-w-4xl mx-auto text-center mb-10">
                        <h2 className="text-2xl md:text-4xl font-bold mb-4">How It Works</h2>
                        <p className="text-muted-foreground">Simple, fast, and secure file sharing in three steps.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-0.5 bg-border -z-10" />

                        {/* Step 1 */}
                        <div className="text-center bg-background p-4">
                            <div className="w-20 h-20 bg-primary/5 border-4 border-background rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <span className="text-2xl font-bold text-primary">1</span>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Upload Files</h3>
                            <p className="text-sm text-muted-foreground">Select your files or folders using our simple drag-and-drop interface.</p>
                        </div>

                        {/* Step 2 */}
                        <div className="text-center bg-background p-4">
                            <div className="w-20 h-20 bg-primary/5 border-4 border-background rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <span className="text-2xl font-bold text-primary">2</span>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Get Link</h3>
                            <p className="text-sm text-muted-foreground">We verify your files and generate a secure, shareable link instantly.</p>
                        </div>

                        {/* Step 3 */}
                        <div className="text-center bg-background p-4">
                            <div className="w-20 h-20 bg-primary/5 border-4 border-background rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <span className="text-2xl font-bold text-primary">3</span>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Share</h3>
                            <p className="text-sm text-muted-foreground">Send the link to your recipients. They can download files without needing an account.</p>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default LandingPage;
