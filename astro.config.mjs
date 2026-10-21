import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

const DEPOT = 'https://github.com/issadicko/polymorph-docs';

/** GitHub Pages serves the site under /polymorph-docs/; links inside the pages are relative, so they need no prefix. */
const BASE = '/polymorph-docs';

export default defineConfig({
  site: 'https://issadicko.github.io',
  base: BASE,
  integrations: [
    starlight({
      title: 'Polymorph',
      description: 'Documentation de Polymorph, la plateforme qui prend la forme de votre établissement.',
      logo: { src: './src/assets/logo.svg' },
      favicon: '/favicon.svg',
      defaultLocale: 'root',
      locales: {
        root: { label: 'Français', lang: 'fr' },
        en: { label: 'English', lang: 'en' },
        ar: { label: 'العربية', lang: 'ar', dir: 'rtl' },
      },
      social: [{ icon: 'github', label: 'GitHub', href: DEPOT }],
      editLink: { baseUrl: `${DEPOT}/edit/main/` },
      lastUpdated: true,
      customCss: ['@fontsource-variable/rubik', './src/styles/polymorph.css'],
      sidebar: [
        {
          label: 'Extensions',
          translations: { en: 'Extensions', ar: 'الإضافات' },
          items: [
            { slug: 'extensions', label: 'Vue d’ensemble', translations: { en: 'Overview', ar: 'نظرة عامة' } },
            { slug: 'extensions/premiere-extension', label: 'Votre première extension', translations: { en: 'Your first extension', ar: 'إضافتك الأولى' } },
            {
              label: 'Écrire une extension',
              translations: { en: 'Writing an extension', ar: 'كتابة إضافة' },
              items: [
                { slug: 'extensions/manifeste', label: 'Le manifeste', translations: { en: 'The manifest', ar: 'ملف التعريف' } },
                { slug: 'extensions/entites', label: 'Entités et champs', translations: { en: 'Entities and fields', ar: 'الكيانات والحقول' } },
                { slug: 'extensions/application', label: 'Tuile, écrans et cartes', translations: { en: 'Tile, screens and cards', ar: 'الأيقونة والشاشات والبطاقات' } },
                { slug: 'extensions/hooks', label: 'Scripts et hooks', translations: { en: 'Scripts and hooks', ar: 'السكربتات ونقاط الربط' } },
                { slug: 'extensions/kodiscript', label: 'KodiScript en bref', translations: { en: 'KodiScript in brief', ar: 'KodiScript باختصار' } },
                { slug: 'extensions/traductions', label: 'Textes et traductions', translations: { en: 'Texts and translations', ar: 'النصوص والترجمات' } },
              ],
            },
            {
              label: 'Livrer une extension',
              translations: { en: 'Shipping an extension', ar: 'تسليم إضافة' },
              items: [
                { slug: 'extensions/verifier-empaqueter', label: 'Vérifier et empaqueter', translations: { en: 'Check and package', ar: 'التحقق والتحزيم' } },
                { slug: 'extensions/installation', label: 'Installation et cycle de vie', translations: { en: 'Installation and lifecycle', ar: 'التثبيت ودورة الحياة' } },
                { slug: 'extensions/versions', label: 'Versions et compatibilité', translations: { en: 'Versions and compatibility', ar: 'الإصدارات والتوافق' } },
                { slug: 'extensions/erreurs', label: 'Erreurs courantes', translations: { en: 'Common errors', ar: 'الأخطاء الشائعة' } },
              ],
            },
            { slug: 'extensions/exemples', label: 'Exemples', translations: { en: 'Examples', ar: 'أمثلة' } },
          ],
        },
        {
          label: 'Extensions natives',
          translations: { en: 'Native extensions', ar: 'الإضافات الأصلية' },
          items: [
            { slug: 'natives', label: 'Vue d’ensemble', translations: { en: 'Overview', ar: 'نظرة عامة' } },
            { slug: 'natives/premiere-extension', label: 'Votre première extension native', translations: { en: 'Your first native extension', ar: 'إضافتك الأصلية الأولى' } },
            { slug: 'natives/manifeste', label: 'Le manifeste natif', translations: { en: 'The native manifest', ar: 'ملف التعريف الأصلي' } },
            { slug: 'natives/serveur', label: 'Le code serveur', translations: { en: 'Server code', ar: 'شيفرة الخادم' } },
            { slug: 'natives/interface', label: 'L’interface et le SDK', translations: { en: 'Interface and SDK', ar: 'الواجهة وحزمة التطوير' } },
            { slug: 'natives/livrer', label: 'Signer, livrer, déployer', translations: { en: 'Sign, ship, deploy', ar: 'التوقيع والتسليم والنشر' } },
          ],
        },
      ],
    }),
  ],
});
