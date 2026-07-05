import { useState, useEffect } from "react";
import baraSmile from "@/assets/bara-smile.png";

export function SplashScreen() {
  const [show, setShow] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    const hasShown = sessionStorage.getItem("splashShown");
    // Show splash screen if it hasn't been shown in this session
    if (!hasShown) {
      setShow(true);
      sessionStorage.setItem("splashShown", "true");
      
      // Start exit animation after 2.5 seconds
      setTimeout(() => {
        setAnimateOut(true);
      }, 2500);

      // completely remove from DOM after 3.2 seconds
      setTimeout(() => {
        setShow(false);
      }, 3200);
    }
  }, []);

  if (!show) return null;

  return (
    <div 
      className={`fixed inset-0 z-[999] bg-ink flex flex-col items-center justify-center overflow-hidden transition-transform duration-700 ease-[cubic-bezier(0.7,0,0.3,1)] ${
        animateOut ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex flex-col items-center gap-6 z-10 relative">
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 overflow-hidden px-4">
          {/* Bara Animation sliding from left */}
          <div className="animate-splash-bara shrink-0">
             <img src={baraSmile} alt="Bara Mascot" className="w-32 h-32 sm:w-48 sm:h-48 object-contain drop-shadow-2xl" />
          </div>
          
          {/* Welcome Text sliding from right */}
          <div className="animate-splash-text flex flex-col justify-center items-center sm:items-start text-center sm:text-left">
             <h1 className="text-4xl sm:text-6xl font-extrabold text-cream display uppercase leading-none tracking-tight">
               Welcome To<br />
               <span className="text-brand-orange">Filkom Merch</span>
             </h1>
          </div>
        </div>
        
        {/* Subtitle fading up */}
        <p className="text-cream/70 font-mono tracking-widest text-xs sm:text-sm font-bold animate-splash-fade-up">
          Official Merch Filkom UB
        </p>
      </div>
      
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-orange rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-blue rounded-full mix-blend-screen filter blur-[120px] animate-pulse [animation-delay:1s]"></div>
      </div>
    </div>
  );
}
