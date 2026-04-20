// ═══ ACTIVITY CAROUSEL SWIPE ═══

console.log('🔍 Swipe script loading...');

(function () {
    console.log('🔍 IIFE started');
    let downX = 0;

    function initSwipe() {
        console.log('🔍 initSwipe called');
        const wrapper = document.querySelector('.carousel-wrapper');
        console.log('🔍 wrapper found:', !!wrapper);

        if (!wrapper) {
            console.log('🔍 wrapper not found, will retry');
            return false;
        }

        if (wrapper._swipeAttached) {
            console.log('🔍 swipe already attached');
            return true;
        }

        wrapper._swipeAttached = true;
        console.log('🔍 Attaching swipe handlers');

        wrapper.addEventListener('pointerdown', (e) => {
            downX = e.clientX;
            console.log('🔍 pointerdown at', downX);
        }, false);

        wrapper.addEventListener('pointerup', (e) => {
            if (!downX) return;
            const dx = e.clientX - downX;
            console.log('🔍 pointerup, dx:', dx);

            const threshold = 50;
            const idx = window.activityCarousel?.currentIndex ?? 0;
            const total = window.activityCarousel?.total ?? 1;
            console.log('🔍 idx:', idx, 'total:', total);

            if (dx > threshold && idx > 0) {
                console.log('🔍 Swiping LEFT');
                window.activityCarouselGoTo(idx - 1);
            } else if (dx < -threshold && idx < total - 1) {
                console.log('🔍 Swiping RIGHT');
                window.activityCarouselGoTo(idx + 1);
            }
            downX = 0;
        }, false);

        wrapper.addEventListener('touchstart', (e) => {
            downX = e.touches[0]?.clientX ?? 0;
            console.log('🔍 touchstart at', downX);
        }, false);

        wrapper.addEventListener('touchend', (e) => {
            if (!downX) return;
            const endX = e.changedTouches[0]?.clientX ?? 0;
            const dx = endX - downX;
            console.log('🔍 touchend, dx:', dx);

            const threshold = 50;
            const idx = window.activityCarousel?.currentIndex ?? 0;
            const total = window.activityCarousel?.total ?? 1;

            if (dx > threshold && idx > 0) {
                console.log('🔍 Touch swiping LEFT');
                window.activityCarouselGoTo(idx - 1);
            } else if (dx < -threshold && idx < total - 1) {
                console.log('🔍 Touch swiping RIGHT');
                window.activityCarouselGoTo(idx + 1);
            }
            downX = 0;
        }, false);

        console.log('✓ Swipe initialized');
        return true;
    }

    console.log('🔍 readyState:', document.readyState);

    if (document.readyState === 'loading') {
        console.log('🔍 Adding DOMContentLoaded listener');
        document.addEventListener('DOMContentLoaded', initSwipe);
    } else {
        console.log('🔍 Calling initSwipe immediately');
        initSwipe();
    }

    // Retry wenn carousel später rendert
    let retries = 0;
    const retryInterval = setInterval(() => {
        console.log('🔍 Retry', retries);
        if (document.querySelector('.carousel-wrapper')?._swipeAttached) {
            console.log('🔍 Swipe already attached, clearing interval');
            clearInterval(retryInterval);
            return;
        }
        retries++;
        if (retries > 20) {
            console.log('🔍 Max retries reached');
            clearInterval(retryInterval);
            return;
        }
        initSwipe();
    }, 300);
})();

console.log('🔍 Swipe script loaded');
