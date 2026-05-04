"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./_providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Search, ShieldCheck, Sparkles, Target, Users } from "lucide-react";

function TopNav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 nav-glass">
      <div className="mx-auto flex h-12 max-w-[1120px] items-center justify-between px-6 text-white">
        <Link
          href="/"
          className="text-[14px] font-medium tracking-[-0.01em] text-white hover:text-white"
        >
          CareerBridge AI
        </Link>
        <div className="hidden items-center gap-6 text-[12px] font-normal text-white/80 md:flex">
          <a href="#students" className="hover:text-white">Students</a>
          <a href="#companies" className="hover:text-white">Companies</a>
          <a href="#admins" className="hover:text-white">Admins</a>
          <a href="#how-it-works" className="hover:text-white">How it works</a>
        </div>
        <div className="flex items-center gap-4 text-[12px]">
          <Link href="/auth" className="text-white/80 hover:text-white">
            Log in
          </Link>
          <Link
            href="/auth?mode=register"
            className="rounded-pill bg-white px-3.5 py-1.5 text-[12px] font-medium text-foreground hover:bg-white/90"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-black text-white">
      <div className="mx-auto flex min-h-[92vh] max-w-[980px] flex-col items-center justify-center px-6 pb-24 pt-40 text-center">
        <p className="mb-4 text-[17px] font-medium tracking-[-0.022em] text-[#2997ff]">
          CareerBridge AI
        </p>
        <h1 className="display-hero text-white">
          Where graduates meet
          <br />
          the right first job.
        </h1>
        <p className="mx-auto mt-6 max-w-[680px] text-[21px] font-normal leading-[1.38] tracking-[0.011em] text-white/80">
          CareerBridge uses AI to match students with companies based on real skills &mdash; so
          students apply only where they fit, and companies hire from a pre-ranked shortlist.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
          <Link
            href="/auth?mode=register&role=student"
            className="pill-link on-dark text-[17px]"
          >
            I&rsquo;m a student <ArrowRight size={16} />
          </Link>
          <Link
            href="/auth?mode=register&role=company"
            className="pill-link on-dark text-[17px]"
          >
            I&rsquo;m hiring graduates <ArrowRight size={16} />
          </Link>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth?mode=register">
            <Button variant="primary" size="md">
              Create an account
            </Button>
          </Link>
          <Link href="/auth">
            <Button variant="outline-dark" size="md">
              Log in
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-[13px] tracking-[-0.01em] text-white/55">
          Free for students. Trusted by verified companies hiring early-career talent.
        </p>
      </div>

      {/* Soft radial spotlight to evoke Apple's studio lighting */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] opacity-60"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 100%, rgba(41,151,255,0.18) 0%, rgba(0,0,0,0) 70%)",
        }}
      />
    </section>
  );
}

