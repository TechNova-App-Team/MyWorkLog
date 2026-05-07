// ═══ SUCCESS BANNER MODULE ═══

const SuccessBanner = {
  storageKey: 'tg_success_banner_shown',

  init() {
    this.setupBannerListeners();
  },

  setupBannerListeners() {
    const bannerClose = document.getElementById('successBannerClose');
    if (bannerClose) {
      bannerClose.addEventListener('click', () => this.dismissBanner());
    }
  },

  dismissBanner() {
    const banner = document.getElementById('successBanner');
    if (banner) {
      banner.style.animation = 'successBannerSlideOut 0.4s cubic-bezier(0.32,0.72,0,1) forwards';
      setTimeout(() => {
        banner.style.display = 'none';
        if (typeof uEvent === 'function') uEvent('success_banner_dismissed');
      }, 400);
    }
  },

  show() {
    const banner = document.getElementById('successBanner');
    if (banner) {
      banner.style.display = 'flex';
      banner.style.animation = 'successBannerSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      if (typeof uEvent === 'function') uEvent('success_banner_shown');
    }
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    SuccessBanner.init();
    SuccessBanner.show();
  });
} else {
  SuccessBanner.init();
  SuccessBanner.show();
}
