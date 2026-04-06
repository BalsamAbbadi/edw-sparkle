import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface WelcomeScreenProps {
  onClose: () => void;
}

const quotes = {
  ar: [
    'العلم نور والجهل ظلام',
    'من طلب العلا سهر الليالي',
    'إبداعك يبدأ من هنا ✨',
    'كل يوم هو فرصة جديدة للتعلم',
  ],
  en: [
    'Knowledge is light, ignorance is darkness',
    'Creativity starts here ✨',
    'Every day is a new opportunity to learn',
    'The beautiful thing about learning is that no one can take it away from you',
  ],
};

export function WelcomeScreen({ onClose }: WelcomeScreenProps) {
  const { t, lang } = useLanguage();
  const quoteList = lang === 'ar' ? quotes.ar : quotes.en;
  const randomQuote = quoteList[Math.floor(Math.random() * quoteList.length)];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary/90 via-primary to-secondary/80"
      >
        <button
          onClick={onClose}
          className="absolute top-6 left-6 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
        >
          <X className="w-8 h-8" />
        </button>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
          className="text-center px-8 max-w-lg"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <Sparkles className="w-16 h-16 text-accent mx-auto mb-6" />
          </motion.div>

          <h1 className="text-5xl md:text-6xl font-bold text-primary-foreground mb-4 font-heading">
            {t('إبداع', 'Ibdaa')}
          </h1>

          <p className="text-xl text-primary-foreground/90 mb-8 leading-relaxed">
            {randomQuote}
          </p>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-8 py-3 rounded-full bg-accent text-accent-foreground font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            {t('ابدأ الآن', 'Get Started')}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
