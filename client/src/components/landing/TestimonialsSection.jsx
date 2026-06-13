import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    quote: "GallaMitra completely digitized my retail store's ledger. The WhatsApp portal integration lets customers view their balances and settle dues via UPI instantly!",
    author: "Rajesh Patel",
    role: "Proprietor, Patel Supermarket",
    location: "Ahmedabad, Gujarat",
    rating: 5,
    avatarColor: "bg-blue-500 text-white"
  },
  {
    quote: "The offline-ready PWA client is incredibly fast under physical shop operations. GST invoice builds take seconds and sync immediately once online. Zero buffering delay!",
    author: "Amit Sharma",
    role: "Owner, Sharma Electronics",
    location: "Indore, Madhya Pradesh",
    rating: 5,
    avatarColor: "bg-emerald-500 text-white"
  },
  {
    quote: "Managing my three wholesale branches used to be a ledger nightmare. The Multi-Business workspace switcher separates our accounts clearly under one master tenant.",
    author: "Priya Mehta",
    role: "Director, Mehta Textiles",
    location: "Surat, Gujarat",
    rating: 5,
    avatarColor: "bg-purple-500 text-white"
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
      timerRef.current = setInterval(slideNext, 5000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isHovered]);

  const activeTestimonial = testimonials[currentIndex];

  // Framer motion animation variants
  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir) => ({
      x: dir < 0 ? 100 : -100,
      opacity: 0
    })
  };

  return (
    <section className="py-24 px-4 sm:px-6 bg-[#F8FAFC] border-t border-slate-200/60 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-50/40 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-12 space-y-3">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-black uppercase tracking-widest text-blue-600 font-mono"
          >
            Customer Reviews
          </motion.p>
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight"
          >
            Trusted by Indian Merchants & Retailers
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 text-xs sm:text-sm font-medium max-w-lg mx-auto leading-relaxed"
          >
            See how small business owners are optimizing cash loops, digital collections, and billing sequences with GallaMitra.
          </motion.p>
        </div>

        {/* Carousel Slider Component */}
        <div 
          className="relative min-h-[300px] flex items-center justify-center"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Previous Button */}
          <button 
            onClick={slidePrev}
            className="absolute left-0 md:-left-16 z-20 w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 flex items-center justify-center shadow-xs transition-all cursor-pointer active:scale-95"
            aria-label="Previous Slide"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Slider Content Wrapper */}
          <div className="w-full overflow-hidden px-4">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "tween", ease: "easeInOut", duration: 0.35 }}
                className="bg-white border border-slate-200/80 p-8 sm:p-10 rounded-3xl flex flex-col justify-between relative shadow-md"
              >
                {/* Quote Mark Icon Overlay */}
                <div className="absolute top-8 right-8 text-slate-100/80 pointer-events-none">
                  <Quote size={48} className="stroke-[1.5]" />
                </div>

                <div>
                  {/* Stars Rating */}
                  <div className="flex gap-1 mb-6">
                    {[...Array(activeTestimonial.rating)].map((_, i) => (
                      <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-slate-600 text-sm md:text-base font-semibold leading-relaxed mb-8 italic relative z-10">
                    "{activeTestimonial.quote}"
                  </p>
                </div>

                <div className="flex items-center gap-4 border-t border-slate-100 pt-6 mt-auto">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-xs font-mono uppercase tracking-wider shadow-inner ${activeTestimonial.avatarColor}`}>
                    {activeTestimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm tracking-tight">{activeTestimonial.author}</h4>
                    <p className="text-slate-400 text-[10px] font-black uppercase font-mono mt-0.5 tracking-wider">{activeTestimonial.role}</p>
                    <p className="text-blue-500 text-[10px] font-bold mt-0.5">{activeTestimonial.location}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Next Button */}
          <button 
            onClick={slideNext}
            className="absolute right-0 md:-right-16 z-20 w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 flex items-center justify-center shadow-xs transition-all cursor-pointer active:scale-95"
            aria-label="Next Slide"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Carousel Indicators / Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex ? 'w-8 bg-blue-600' : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
