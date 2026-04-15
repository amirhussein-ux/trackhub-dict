import { motion, useScroll, useTransform, useMotionTemplate } from "framer-motion";
import { Lightbulb, LineChart, Settings, Menu, Award } from "lucide-react";
import { Database, Activity, BarChart3, Users } from 'lucide-react';
import { Facebook } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import dictLogo from "@/assets/Artboard 4.png";
import nippsLogo from "@/assets/NIPPSB(1).png";
import trackhubBg from "@/assets/trackhubbg.png";
import teamPhoto from "@/assets/dict_nippsb.png";
import bagongpinas from "@/assets/bagong_pilipinas.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6 },
  }),
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

// Floating particles (static, only floating animation)
const floatingParticles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  delay: Math.random() * 2,
}));

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const headerPadding = useTransform(scrollY, [0, 150], [24, 12]);
  const headerScale = useTransform(scrollY, [0, 150], [1, 0.8]);
  const headerBgOpacity = useTransform(scrollY, [0, 150], [0, 0.7]);

  // Section scroll animations (acknowledgement & team)
  const ackFade = {
    opacity: useTransform(scrollY, [300, 800], [0, 1]),
    y: useTransform(scrollY, [300, 800], [50, 0]),
  };
  const teamFade = {
    opacity: useTransform(scrollY, [600, 1200], [0, 1]),
    y: useTransform(scrollY, [600, 1200], [50, 0]),
  };

  // Background parallax
  const bgY = useTransform(scrollY, [0, 500], [0, -100]);

  return (
    <div className="min-h-screen bg-[#050d1a] text-[#c8ddf5] overflow-x-hidden">
      {/* Header */}
      <motion.header
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          style={{
            paddingTop: headerPadding,
            paddingBottom: headerPadding,
            backgroundColor: useMotionTemplate`rgba(5, 13, 26, ${headerBgOpacity})`,
          }}
          className="fixed top-0 left-0 w-full z-30 backdrop-blur-md border-b border-blue-500/10"
        >
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

            {/* LEFT (Desktop: DICT Logo | Mobile: BOTH logos) */}
            <div className="flex items-center gap-4">
              {/* DICT Logo */}
              <motion.div style={{ scale: headerScale }} className="w-20 h-12">
                <img src={dictLogo} className="w-full h-full object-contain" />
              </motion.div>

              {/* Bagong Pilipinas Logo */}
              <motion.div style={{ scale: headerScale }} className="w-22 h-14">
                <img src={bagongpinas} className="w-full h-full object-contain" />
              </motion.div>

              {/* NIPPSB Logo (only show on mobile here) */}
              <motion.div
                style={{ scale: headerScale }}
                className="w-20 h-12 md:hidden"
              >
                <img src={nippsLogo} className="w-full h-full object-contain" />
              </motion.div>
            </div>

            {/* CENTER NAV (Desktop only) */}
            <nav className="hidden md:flex items-center gap-8">
              <a href="#about" className="text-white hover:text-blue-400 transition-colors">About</a>
              <a href="#acknowledgement" className="text-white hover:text-blue-400 transition-colors">Acknowledgement</a>
              <a href="#team" className="text-white hover:text-blue-400 transition-colors">Team</a>
            </nav>

            {/* RIGHT SIDE */}
            <div className="flex items-center gap-4">

              {/* NIPPSB Logo (Desktop right side only) */}
              <motion.div
                style={{ scale: headerScale }}
                className="hidden md:block w-20 h-12"
              >
                <img src={nippsLogo} className="w-full h-full object-contain" />
              </motion.div>

              {/* HAMBURGER (Mobile only) */}
              <button
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* MOBILE MENU */}
          {mobileMenuOpen && (
            <div className="md:hidden px-6 pb-4">
              <div className="flex flex-col gap-4 mt-4 bg-[#06142d] rounded-xl p-4 border border-blue-500/20">
                <a href="#about" className="text-white hover:text-blue-400">About</a>
                <a href="#acknowledgement" className="text-white hover:text-blue-400">Acknowledgement</a>
                <a href="#team" className="text-white hover:text-blue-400">Team</a>

                <Link to="/login">
                  <button className="mt-2 w-full py-2 bg-blue-600 rounded-lg text-white">
                    Login
                  </button>
                </Link>
              </div>
            </div>
          )}
        </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden shadow-2xl shadow-black/50">

        {/* Background */}
        <motion.div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{ backgroundImage: `url(${trackhubBg})`, y: bgY }}
        />

        {/* Floating Particles (static) */}
        {floatingParticles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 bg-blue-400/30 rounded-full"
            style={{ left: `${particle.x}%`, top: `${particle.y}%` }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Hero Content (static, no fade on scroll) */}
        <motion.div variants={container} initial="hidden" animate="show" className="relative z-10 max-w-4xl mt-32">
          <motion.p variants={fadeUp} className="text-sm tracking-[3px] uppercase opacity-60 mb-6">
            National ICT Planning, Policy and Standards Bureau (NIPPSB)
          </motion.p>
          <motion.h1 className="text-6xl md:text-8xl font-black tracking-[0.2em] text-white mb-6" style={{ fontFamily: "Orbitron, monospace" }}>
            {"TRACKHUB".split("").map((letter, i) => (
              <motion.span
                key={i}
                variants={fadeUp}
                custom={i}
                className="inline-block"
                animate={{ textShadow: ["0 0 10px rgba(59,130,246,0.5)", "0 0 20px rgba(59,130,246,0.8)", "0 0 10px rgba(59,130,246,0.5)"] }}
                transition={{ textShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
              >
                {letter}
              </motion.span>
            ))}
          </motion.h1>

          <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 my-6">
            <div className="flex-1 h-px bg-blue-400/50" />
            <span className="text-sm md:text-base tracking-[0.2em] text-white uppercase">Policy Tracker</span>
            <div className="flex-1 h-px bg-blue-400/50" />
          </motion.div>

          <motion.p variants={fadeUp} className="text-lg opacity-80 italic max-w-2xl mx-auto leading-relaxed">
            Centralized ICT Policy Monitoring and Repository System.<br />
            Track, manage, and publish ICT policies from draft to effectivity.
          </motion.p>

          <br /><br />

          <Link to="/login">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 rounded-xl bg-white/10 backdrop-blur-md text-white font-semibold border border-white/30 hover:bg-white/20 transition-all shadow-md"
            >
              Login
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* WHAT IS TRACKHUB */}
      <section id="about" className="scroll-mt-24 relative py-20 px-6 bg-[#06142d]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-cyan-400/20 blur-3xl rounded-full" />
        </div>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="mb-4 text-white text-3xl md:text-4xl font-bold">What is TrackHub?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              TrackHub is a comprehensive policy management 
              system designed to streamline ICT policy governance
              across the organization.
            </p>
          </div>

          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Database,
                title: 'Centralized Policy Repository',
                description: 'All ICT policies stored in one secure location'
              },
              {
                icon: Activity,
                title: 'Real-Time Policy Tracking',
                description: 'Monitor policy status and progress instantly'
              },
              {
                icon: BarChart3,
                title: 'Lifecycle Monitoring',
                description: 'Track policies from draft to implementation'
              },
              {
                icon: Users,
                title: 'Cross-Unit Accessibility',
                description: 'Seamless collaboration across divisions'
              }
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  variants={fadeUp}
                  custom={index}
                  whileHover={{ scale: 1.03, y: -4 }}
                  className={`
                  relative
                  p-6
                  rounded-3xl
                  backdrop-blur-xl
                  bg-white/5
                  border border-white/10
                  shadow-[0_10px_40px_rgba(0,0,0,0.5)]

                  transition-all duration-300

                  before:absolute before:inset-0
                  before:rounded-3xl
                  before:bg-gradient-to-br before:from-white/10 before:to-transparent
                  before:opacity-30
                  before:pointer-events-none
                  `}
                >
                  <motion.div
                    initial={{ scale: 0.9, rotate: -6, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 120, damping: 12, delay: index * 0.06 }}
                    className="
                    w-14 h-14
                    rounded-2xl
                    flex items-center justify-center mb-4
                    bg-white/10 backdrop-blur-md border border-white/20
                    shadow-md
                    "
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </motion.div>

                  <h3 className="mb-2 text-white">{feature.title}</h3>
                  <p className="text-white/60">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Acknowledgement Section */}
      <motion.section id="acknowledgement" style={ackFade} className="relative py-20 px-6 bg-[#06142d]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Grid */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
            }}
          />
          {/* Radial Glow */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px]" />
          </div>
          {/* Floating Particles */}
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-[2px] h-[2px] bg-white/40 rounded-full"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/10"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 6, repeat: Infinity }}
          />

        </div>
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} className="max-w-4xl mx-auto px-6">
          <motion.div
            variants={fadeUp}
            custom={0}
            className={
              `relative rounded-2xl p-10 w-full text-center
              backdrop-blur-2xl bg-gradient-to-b from-white/10 to-white/5
              border border-white/20 shadow-[0_20px_80px_rgba(0,0,0,0.7)]
              before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/20 before:via-transparent before:to-transparent before:opacity-40 before:pointer-events-none
              after:absolute after:inset-0 after:rounded-2xl after:border after:border-white/10 after:pointer-events-none
              `
            }
          >
            {/* Corner dots */}
            <div className="absolute top-3 left-3 w-1.5 h-1.5 bg-white/20 rounded-full" />
            <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-white/20 rounded-full" />
            <div className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-white/20 rounded-full" />
            <div className="absolute bottom-3 right-3 w-1.5 h-1.5 bg-white/20 rounded-full" />

            {/* icon */}
            <motion.div variants={fadeUp} custom={1} className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
              <Award className="w-10 h-10 text-blue-200" />
            </motion.div>

            <motion.h2 variants={fadeUp} custom={2} className="mb-6 text-white text-2xl font-semibold tracking-wide">
              Acknowledgement
            </motion.h2>

            <motion.p variants={fadeUp} custom={3} className="text-white/70 leading-relaxed text-justify">
              This section would like to acknowledge NIPPSB for their guidance
               and the opportunity to develop this system.
            </motion.p>
            <motion.p variants={fadeUp} custom={4} className="text-white/70 leading-relaxed text-justify">
              Their guidance, encouragement, and trust have been invaluable throughout
               this journey. This project would not have been possible without their support.
            </motion.p>
            <motion.p variants={fadeUp} custom={5} className="text-white/70 leading-relaxed text-justify">
              Special thanks are also extended to our OIC Director Engr. Gemma P. Baysic
               and Chief Division Engr. Maria Andrea A. Hernandez-Lara.
            </motion.p>
            <br />
            <motion.p variants={fadeUp} custom={6} className="italic font-medium text-white/70 ">Thank you for inspiring us to grow both technically
               and professionally.
            </motion.p>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Team Section */}
      <motion.section 
        id="team" style={teamFade} className="relative py-20 px-6 bg-[#06142d]">
        <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-t from-transparent to-[#06142d] pointer-events-none" />
        <div className="container mx-auto max-w-6xl">
          {/* Heading */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            NIPPSB Divisions
          </h2>
            <p className="text-[#c8ddf5]/90 max-w-2xl mx-auto leading-relaxed">
              NIPPSB is DICT's arm that handles the formulation of ICT policies, plans, and standards.
            </p>
          </motion.div>

          {/* Team Photo */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mb-12">
            <img src={teamPhoto} alt="DICT NIPPSB Team" className="w-full h-auto opacity-50 rounded-2xl shadow-2xl transition-all duration-500" />
          </motion.div>

          {/* Divisions */}
          <div className="max-w-7xl mx-auto px-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: Lightbulb,
                acronym: 'PPDD',
                name: 'Plans and Policy Development Division',
                description: 'Focuses on creating and developing strategic ICT plans and policy frameworks for national development.'
              },
              {
                icon: LineChart,
                name: 'Policy Research and Analysis Division',
                acronym: 'PRAD',
                description: 'Conducts comprehensive research and analysis to support evidence-based ICT policy formulation.'
              },
              {
                icon: Users,
                acronym: 'PPMCAD',
                name: 'Plans and Policy Management, Coordination & Advocacy Division',
                description: 'Manages coordination, advocacy, and stakeholder engagement for ICT policies and initiatives.'
              },
              {
                icon: Settings,
                acronym: 'PSSD',
                name: 'Policy Standards and Systems Division',
                description: 'Establishes and maintains ICT standards, systems, and best practices across government agencies.'
              }
            ].map((division, index) => {
              const Icon = division.icon;
              return (
              <motion.div
                key={index}
                whileHover={{ y: -3 }}
                className="
                  p-4 rounded-2xl
                  bg-white/5 backdrop-blur-xl
                  border border-white/10
                  shadow-[0_8px_25px_rgba(0,0,0,0.4)]
                  hover:shadow-[0_12px_35px_rgba(0,0,0,0.6)]
                  transition-all duration-300
                "
              >
                {/* Top Row (icon + title) */}
                <div className="flex items-start gap-3 mb-2">
                  
                  {/* Icon */}
                  <div className="
                    w-10 h-10 flex items-center justify-center
                    rounded-lg
                    bg-white/10 border border-white/20
                    flex-shrink-0
                  ">
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  {/* Title Block */}
                  <div>
                    <h3 className="text-white text-sm font-semibold leading-tight">
                      {division.acronym}
                    </h3>

                    <p className="text-white/80 text-[11px] font-medium">
                      {division.name}
                    </p>
                  </div>
                </div>

                {/* Description (aligned under text, NOT icon) */}
                <div className="pl-[52px]">
                  <p className="text-white/60 text-xs leading-snug text-justify">
                    {division.description}
                  </p>
                </div>
              </motion.div>
              );
            })}
          </div>
        </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="bg-[#06142d] py-8 px-6 border-t border-blue-500/20">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <a href="https://www.facebook.com/nippsb" target="_blank" rel="noopener noreferrer" className="text-white-400 hover:text-blue-300 transition-colors">
              <Facebook className="h-6 w-6" />
            </a>
            <span className="text-[#c8ddf5]/80 font-medium">DICT | NIPPSB</span>
          </div>
          <div className="text-[#c8ddf5]/60 text-sm">© 2025 DICT. All rights reserved. v.1.0.0</div>
        </div>
      </footer>

    </div>
  );
}