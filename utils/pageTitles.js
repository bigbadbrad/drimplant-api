function normalizePath(path) {
  if (!path) return '';
  let value = String(path).split('?')[0];
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      /* keep */
    }
  }
  if (!value.startsWith('/')) return value;
  const noLocale = value.replace(/^\/es(?=\/|$)/, '') || '/';
  if (noLocale === '/') return '/';
  return noLocale.endsWith('/') ? noLocale : `${noLocale}/`;
}

const PAGE_TITLES = {
  '/': 'Home',
  '/meet-our-doctors/': 'Meet Our Doctors',
  '/meet-our-doctors/dr-alexander-takshyn/': 'Dr. Alexander Takshyn',
  '/meet-our-doctors/dr-ailin-chao/': 'Dr. Ailin Chao',
  '/meet-our-doctors/dr-lazaro-f-gavilla/': 'Dr. Lazaro F. Gavilla',
  '/meet-our-doctors/dr-navarro/': 'Dr. Navarro',
  '/meet-our-doctors/dr-dashiel-carr/': 'Dr. Dashiel Carr',
  '/meet-our-doctors/dr-mark-turner/': 'Dr. Mark Turner',
  '/meet-our-doctors/dr-richard-valera/': 'Dr. Richard Valera',
  '/meet-our-doctors/dr-elianne-vazquez/': 'Dr. Elianne Vazquez',
  '/meet-our-doctors/dr-arletys-cuellar/': 'Dr. Arletys Cuellar',
  '/meet-our-doctors/dr-jennifer-andrulonis/': 'Dr. Jennifer Andrulonis',
  '/meet-our-doctors/dr-jose-alberto/': 'Dr. Jose Alberto',
  '/service/dental-implants/dental-implants-in-24-hours/': 'Dental Implant in 24H',
  '/service/dental-implants/zirconia-fixed-bridge/': 'Zirconia Fixed Bridge',
  '/service/full-mouth-rehab/': 'Full Mouth Rehab',
  '/services/': 'Services',
  '/patient-success-stories/': 'Patient Success Stories',
  '/patient-reviews/': 'Patient Reviews',
  '/smile-gallery/': 'Smile Gallery',
  '/patient-resources/': 'Patient Resources',
  '/patient-resources/dental-implant-cost/': 'Dental Implant Cost',
  '/patient-resources/dental-implant-financing/': 'Dental Implant Financing',
  '/patient-resources/dental-implant-faq/': 'Dental Implant FAQ',
  '/patient-resources/first-visit-expectations/': 'First Visit Expectations',
  '/patient-resources/fixed-vs-removable-teeth/': 'Fixed Vs. Removable Teeth',
  '/patient-resources/video-library/': 'Video Library',
  '/about-us/': 'About Us',
  '/about-us/state-of-the-art-dental-lab/': 'State Of The Art Dental Lab',
  '/contact-us/': 'Contact us',
  '/location/dr-implant-miami/': 'Dr. Implant Miami',
  '/location/dr-implant-westchester/': 'Dr. Implant Westchester',
  '/location/dr-implant-pembroke-pines/': 'Dr. Implant Pembroke Pines',
  '/location/dr-implant-delray-beach/': 'Dr. Implant Delray Beach',
  '/area-served/miami-fl/': 'Miami, FL',
  '/area-served/westchester-fl/': 'Westchester FL',
  '/area-served/pembroke-pines-fl/': 'Pembroke Pines, FL',
  '/area-served/delray-beach-fl/': 'Delray Beach, FL',
  '/blog/': 'Blog',
  '/conditions/': 'Conditions',
  '/conditions/replace-missing-teeth/': 'Replace Missing Teeth',
  '/conditions/loose-dentures/': 'Loose Dentures',
  '/conditions/failing-dental-implants/': 'Failing Dental Implants',
  '/conditions/bone-loss/': 'Bone Loss',
};

function slugTitle(path) {
  const clean = normalizePath(path);
  if (!clean || clean === '/') return 'Home';
  const slug = clean.split('/').filter(Boolean).pop();
  if (!slug) return 'Home';
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function pageTitle(path) {
  const clean = normalizePath(path);
  if (!clean) return null;
  return PAGE_TITLES[clean] || slugTitle(clean);
}

function hrefFromElementsChain(chain) {
  if (!chain) return '';
  const matches = String(chain).matchAll(/(?:attr__href|href)="(\/[^"]+)"/g);
  for (const match of matches) {
    const href = match[1];
    if (href && !href.startsWith('/#')) return href;
  }
  return '';
}

module.exports = {
  normalizePath,
  pageTitle,
  hrefFromElementsChain,
};
