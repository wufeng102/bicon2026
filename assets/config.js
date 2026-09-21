/* B-ICON 2026 runtime configuration.
   GitHub Pages / preview: edit this file (assets/config.js in the published folder).
   Blogger: copy src/config.js to the repository root before running the build; it is inlined into the theme. */
window.BICON_CONFIG = {
  // Web app URL of the Google Apps Script deployment (ends with /exec). Empty = registration shows a "not connected" notice.
  gasUrl: '',

  // Firestore (optional). Leave null to serve posters through Apps Script instead.
  // firebase: { apiKey: '...', authDomain: 'PROJECT.firebaseapp.com', projectId: 'PROJECT', appId: '...' },
  firebase: null,

  // Leave null. The site works out its own base path.
  basePath: null,

  // Blogger feed used for the News section (label "News"). Leave as is on Blogger.
  // On GitHub Pages set the full blog address, for example 'https://YOURBLOG.blogspot.com/feeds/posts/default/-/News?alt=json&max-results=6'
  newsFeed: '/feeds/posts/default/-/News?alt=json&max-results=6',

  ojs: {
    baseUrl: 'https://proceeding.poltekkesbengkulu.ac.id/index.php/B-ICON'
    // submitUrl: '', registerUrl: '', loginUrl: ''   // override if the OJS paths differ
  },

  features: {
    manuscriptUpload: true,
    posterUpload: true,
    appreciate: true,
    demo: false,          // true shows sample posters. Never enable on the real site.
    whatsappFloat: true
  }
};
