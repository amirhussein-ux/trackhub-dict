import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function OnboardingPage() {
  const boxControls = useAnimation();
  const pathControls = useAnimation();
  const textControls = useAnimation();
  const logoControls = useAnimation();
  const navigate = useNavigate();

  useEffect(() => {
    async function sequence() {
      // STATE 1: Blue box appears
      await boxControls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.6, ease: "easeOut" },
      });

      // STATE 2: Trace T
      await pathControls.start({
        pathLength: 1,
        transition: { duration: 1, ease: "easeInOut" },
      });

      // Fill T
      await pathControls.start({
        fillOpacity: 1,
        transition: { duration: 0.6 },
      });

      // STATE 3: Text appears
      await textControls.start({
        y: 0,
        opacity: 1,
        transition: { duration: 0.6, ease: "easeOut" },
      });

      await new Promise((res) => setTimeout(res, 800));

      // STATE 4 + 5: Text out + box expands + logo fades
      await Promise.all([
        textControls.start({
          y: 100,
          opacity: 0,
          transition: { duration: 0.4 },
        }),
        boxControls.start({
          scale: 6,
          borderRadius: 0,
          transition: { duration: 0.8, ease: "easeInOut" },
        }),
        logoControls.start({
          opacity: 0,
          transition: { duration: 0.8, ease: "easeOut" },
        }),
      ]);

      // Navigate to landing
      setTimeout(() => {
        navigate("/landing");
      }, 400);
    }

    sequence();
  }, []);

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-white overflow-hidden">
      
      {/* BLUE BOX */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={boxControls}
        className="absolute w-64 h-64 bg-[#12254D] rounded-[20px]"
        style={{ top: "calc(20% + 45px)", zIndex: 5 }}
      />

      {/* SVG T LOGO */}
      <motion.svg
        width="160"
        height="160"
        viewBox="0 0 155 203"
        className="absolute bottom-[calc(50%-80px)] left-1/2 -translate-x-[75%]"
        animate={logoControls}
        style={{ zIndex: 10, transformOrigin: "center center" }}
      >
        <motion.path
          d="M13.5 83L0 47L134 0L147 36.5L102.5 53L154.5 202.5H105.5L59 67L13.5 83Z"
          stroke="white"
          strokeWidth="3"
          fill="white"
          initial={{ pathLength: 0, fillOpacity: 0 }}
          animate={pathControls}
        />
      </motion.svg>

      {/* TEXT */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={textControls}
        className="absolute bottom-32 text-7xl tracking-widest flex gap-2"
        style={{ zIndex: 10 }}
      >
        <span className="text-[#12254D]">TRACK</span>
        <span className="text-red-500">H</span>
        <span className="text-yellow-400">U</span>
        <span className="text-[#12254D]">B</span>
      </motion.div>
    </div>
  );
}
