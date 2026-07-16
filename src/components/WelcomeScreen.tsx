import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import quotesData from '@/data/quotes.json';

interface WelcomeScreenProps {
  onClose: () => void;
}

const quotes = quotesData as { ar: string[]; en: string[] };

export function WelcomeScreen({ onClose }: WelcomeScreenProps) {
  const { t, lang } = useLanguage();
  const quoteList = lang === 'ar' ? quotes.ar : quotes.en;
  const randomQuote = useMemo(() => quoteList[Math.floor(Math.random() * quoteList.length)], [quoteList]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary/90 via-primary to-secondary/80 backdrop-blur-lg"
      >
        <button onClick={onClose} className="absolute top-6 left-6 text-primary-foreground/80 hover:text-primary-foreground transition-colors">
          <X className="w-8 h-8" />
        </button>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 100 }} className="text-center px-8 max-w-2xl">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
            <img src="/logo.png" alt="إبداع" className="w-20 h-20 mx-auto mb-6 drop-shadow-2xl" />
          </motion.div>
          <h1 className="text-5xl md:text-6xl font-bold text-primary-foreground mb-6 font-heading">{t('إبداع', 'Ibdaa')}</h1>
          <p className="text-xl md:text-2xl text-primary-foreground/90 mb-8 leading-relaxed">{randomQuote}</p>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="px-8 py-3 rounded-full bg-accent text-accent-foreground font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow">
            {t('ابدأ الآن', 'Get Started')}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