function FeatureRow() {
  const items = [
    { icon: Sparkles, label: "AI resume parsing" },
    { icon: Target, label: "Per-job match score" },
    { icon: FileText, label: "Career report" },
    { icon: ShieldCheck, label: "Admin-verified companies" },
  ];
  return (
    <section className="bg-background">
      <div className="mx-auto flex max-w-[980px] flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 py-10 text-[13px] text-muted-foreground">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon size={14} className="text-accent" />
            <span className="tracking-[-0.016em]">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductHero({
  id,
  tone = "light",
  eyebrow,
  headline,
  subhead,
  primary,
  secondary,
  highlights,
}) {
  const isDark = tone === "dark";
  const bg = isDark ? "bg-black text-white" : "bg-background text-foreground";
  const subColor = isDark ? "text-white/70" : "text-[rgba(0,0,0,0.72)]";
  const eyebrowColor = isDark ? "text-[#2997ff]" : "text-accent";
  const linkClass = isDark ? "pill-link on-dark" : "pill-link";

  return (
    <section id={id} className={`${bg} section`}>
      <div className="section-inner text-center">
        {eyebrow && (
          <p
            className={`mb-3 text-[14px] font-semibold tracking-[-0.016em] ${eyebrowColor}`}
          >
            {eyebrow}
          </p>
        )}
        <h2 className="display-section mx-auto max-w-[780px]">{headline}</h2>
        <p
          className={`mx-auto mt-5 max-w-[640px] text-[21px] leading-[1.33] tracking-[0.011em] ${subColor}`}
        >
          {subhead}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
          {primary && (
            <Link href={primary.href} className={`${linkClass} text-[17px]`}>
              {primary.label} <ArrowRight size={16} />
            </Link>
          )}
          {secondary && (
            <Link href={secondary.href} className={`${linkClass} text-[17px]`}>
              {secondary.label} <ArrowRight size={16} />
            </Link>
          )}
        </div>
        {highlights?.length ? (
          <div className="mx-auto mt-16 grid max-w-[880px] gap-4 md:grid-cols-3">
            {highlights.map((h) => (
              <div
                key={h.title}
                className={
                  isDark
                    ? "rounded-xl bg-surface-1 p-6 text-left"
                    : "rounded-xl bg-card p-6 text-left ring-1 ring-black/[0.04]"
                }
              >
                <h3
                  className={`font-display text-[21px] font-semibold tracking-[-0.01em] ${
                    isDark ? "text-white" : "text-foreground"
                  }`}
                >
                  {h.title}
                </h3>
                <p
                  className={`mt-2 text-[15px] leading-[1.47] tracking-[-0.016em] ${
                    isDark ? "text-white/70" : "text-[rgba(0,0,0,0.68)]"
                  }`}
                >
                  {h.description}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      icon: FileText,
      title: "Upload a resume",
      body: "Students drop in a PDF; AI extracts skills, projects, and a structured profile in seconds.",
    },
    {
      n: "02",
      icon: Search,
      title: "Post a role",
      body: "Companies define required skills and a minimum match threshold. No noisy applicant piles.",
    },
    {
      n: "03",
      icon: Target,
      title: "Match and interview",
      body: "Every candidate is scored against every role. Send interview requests and record hiring decisions in one click.",
    },
  ];

  return (
    <section id="how-it-works" className="bg-background section">
      <div className="section-inner">
        <div className="text-center">
          <p className="mb-3 text-[14px] font-semibold tracking-[-0.016em] text-accent">
            How it works
          </p>
          <h2 className="display-section mx-auto max-w-[720px]">
            Three steps from resume to hire.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map(({ n, icon: Icon, title, body }) => (
            <div
              key={n}
              className="rounded-xl bg-card p-8 ring-1 ring-black/[0.04]"
            >
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-semibold tracking-[0.06em] text-muted-foreground">
                  {n}
                </span>
                <span className="h-px flex-1 bg-[rgba(0,0,0,0.08)]" />
                <Icon size={18} className="text-accent" />
              </div>
              <h3 className="mt-6 font-display text-[28px] font-semibold leading-[1.14] tracking-[0.007em]">
                {title}
              </h3>
              <p className="mt-3 text-[15px] leading-[1.47] tracking-[-0.016em] text-[rgba(0,0,0,0.68)]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-black text-white">
      <div className="mx-auto max-w-[980px] px-6 py-24 text-center">
        <h2 className="display-section mx-auto max-w-[760px] text-white">
          Start matching the right people to the right first jobs.
        </h2>
        <p className="mx-auto mt-5 max-w-[600px] text-[21px] leading-[1.33] tracking-[0.011em] text-white/70">
          Free for students. Built for companies that hire graduates, and admins who keep the
          marketplace honest.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth?mode=register">
            <Button variant="primary" size="md">
              Get started
            </Button>
          </Link>
          <Link href="/auth" className="pill-link on-dark text-[17px]">
            Log in <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-[980px] px-6 py-10 text-[12px] tracking-[-0.01em] text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>Copyright &copy; {new Date().getFullYear()} CareerBridge AI. All rights reserved.</span>
          <div className="flex gap-5">
            <Link href="/auth" className="hover:text-foreground">Sign in</Link>
            <Link href="/auth?mode=register" className="hover:text-foreground">Create account</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  const { ready, isAuthenticated, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (isAuthenticated && role) router.replace(`/${role}`);
  }, [ready, isAuthenticated, role, router]);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <Hero />
      <FeatureRow />

      <ProductHero
        id="students"
        tone="light"
        eyebrow="For students"
        headline="Upload your CV once. Get matched for everything."
        subhead="AI builds your structured profile, writes a career report, and only shows you roles where you're a strong fit."
        primary={{ label: "Start as a student", href: "/auth?mode=register&role=student" }}
        secondary={{ label: "Learn more", href: "#how-it-works" }}
        highlights={[
          {
            title: "AI-parsed profile",
            description: "Drop a PDF. We extract skills, projects, and experience — no manual forms.",
          },
          {
            title: "Honest match score",
            description: "See your fit per role and the exact skills you're missing before you apply.",
          },
          {
            title: "Interview in one place",
            description: "Accept requests, get a meeting link by email, and join the call from your dashboard.",
          },
        ]}
      />

      <ProductHero
        id="companies"
        tone="dark"
        eyebrow="For companies"
        headline="Skip the weak pile. Hire from the top."
        subhead="Post a role, set your apply threshold, and review pre-ranked candidates the moment they apply."
        primary={{ label: "Hire with CareerBridge", href: "/auth?mode=register&role=company" }}
        secondary={{ label: "See how ranking works", href: "#how-it-works" }}
        highlights={[
          {
            title: "Threshold-based applications",
            description: "Only students meeting your minimum match see an Apply button. No filtering needed.",
          },
          {
            title: "Ranked pipeline",
            description: "Every applicant is scored against your role. Sort by fit, not by when they applied.",
          },
          {
            title: "One-click hiring",
            description: "Send interview requests, schedule meetings, and record decisions in a single dashboard.",
          },
        ]}
      />

      <ProductHero
        id="admins"
        tone="light"
        eyebrow="For administrators"
        headline="Keep the marketplace honest."
        subhead="Verify companies, monitor activity, and manage users with clear controls and full visibility."
        primary={{ label: "Open admin console", href: "/auth?mode=register&role=admin" }}
        highlights={[
          {
            title: "Company verification",
            description: "Approve or reject companies before they post jobs — no unverified hiring.",
          },
          {
            title: "Cross-role search",
            description: "Find any student, company, job, or interview with a single search.",
          },
          {
            title: "Granular controls",
            description: "Disable users, moderate jobs, and oversee every interview status in real time.",
          },
        ]}
      />

      <HowItWorks />
      <FinalCTA />
      <Footer />
    </div>
  );
}
