import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface WelcomeScreenProps {
  onClose: () => void;
}

const quotes = {
  ar: [
    '﴿ اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ ﴾',
    '﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾',
    '﴿ إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾',
    '﴿ وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ﴾',
    '﴿ فَإِنَّ مَعَ الْعُسْرِ يُسْرًا * إِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾',
    '﴿ رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً وَهَيِّئْ لَنَا مِنْ أَمْرِنَا رَشَدًا ﴾',
    '﴿ وَعَلَّمَكَ مَا لَمْ تَكُن تَعْلَمُ وَكَانَ فَضْلُ اللَّهِ عَلَيْكَ عَظِيمًا ﴾',
    '﴿ يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ ﴾',
    '﴿ وَلَسَوْفَ يُعْطِيكَ رَبُّكَ فَتَرْضَى ﴾',
    '﴿ وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ ﴾',
    '﴿ رَبِّ اشْرَحْ لِي صَدْرِي * وَيَسِّرْ لِي أَمْرِي ﴾',
    '﴿ وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ﴾',
    '﴿ ادْعُونِي أَسْتَجِبْ لَكُمْ ﴾',
    '﴿ لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا ﴾',
    '﴿ وَنُنَزِّلُ مِنَ الْقُرْآنِ مَا هُوَ شِفَاءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ ﴾',
    'مَن طَلَبَ العُلا سَهِرَ اللّيالي — المتنبي',
    'أنا الذي نظر الأعمى إلى أدبي — المتنبي',
    'إذا غامَرتَ في شَرَفٍ مَرومٍ فلا تَقنَع بما دونَ النجومِ — المتنبي',
    'على قَدرِ أَهلِ العَزمِ تأتي العَزائِمُ — المتنبي',
    'تعلّمْ فليسَ المرءُ يُولَدُ عالماً — علي بن أبي طالب',
    'خيرُ جليسٍ في الزمانِ كتابُ — أبو الطيب المتنبي',
    'العلمُ نورٌ والجهلُ ظلامٌ',
    'كُن عالماً أو متعلماً ولا تكن إمَّعةً',
    'إذا لم تزد شيئاً على الدنيا كنتَ زائداً عليها',
    'لا يُدرِكُ الحكمةَ مَن لا يتعلّمها',
    'ليس الجمالُ بأثوابٍ تُزَيِّنُنا إنّ الجمالَ جمالُ العلمِ والأدبِ',
    'العلمُ في الصِّغَرِ كالنّقشِ في الحَجَرِ',
    'مَن جدّ وجد ومَن زرع حصد',
    'صبرُ قليلٍ يُمحى ألمَ طويلٍ',
    'الصبرُ مفتاحُ الفَرَجِ',
  ],
  en: [
    '"Read in the name of your Lord who created." — Quran 96:1',
    '"And say: My Lord, increase me in knowledge." — Quran 20:114',
    '"Indeed, with hardship comes ease." — Quran 94:6',
    '"Whoever fears Allah, He will make a way out for him." — Quran 65:2',
    '"He who seeks greatness must stay up through the nights." — Al-Mutanabbi',
    '"If you aspire to noble heights, don\'t settle for less than the stars." — Al-Mutanabbi',
    '"Knowledge is light, and ignorance is darkness."',
    '"Be a scholar or a learner, but never indifferent."',
    '"Patience is the key to relief."',
    '"Whoever strives shall find."',
  ],
};

export function WelcomeScreen({ onClose }: WelcomeScreenProps) {
  const { t, lang } = useLanguage();
  const quoteList = lang === 'ar' ? quotes.ar : quotes.en;
  const randomQuote = useMemo(() => quoteList[Math.floor(Math.random() * quoteList.length)], []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary/90 via-primary to-secondary/80"
      >
        <button onClick={onClose} className="absolute top-6 left-6 text-primary-foreground/80 hover:text-primary-foreground transition-colors">
          <X className="w-8 h-8" />
        </button>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 100 }} className="text-center px-8 max-w-2xl">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
            <Sparkles className="w-16 h-16 text-accent mx-auto mb-6" />
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
