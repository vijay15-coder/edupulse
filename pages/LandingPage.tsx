
import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, ArrowRight, BookOpen, Users, ShieldCheck, ChevronRight, Play, Globe, Zap, BarChart3, Clock } from 'lucide-react';

interface LandingPageProps {
    onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
    const vantaRef = useRef<HTMLDivElement>(null);
    const vantaEffect = useRef<any>(null);

    useEffect(() => {
        if (!vantaEffect.current && vantaRef.current && (window as any).VANTA) {
            vantaEffect.current = (window as any).VANTA.FOG({
                el: vantaRef.current,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                highlightColor: 0x8b5cf6, // Purple
                midtoneColor: 0xd8b4fe, // Light purple
                lowlightColor: 0x4f46e5, // indigo
                baseColor: 0xf8fafc,
                blurFactor: 0.6,
                speed: 1.5,
                zoom: 0.5
            });
        }
        
        // Initialize AOS for elements below the fold
        if (typeof window !== 'undefined' && (window as any).AOS) {
            (window as any).AOS.init({
                duration: 1000,
                once: true,
                offset: 50,
            });
            setTimeout(() => {
                if ((window as any).AOS) {
                    (window as any).AOS.refresh();
                }
            }, 100);
        }

        return () => {
            if (vantaEffect.current) vantaEffect.current.destroy();
        };
    }, []);

