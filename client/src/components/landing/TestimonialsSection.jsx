import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight, TrendingUp, Sparkles } from 'lucide-react';

const testimonials = [
  {
    quote: "GallaMitra completely digitized my retail store's ledger. The WhatsApp portal integration lets customers view their balances and settle dues via UPI instantly!",
    author: "Rajesh Patel",
    role: "Proprietor, Patel Supermarket",
    location: "Ahmedabad, Gujarat",
    rating: 5,
    avatarColor: "bg-blue-600 text-white"
  },
  {
    quote: "The online PWA client is incredibly fast under physical shop operations. GST invoice builds take seconds and sync immediately. Zero buffering delay!",
    author: "Amit Sharma",
    role: "Owner, Sharma Electronics",
    location: "Indore, Madhya Pradesh",
    rating: 5,
    avatarColor: "bg-emerald-600 text-white"
  },
  {
    quote: "Managing my three wholesale branches used to be a ledger nightmare. The Multi-Business workspace switcher separates our accounts clearly under one master tenant.",
    author: "Priya Mehta",
    role: "Director, Mehta Textiles",
    location: "Surat, Gujarat",
    rating: 5,
    avatarColor: "bg-purple-600 text-white"
  }
];

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef(null);

  const slideNext = () => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const slidePrev = () => {
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  // Autoplay functionality
  useEffect(() => {
    if (!isHovered) {
      timerRef.current = setInterval(slideNext, 6000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isHovered]);

  const activeTestimonial = testimonials[currentIndex];

  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir) => ({
      x: dir < 0 ? 80 : -80,
      opacity: 0
    })
  };

  return (
    <section className="py-24 px-4 sm:px-6 erp-grid-bg-white border-t border-slate-200/60 relative overflow-hidden">
      {/* Background Decorative Gradient Rings */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-50/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-indigo-50/30 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Main Split Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Trust Statistics & Merchant Metrics */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 font-mono bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                Merchant Success Stories
              </span>
              <h3 className="text-3xl md:text-4xl font-black text-slate-905 tracking-tight leading-tight">
                Trusted by 10k+ Indian Retailers &amp; Merchants
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed">
                See how shop owners are optimizing cash recovery cycles, generating GST invoices, and managing credit ledger registers with GallaMitra.
              </p>
            </div>

            {/* Overlapping Merchant Avatars & Trust Summary */}
            <div className="flex items-center gap-4 py-2 border-y border-slate-100">
              <div className="flex -space-x-3.5">
                {testimonials.map((t, idx) => (
                  <div 
                    key={idx} 
                    className={`w-10 h-10 rounded-full border-2 border-white flex items-center justify-center font-black text-[10px] font-mono shadow-sm ${t.avatarColor}`}
                  >
                    {t.author.split(' ').map(n => n[0]).join('')}
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-900 text-white flex items-center justify-center font-black text-[9px] font-mono shadow-sm">
                  +10k
                </div>
              </div>
              <div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-[11px] font-bold text-slate-600 mt-1">
                  4.9/5 Rating based on 8,240+ Indian Stores
                </p>
              </div>
            </div>

            {/* Micro KPI Badge Grid */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <div className="p-4 bg-white/70 border border-slate-200/80 rounded-2xl shadow-2xs flex items-start gap-2.5">
                <TrendingUp size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-slate-900">72% Faster</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight">Dues Recovery loops</p>
                </div>
              </div>
              <div className="p-4 bg-white/70 border border-slate-200/80 rounded-2xl shadow-2xs flex items-start gap-2.5">
                <Sparkles size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black text-slate-900">Real-Time</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-tight">WhatsApp QR alerts</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sliding Testimonial Carousel Deck */}
          <div 
            className="lg:col-span-7 relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Glassmorphic Carousel Card Wrapper */}
            <div className="w-full overflow-hidden bg-white/80 backdrop-blur-md border border-slate-200/90 rounded-[32px] p-8 sm:p-10 shadow-lg relative min-h-[290px] flex flex-col justify-between">
              
              {/* Background Quote Mark Icon Overlay */}
              <div className="absolute top-6 right-8 text-slate-100/90 pointer-events-none select-none">
                <Quote size={52} className="stroke-[1.2]" />
              </div>

              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                  className="flex-1 flex flex-col justify-between"
                >
                  <div>
                    {/* Stars Rating */}
                    <div className="flex gap-1 mb-5">
                      {[...Array(activeTestimonial.rating)].map((_, i) => (
                        <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>

                    {/* Testimonial Quote text */}
                    <p className="text-slate-600 text-sm sm:text-base font-semibold leading-relaxed mb-6 italic relative z-10">
                      "{activeTestimonial.quote}"
                    </p>
                  </div>

                  {/* Testimonial citation info */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-100 pt-5 mt-auto">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-xs font-mono uppercase tracking-wider shadow-inner shrink-0 ${activeTestimonial.avatarColor}`}>
                        {activeTestimonial.author.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-900 text-sm tracking-tight">{activeTestimonial.author}</h4>
                        <p className="text-slate-400 text-[10px] font-black uppercase font-mono mt-0.5 tracking-wider">
                          {activeTestimonial.role}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-blue-600 text-[10px] font-black uppercase tracking-wider font-mono bg-blue-50 border border-blue-100/50 px-2 py-0.5 rounded-lg">
                        {activeTestimonial.location}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation buttons at bottom left relative to card boundaries */}
              <div className="flex gap-2 mt-6 relative z-20">
                <button 
                  onClick={slidePrev}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-605 hover:text-blue-600 flex items-center justify-center shadow-2xs transition-all cursor-pointer active:scale-95"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  onClick={slideNext}
                  className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-605 hover:text-blue-600 flex items-center justify-center shadow-2xs transition-all cursor-pointer active:scale-95"
                  aria-label="Next Slide"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

            </div>

            {/* Slider Dot Indicators */}
            <div className="flex gap-2 mt-4 px-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    idx === currentIndex ? 'w-8 bg-slate-900' : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
