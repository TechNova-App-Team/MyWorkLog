// ═══ SUPPORT BANNER MODULE ═══

const SupportBanner = {
  storageKey: 'tg_support_banner_last_shown',
  dismissKey: 'tg_support_banner_dismissed_until',
  showIntervalMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  donateUrl: 'https://buymeacoffee.com/kunzsven16w',

  init() {
    this.setupModalListeners();
    this.setupBannerListeners();
  },

  setupModalListeners() {
    const modalOverlay = document.getElementById('supportModal');
    const closeBtn = document.getElementById('supportModal')?.querySelector('.support-close');
    const dismissBtn = document.getElementById('supportDismiss');
    const donateBtn = document.getElementById('supportDonate');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.dismissModal());
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => this.dismissModal());
    }

    if (donateBtn) {
      donateBtn.addEventListener('click', () => {
        window.open(this.donateUrl, '_blank');
        this.dismissModal();
        if (typeof uEvent === 'function') uEvent('support_banner_donate_click');
      });
    }

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          this.dismissModal();
        }
      });
    }
  },

  setupBannerListeners() {
    const bannerClose = document.getElementById('supportBannerClose');
    const bannerLink = document.getElementById('supportBannerLink');

    if (bannerClose) {
      bannerClose.addEventListener('click', () => this.dismissBanner());
    }

    if (bannerLink) {
      bannerLink.addEventListener('click', () => {
        window.open(this.donateUrl, '_blank');
        if (typeof uEvent === 'function') uEvent('support_banner_footer_click');
      });
    }
  },

  dismissModal() {
    const modal = document.getElementById('supportModal');
    if (modal) {
      modal.style.display = 'none';
      this.markAsShown();
      if (typeof uEvent === 'function') uEvent('support_banner_modal_dismissed');
    }
  },

  dismissBanner() {
    const banner = document.getElementById('supportBanner');
    if (banner) {
      banner.style.display = 'none';
      this.markAsShown();
      uEvent('support_banner_footer_dismissed');
    }
  },

  markAsShown() {
    const now = Date.now();
    localStorage.setItem(this.storageKey, now);
    localStorage.setItem(this.dismissKey, now + this.showIntervalMs);
  },

  shouldShow() {
    const lastDismissed = localStorage.getItem(this.dismissKey);
    if (lastDismissed) {
      const dismissUntil = parseInt(lastDismissed, 10);
      return Date.now() > dismissUntil;
    }
    return true;
  },

  show(variant = 'modal') {
    if (!this.shouldShow()) {
      return;
    }

    if (variant === 'modal') {
      const modal = document.getElementById('supportModal');
      if (modal) {
        modal.style.display = 'flex';
      }
    } else if (variant === 'banner') {
      const banner = document.getElementById('supportBanner');
      if (banner) {
        banner.style.display = 'block';
      }
    }
  },

  // Show modal on first visit or after 30 days
  showModalIfEligible() {
    const lastShown = localStorage.getItem(this.storageKey);

    if (!lastShown) {
      // First visit – show after 3 seconds (let page settle)
      setTimeout(() => this.show('modal'), 3000);
      return;
    }

    if (this.shouldShow()) {
      this.show('modal');
    }
  },

  // Show footer banner persistently (alternative to modal)
  showBanner() {
    this.show('banner');
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    SupportBanner.init();
    SupportBanner.showModalIfEligible();
  });
} else {
  SupportBanner.init();
  SupportBanner.showModalIfEligible();
}