    // Parallax Scroll Component
    const ParallaxSection: React.FC<{ children: React.ReactNode, speed?: number, className?: string }> = ({ children, speed = 0.5, className }) => {
        const [offset, setOffset] = useState(0);
        const sectionRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const handleScroll = () => {
                if (!sectionRef.current) return;
                const rect = sectionRef.current.getBoundingClientRect();
                const scrollPercent = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
                setOffset(scrollPercent * 100 * speed);
            };

            window.addEventListener('scroll', handleScroll);
            return () => window.removeEventListener('scroll', handleScroll);
        }, [speed]);

        return (
            <div ref={sectionRef} className={`relative overflow-hidden ${className}`}>
                <div
                    style={{ transform: `translateY(${offset}px)` }}
                    className="transition-transform duration-75 ease-out"
                >
                    {children}
                </div>
            </div>
        );
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-50">
            {/* Vanta Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div ref={vantaRef} className="absolute inset-0 w-full h-full"></div>
            </div>

            {/* Glass Navigation Overlay */}
            <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-8">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-brand-600 to-indigo-600 p-2 rounded-xl shadow-lg animate-float">
                            <GraduationCap className="text-white w-6 h-6" />
                        </div>
                        <span className="text-2xl font-black text-slate-900 tracking-tight">EduPulse</span>
                    </div>
                    <button
                        onClick={onGetStarted}
                        className="px-6 py-2.5 bg-white/40 backdrop-blur-md border border-white/60 text-slate-900 rounded-xl font-bold hover:bg-white/60 transition-all duration-300 shadow-sm"
                    >
                        Sign In
                    </button>
                </div>
            </nav>

            {/* Hero Content */}
            <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center pt-20">
                <div className="max-w-4xl mx-auto">
                    {/* Badge */}
                    <div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-bold mb-8 shadow-sm fade-in-up"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
                        Elevating College Management
                    </div>

                    {/* Headline */}
                    <h1
                        className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 leading-[1.1] mb-8 fade-in-up stagger-1"
                    >
                        The Future of <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-brand-500 to-fuchsia-600">
                            Campus Intelligence
                        </span>
                    </h1>

                    {/* Description */}
                    <p
                        className="text-lg md:text-xl text-slate-600 leading-relaxed mb-12 max-w-2xl mx-auto font-medium fade-in-up stagger-2"
                    >
                        Empower your institution with EduPulse. A seamless, AI-driven platform
                        for students, faculty, and administrators to thrive in a digital-first world.
                    </p>

                    {/* Actions */}
                    <div
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 fade-in-up stagger-3"
                    >
                        <button
                            onClick={onGetStarted}
                            className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-brand-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3"
                        >
                            Get Started Now
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button className="group w-full sm:w-auto px-8 py-4 bg-white/40 backdrop-blur-md border border-white/60 text-slate-900 rounded-2xl font-bold text-lg shadow-sm hover:bg-white/60 transition-all duration-300 flex items-center justify-center gap-3">
                            <div className="p-1 bg-indigo-100 rounded-full text-indigo-600 group-hover:scale-110 transition-transform">
                                <Play className="w-4 h-4 fill-current" />
                            </div>
                            Watch Demo
                        </button>
                    </div>
                </div>

                {/* Floating 3D Elements */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden hidden lg:block">
                    <div className="absolute top-[20%] left-[10%] animate-float p-4 bg-white/40 backdrop-blur-lg border border-white/40 rounded-3xl shadow-2xl rotate-[12deg]" style={{ animationDuration: '6s' }}>
                        <BookOpen className="w-12 h-12 text-indigo-500" />
                    </div>
                    <div className="absolute top-[30%] right-[15%] animate-float p-5 bg-white/50 backdrop-blur-lg border border-white/40 rounded-[2.5rem] shadow-2xl -rotate-[15deg]" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                        <Users className="w-10 h-10 text-brand-500" />
                    </div>
                    <div className="absolute bottom-[20%] left-[15%] animate-float p-4 bg-white/40 backdrop-blur-lg border border-white/40 rounded-3xl shadow-2xl -rotate-[10deg]" style={{ animationDuration: '5s', animationDelay: '2s' }}>
                        <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div className="absolute bottom-[25%] right-[10%] animate-float p-6 bg-white/50 backdrop-blur-lg border border-white/40 rounded-[3rem] shadow-2xl rotate-[20deg]" style={{ animationDuration: '7s', animationDelay: '0.5s' }}>
                        <GraduationCap className="w-14 h-14 text-fuchsia-500" />
                    </div>
                </div>
            </main>

            {/* Feature Section with Scroll Animations */}
            <section className="relative z-10 py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2
                            data-aos="fade-up"
                            className="text-4xl md:text-5xl font-black text-slate-900 mb-6"
                        >
                            Powerful Features for <br />
                            <span className="text-indigo-600">Modern Institutions</span>
                        </h2>
                        <p
                            data-aos="fade-up"
                            data-aos-delay="100"
                            className="text-slate-500 text-lg max-w-2xl mx-auto font-medium"
                        >
                            EduPulse combines cutting-edge technology with intuitive design to streamline every aspect of campus life.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
                        {[
                            { icon: Zap, title: "Lighting Fast", description: "Real-time data processing and instant notifications for all users.", color: "text-amber-500", bg: "bg-amber-50" },
                            { icon: BarChart3, title: "Advanced Analytics", description: "Track student performance and institutional growth with deep insights.", color: "text-indigo-500", bg: "bg-indigo-50" },
                            { icon: Globe, title: "Centralized Hub", description: "All your college resources, schedules, and marks in one secure place.", color: "text-emerald-500", bg: "bg-emerald-50" }
                        ].map((feature, idx) => (
                            <div
                                key={idx}
                                data-aos="zoom-in"
                                data-aos-delay={idx * 150}
                                className="group p-8 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 transform hover:-translate-y-2"
                            >
                                <div className={`w-14 h-14 ${feature.bg} ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                                    <feature.icon className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-4">{feature.title}</h3>
                                <p className="text-slate-600 leading-relaxed font-medium">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Parallax Feature Highlight */}
            <ParallaxSection className="py-32 bg-indigo-600">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
                    <div className="flex-1 text-white text-center md:text-left">
                        <h2
                            className="text-4xl md:text-6xl font-black mb-8 leading-tight fade-in-up"
                        >
                            The Smartest Way to <br />
                            Manage Your Campus
                        </h2>
                        <div className="space-y-6">
                            {[
                                "Automated Attendance Tracking",
                                "Built-in AI Student Assistant",
                                "Advanced Examination Management",
                                "Seamless Fee Collection"
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className={`flex items-center gap-4 text-indigo-100 font-bold text-lg fade-in-up stagger-${(i % 3) + 1}`}
                                >
                                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                                        <ChevronRight className="w-4 h-4 text-white" />
                                    </div>
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div
                        className="flex-1 relative fade-in-up stagger-2"
                    >
                        <div className="bg-white/10 backdrop-blur-3xl p-4 rounded-[3rem] border border-white/20 shadow-2xl relative z-10">
                            <div className="aspect-video bg-indigo-900/50 rounded-[2rem] flex items-center justify-center">
                                <Play className="w-20 h-20 text-white fill-current opacity-40" />
                            </div>
                        </div>
                        {/* Parallax circles behind */}
                        <div className="absolute -top-12 -right-12 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    </div>
                </div>
            </ParallaxSection>

            {/* Footer / Features Preview */}
            <footer className="relative z-10 py-12 border-t border-slate-200/50 bg-white/30 backdrop-blur-lg">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-60">
                        <div className="flex items-center justify-center gap-2 grayscale hover:grayscale-0 transition-all duration-500">
                            <div className="bg-slate-200 p-1.5 rounded-lg font-black text-xs">99.9%</div>
                            <span className="text-sm font-bold text-slate-900">Uptime</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 grayscale hover:grayscale-0 transition-all duration-500">
                            <div className="bg-slate-200 p-1.5 rounded-lg font-black text-xs">ISO</div>
                            <span className="text-sm font-bold text-slate-900">Certified</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 grayscale hover:grayscale-0 transition-all duration-500">
                            <div className="bg-slate-200 p-1.5 rounded-lg font-black text-xs">256b</div>
                            <span className="text-sm font-bold text-slate-900">Encryption</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 grayscale hover:grayscale-0 transition-all duration-500">
                            <div className="bg-slate-200 p-1.5 rounded-lg font-black text-xs">24/7</div>
                            <span className="text-sm font-bold text-slate-900">Support</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
