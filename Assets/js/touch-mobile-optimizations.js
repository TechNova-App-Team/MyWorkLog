/**
 * Touch & Mobile Optimizations for TimeTracker
 * Handles mobile-specific interactions, viewport height fixes, and touch feedback
 */

function initializeTouchOptimizations() {
    console.log('🔧 Initializing Touch & Mobile optimizations...');
    
    // ============================================
    // 1. PREVENT ACCIDENTAL ZOOM ON DOUBLE-TAP
    // ============================================
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // ============================================
    // 2. PREVENT PINCH ZOOM (Ctrl + Wheel)
    // ============================================
    document.addEventListener('wheel', (event) => {
        if (event.ctrlKey) {
            event.preventDefault();
        }
    }, { passive: false });
    
    // ============================================
    // 3. VISUAL FEEDBACK FOR BUTTON TOUCHES
    // ============================================
    const buttons = document.querySelectorAll('button, .btn, a[role="button"]');
    buttons.forEach(btn => {
        btn.addEventListener('touchstart', () => {
            btn.style.opacity = '0.8';
            btn.style.transform = 'scale(0.98)';
        });
        btn.addEventListener('touchend', () => {
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1)';
        });
    });
    
    // ============================================
    // 4. FIX VIEWPORT HEIGHT (Handle Browser UI)
    // ============================================
    const handleViewportHeight = () => {
        const height = window.innerHeight;
        document.documentElement.style.setProperty('--viewport-height', `${height}px`);
    };
    
    window.addEventListener('resize', handleViewportHeight);
    window.addEventListener('orientationchange', handleViewportHeight);
    handleViewportHeight();
    
    // ============================================
    // 5. PREVENT SCROLL BOUNCE ON iOS
    // ============================================
    document.addEventListener('touchmove', (e) => {
        // Only prevent on specific elements to allow scrolling in content
        if (e.target.closest('.sidebar, .main')) {
            // Allow scrolling in these containers
            return;
        }
    }, { passive: false });
    
    // ============================================
    // 6. DISABLE DOUBLE-TAP TEXT SELECT ON MOBILE
    // ============================================
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });
    
    console.log('✅ Touch & Mobile optimizations initialized successfully');
}

// Export for use in global scope
if (typeof window !== 'undefined') {
    window.initializeTouchOptimizations = initializeTouchOptimizations;
}
