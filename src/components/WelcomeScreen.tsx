import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
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
    '﴿ وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ ﴾',
    '﴿ إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ ﴾',
    '﴿ وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ﴾',
    '﴿ فَاذْكُرُونِي أَذْكُرْكُمْ ﴾',
    '﴿ وَبَشِّرِ الصَّابِرِينَ ﴾',
    '﴿ سَيَجْعَلُ اللَّهُ بَعْدَ عُسْرٍ يُسْرًا ﴾',
    '﴿ وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ ﴾',
    '﴿ رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ ﴾',
    '﴿ وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ ﴾',
    '﴿ إِنَّمَا الْمُؤْمِنُونَ إِخْوَةٌ ﴾',
    '﴿ وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا ﴾',
    '﴿ وَقُولُوا لِلنَّاسِ حُسْنًا ﴾',
    '﴿ إِنَّ أَكْرَمَكُمْ عِندَ اللَّهِ أَتْقَاكُمْ ﴾',
    '﴿ وَلَا تَمْشِ فِي الْأَرْضِ مَرَحًا ﴾',
    '﴿ وَاخْفِضْ جَنَاحَكَ لِلْمُؤْمِنِينَ ﴾',
    '﴿ فَبِمَا رَحْمَةٍ مِّنَ اللَّهِ لِنتَ لَهُمْ ﴾',
    '﴿ خُذِ الْعَفْوَ وَأْمُرْ بِالْعُرْفِ ﴾',
    '﴿ وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ ﴾',
    '﴿ وَفِي أَنفُسِكُمْ أَفَلَا تُبْصِرُونَ ﴾',
    '﴿ فَتَبَارَكَ اللَّهُ أَحْسَنُ الْخَالِقِينَ ﴾',
    '﴿ وَكَفَىٰ بِاللَّهِ وَكِيلًا ﴾',
    '﴿ حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ ﴾',
    '﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾',
    '﴿ وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ عَلَيْهِ تَوَكَّلْتُ وَإِلَيْهِ أُنِيبُ ﴾',
    '﴿ رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ ﴾',
    '﴿ وَلَنَبْلُوَنَّكُم بِشَيْءٍ مِّنَ الْخَوْفِ وَالْجُوعِ ﴾',
    '﴿ وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ ﴾',
    '﴿ قُلْ هُوَ اللَّهُ أَحَدٌ ﴾',
    '﴿ رَبِّ هَبْ لِي حُكْمًا وَأَلْحِقْنِي بِالصَّالِحِينَ ﴾',
    '﴿ وَلَا تَهِنُوا وَلَا تَحْزَنُوا وَأَنتُمُ الْأَعْلَوْنَ ﴾',
    '﴿ وَلَنَجْزِيَنَّ الَّذِينَ صَبَرُوا أَجْرَهُم بِأَحْسَنِ مَا كَانُوا يَعْمَلُونَ ﴾',
    '﴿ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ ﴾',
    '﴿ وَلَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ﴾',
    '﴿ قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ﴾',
    '﴿ وَنَضَعُ الْمَوَازِينَ الْقِسْطَ لِيَوْمِ الْقِيَامَةِ ﴾',
    'مَن طَلَبَ العُلا سَهِرَ اللّيالي — المتنبي',
    'إذا غامَرتَ في شَرَفٍ مَرومٍ فلا تَقنَع بما دونَ النجومِ — المتنبي',
    'على قَدرِ أَهلِ العَزمِ تأتي العَزائِمُ — المتنبي',
    'تعلّمْ فليسَ المرءُ يُولَدُ عالماً — علي بن أبي طالب',
    'خيرُ جليسٍ في الزمانِ كتابُ — المتنبي',
    'العلمُ نورٌ والجهلُ ظلامٌ',
    'كُن عالماً أو متعلماً ولا تكن إمَّعةً',
    'إذا لم تزد شيئاً على الدنيا كنتَ زائداً عليها',
    'ليس الجمالُ بأثوابٍ تُزَيِّنُنا إنّ الجمالَ جمالُ العلمِ والأدبِ',
    'العلمُ في الصِّغَرِ كالنّقشِ في الحَجَرِ',
    'مَن جدّ وجد ومَن زرع حصد',
    'الصبرُ مفتاحُ الفَرَجِ',
    'أعزُّ مكانٍ في الدُّنى سرجُ سابحٍ وخيرُ جليسٍ في الزمانِ كتابُ — المتنبي',
    'لا تؤجّل عمل اليوم إلى الغد',
    'ما ضاع حقٌّ وراءه مُطالب',
    'مَن سار على الدرب وصل',
    'الحكمة ضالة المؤمن',
    'رُبّ همّةٍ أحيت أمّة',
    'في التأنّي السلامة وفي العجلة الندامة',
    'لكلِّ مقامٍ مقال',
    'ألا كلُّ شيءٍ ما خلا اللّهَ باطلُ — لبيد بن ربيعة',
    'سلاحُ اللئيمِ قُبْحُ الكلامِ — أحمد شوقي',
    'ومَن يتهيَّبْ صعودَ الجبالِ يعِشْ أبدَ الدهرِ بينَ الحُفَرِ — أبو القاسم الشابي',
    'وطنٌ بلا ثقافةٍ بناءٌ بلا أساس',
    'خَلَقَ اللّهُ لنا أُذُنَيْنِ ولساناً واحداً لنسمعَ أكثرَ ممّا نتكلّم',
    'بقدرِ لغاتِ المرءِ يكثرُ نفعُهُ — حافظ إبراهيم',
    'قُم للمعلّمِ وَفِّهِ التبجيلا كاد المعلّمُ أن يكونَ رسولا — أحمد شوقي',
    'أنا الذي نظرَ الأعمى إلى أدبي وأسمعتْ كلماتي من به صَمَمُ — المتنبي',
    'وما نيلُ المطالبِ بالتمنّي ولكن تُؤخَذُ الدنيا غِلابا — أحمد شوقي',
    'إنّ الطيورَ على أشكالِها تقعُ',
    'مَن جاورَ الحدّادَ انطفأ بنارِه',
    'ليسَ الفتى مَن يقولُ كانَ أبي بل الفتى مَن يقولُ ها أنا ذا',
    'أَتاني هواها قبلَ أن أعرفَ الهوى فصادفَ قلباً خالياً فتمكّنا — قيس بن الملوّح',
    'العينُ بصيرةٌ واليدُ قصيرة',
    'رُبَّ أخٍ لكَ لم تلِدْهُ أمُّكَ',
    'النّاسُ كالإبلِ المائةِ لا تكادُ تجدُ فيها راحلة',
    'خيرُ الكلامِ ما قلَّ ودلَّ',
    'مَن حفرَ حفرةً لأخيه وقعَ فيها',
    'الجارُ قبلَ الدارِ والرفيقُ قبلَ الطريقِ',
    'إنّما الأممُ الأخلاقُ ما بقيت فإن هُمُ ذهبت أخلاقهم ذهبوا — أحمد شوقي',
    'وإذا المنيّةُ أنشبت أظفارَها ألفيتَ كلَّ تميمةٍ لا تنفعُ — الحريري',
    'تَمُرُّ بكَ الأبطالُ كَلْمَى هَزِيمةً ووجهُك وَضّاحٌ وثغرُكَ باسِمُ — المتنبي',
    'أعلّلُ النفسَ بالآمالِ أرقبُها ما أضيقَ العيشَ لولا فُسحةُ الأملِ',
    'سأصبرُ حتى يعجزَ الصبرُ عن صبري',
    'تبارَى بهم قُرّاؤنا في طلاوةٍ كتمرٍ لذيذٍ طابَ في جَنَّةٍ غَنّاء',
  ],
  en: [
    '"Read in the name of your Lord who created." — Quran 96:1',
    '"And say: My Lord, increase me in knowledge." — Quran 20:114',
    '"Indeed, with hardship comes ease." — Quran 94:6',
    '"Whoever fears Allah, He will make a way out for him." — Quran 65:2',
    '"And whoever relies upon Allah — then He is sufficient for him." — Quran 65:3',
    '"Call upon Me; I will respond to you." — Quran 40:60',
    '"Do not grieve; indeed Allah is with us." — Quran 9:40',
    '"Unquestionably, by the remembrance of Allah hearts are assured." — Quran 13:28',
    '"He who seeks greatness must stay up through the nights." — Al-Mutanabbi',
    '"If you aspire to noble heights, don\'t settle for less than the stars." — Al-Mutanabbi',
    '"Knowledge is light, and ignorance is darkness."',
    '"Be a scholar or a learner, but never indifferent."',
    '"Patience is the key to relief."',
    '"Whoever strives shall find."',
    '"A determined will can revive a nation."',
    '"Stand for your teacher and show them respect." — Ahmad Shawqi',
    '"Nations are nothing but their morals." — Ahmad Shawqi',
    '"He who fears climbing mountains lives forever among the pits." — Abu Al-Qasim Al-Shabbi',
    '"The best speech is that which is brief and to the point."',
    '"A neighbor before the house, a companion before the road."',
    '"Birds of a feather flock together."',
    '"Indeed, Allah does not change the condition of a people until they change themselves." — Quran 13:11',
    '"And do not lose hope in the mercy of Allah." — Quran 12:87',
    '"Indeed, Allah is with the patient." — Quran 2:153',
    '"Perhaps you hate a thing and it is good for you." — Quran 2:216',
  ],
};

export function WelcomeScreen({ onClose }: WelcomeScreenProps) {
  const { t, lang } = useLanguage();
  const quoteList = lang === 'ar' ? quotes.ar : quotes.en;
  // Random on each open using Math.random, seeded with current time
  const randomQuote = useMemo(() => quoteList[Math.floor(Math.random() * quoteList.length)], []);

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
