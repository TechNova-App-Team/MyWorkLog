/**
 * Auto-reset wie YouTube/TikTok/Instagram
 * Smooth, native, performant
 */

class PinchZoom {
    constructor(options = {}) {
        // Config
        this.minZoom = options.minZoom || 1;
        this.maxZoom = options.maxZoom || 4;
        this.resetDelay = options.resetDelay || 200; // Delay before auto-reset
        this.animationDuration = options.animationDuration || 300;
        
        // State
        this.scale = 1;
        this.targetScale = 1;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.velocity = { x: 0, y: 0, scale: 0 };
        
        // Touch state
        this.touches = [];
        this.isZooming = false;
        this.isPanning = false;
        this.lastTouchTime = 0;
        this.resetTimeout = null;
        this.fingerCount = 0;
        
        // Gesture tracking
        this.initialDistance = 0;
        this.initialScale = 1;
        this.initialMidpoint = null;
        this.lastMidpoint = null;
        this.lastScale = 1;
        this.lastDistance = 0;
        
        // Animation
        this.animationFrame = null;
        this.isResetting = false;
        
        // Container
        this.element = options.element || document.body;
        
        this.init();
    }

    init() {
        this.setupStyles();
        this.preventDefaultBehaviors();
        this.bindEvents();
        this.startAnimationLoop();
        
    }

    setupStyles() {
        // Optimize for smooth transforms
        this.element.style.transformOrigin = '0 0';
        this.element.style.willChange = 'transform';
        this.element.style.touchAction = 'manipulation';
        this.element.style.userSelect = 'none';
        this.element.style.webkitUserSelect = 'none';
    }

    preventDefaultBehaviors() {
        // Prevent all default zoom behaviors
        const preventDefault = (e) => e.preventDefault();
        
        document.addEventListener('gesturestart', preventDefault);
        document.addEventListener('gesturechange', preventDefault);
        document.addEventListener('gestureend', preventDefault);
        
        document.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
            }
        }, { passive: false });

        // Prevent iOS double-tap zoom
        let lastTap = 0;
        document.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTap < 300) {
                e.preventDefault();
            }
            lastTap = now;
        }, { passive: false });
    }

    bindEvents() {
        this.element.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        this.element.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        this.element.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
        this.element.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: false });
    }

    onTouchStart(e) {
        // Nur preventDefault bei Pinch (2 Finger), nicht bei normalem Scroll
        
        this.touches = Array.from(e.touches);
        this.fingerCount = this.touches.length;
        this.lastTouchTime = Date.now();
        
        // Cancel any reset animation
        if (this.resetTimeout) {
            clearTimeout(this.resetTimeout);
            this.resetTimeout = null;
        }
        this.isResetting = false;

        if (this.fingerCount === 2) {
            e.preventDefault();
            // Start pinch zoom
            this.isZooming = true;
            this.isPanning = false;
            this.initialDistance = this.getDistance(this.touches);
            this.lastDistance = this.initialDistance;
            this.initialScale = this.scale;
            this.lastScale = this.scale;
            this.initialMidpoint = this.getMidpoint(this.touches);
            this.lastMidpoint = this.initialMidpoint;
            
            // Reset velocity
            this.velocity = { x: 0, y: 0, scale: 0 };
        } else if (this.fingerCount === 1 && this.scale > 1.01) {
            e.preventDefault();
            // Start panning if zoomed
            this.isPanning = true;
            this.isZooming = false;
            this.lastMidpoint = {
                x: this.touches[0].clientX,
                y: this.touches[0].clientY
            };
        }
    }

    onTouchMove(e) {
        this.touches = Array.from(e.touches);
        const currentFingerCount = this.touches.length;

        if (currentFingerCount === 2 && this.isZooming) {
            e.preventDefault();
            this.handlePinchZoom();
        } else if (currentFingerCount === 1 && this.isPanning && this.scale > 1.01) {
            e.preventDefault();
            this.handlePan();
        }
    }

    onTouchEnd(e) {
        // Nur preventDefault wenn wir gerade zoomen/panning
        if (this.isZooming || this.isPanning) {
            e.preventDefault();
        }
        
        this.touches = Array.from(e.touches);
        const currentFingerCount = this.touches.length;

        // If no more fingers touching, schedule reset
        if (currentFingerCount === 0) {
            this.isZooming = false;
            this.isPanning = false;
            
            // AUTO RESET - Das ist der wichtige Teil!
            this.scheduleReset();
        } else if (currentFingerCount === 1 && this.fingerCount === 2) {
            // Switched from 2 fingers to 1
            this.isZooming = false;
            if (this.scale > 1.01) {
                this.isPanning = true;
                this.lastMidpoint = {
                    x: this.touches[0].clientX,
                    y: this.touches[0].clientY
                };
            }
        }

        this.fingerCount = currentFingerCount;
    }

    handlePinchZoom() {
        const currentDistance = this.getDistance(this.touches);
        const currentMidpoint = this.getMidpoint(this.touches);
        
        if (this.initialDistance === 0) return;

        // Calculate scale change
        const distanceChange = currentDistance / this.initialDistance;
        let newScale = this.initialScale * distanceChange;
        
        // Apply resistance at boundaries
        if (newScale > this.maxZoom) {
            const excess = newScale - this.maxZoom;
            newScale = this.maxZoom + excess * 0.1; // Rubber band effect
        } else if (newScale < this.minZoom) {
            const deficit = this.minZoom - newScale;
            newScale = this.minZoom - deficit * 0.3;
        }

        // Calculate zoom focal point
        const rect = this.element.getBoundingClientRect();
        const focal = {
            x: this.initialMidpoint.x - rect.left,
            y: this.initialMidpoint.y - rect.top
        };

        // Adjust position to zoom from focal point
        const scaleRatio = newScale / this.scale;
        let newX = focal.x - (focal.x - this.x) * scaleRatio;
        let newY = focal.y - (focal.y - this.y) * scaleRatio;

        // Calculate velocity for momentum
        this.velocity.scale = newScale - this.lastScale;
        
        // Update state
        this.targetScale = newScale;
        this.scale = newScale;
        this.targetX = newX;
        this.targetY = newY;
        this.x = newX;
        this.y = newY;

        this.lastScale = newScale;
        this.lastDistance = currentDistance;
        this.lastMidpoint = currentMidpoint;

        this.constrainBounds();
    }

    handlePan() {
        const currentTouch = this.touches[0];
        
        const dx = currentTouch.clientX - this.lastMidpoint.x;
        const dy = currentTouch.clientY - this.lastMidpoint.y;

        // Calculate velocity
        this.velocity.x = dx;
        this.velocity.y = dy;

        // Update position
        this.targetX += dx;
        this.targetY += dy;
        this.x = this.targetX;
        this.y = this.targetY;

        this.lastMidpoint = {
            x: currentTouch.clientX,
            y: currentTouch.clientY
        };

        this.constrainBounds();
    }

    constrainBounds() {
        const rect = this.element.getBoundingClientRect();
        const scaledWidth = rect.width * this.scale;
        const scaledHeight = rect.height * this.scale;

        // Calculate max pan distance
        const maxX = Math.max(0, (scaledWidth - window.innerWidth) / 2);
        const maxY = Math.max(0, (scaledHeight - window.innerHeight) / 2);

        // Constrain with rubber band at edges
        if (Math.abs(this.targetX) > maxX) {
            const excess = Math.abs(this.targetX) - maxX;
            const sign = this.targetX > 0 ? 1 : -1;
            this.targetX = sign * (maxX + excess * 0.3);
            this.x = this.targetX;
        }

        if (Math.abs(this.targetY) > maxY) {
            const excess = Math.abs(this.targetY) - maxY;
            const sign = this.targetY > 0 ? 1 : -1;
            this.targetY = sign * (maxY + excess * 0.3);
            this.y = this.targetY;
        }

        // If at min zoom, center content
        if (this.scale <= this.minZoom + 0.01) {
            this.targetX = 0;
            this.targetY = 0;
        }
    }

    scheduleReset() {
        // CRITICAL: Auto-reset after fingers released
        this.resetTimeout = setTimeout(() => {
            this.animateToReset();
        }, this.resetDelay);
    }

    animateToReset() {
        this.isResetting = true;
        
        const startScale = this.scale;
        const startX = this.x;
        const startY = this.y;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / this.animationDuration, 1);
            
            // Ease out cubic for smooth return
            const eased = 1 - Math.pow(1 - progress, 3);

            this.scale = startScale + (this.minZoom - startScale) * eased;
            this.x = startX + (0 - startX) * eased;
            this.y = startY + (0 - startY) * eased;
            
            this.targetScale = this.scale;
            this.targetX = this.x;
            this.targetY = this.y;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Ensure exact final values
                this.scale = this.minZoom;
                this.x = 0;
                this.y = 0;
                this.targetScale = this.minZoom;
                this.targetX = 0;
                this.targetY = 0;
                this.isResetting = false;
            }
        };

        animate();
    }

    startAnimationLoop() {
        const loop = () => {
            // Smooth interpolation when not actively zooming
            if (!this.isZooming && !this.isPanning && !this.isResetting) {
                const damping = 0.15;
                
                this.scale += (this.targetScale - this.scale) * damping;
                this.x += (this.targetX - this.x) * damping;
                this.y += (this.targetY - this.y) * damping;

                // Apply momentum decay
                this.velocity.x *= 0.92;
                this.velocity.y *= 0.92;
                this.velocity.scale *= 0.92;
            }

            this.render();
            this.animationFrame = requestAnimationFrame(loop);
        };

        loop();
    }

    render() {
        // Use transform for GPU acceleration
        const transform = `translate3d(${this.x}px, ${this.y}px, 0) scale(${this.scale})`;
        this.element.style.transform = transform;
    }

    getDistance(touches) {
        if (touches.length < 2) return 0;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getMidpoint(touches) {
        if (touches.length < 2) {
            return { x: touches[0].clientX, y: touches[0].clientY };
        }
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    reset() {
        if (this.resetTimeout) {
            clearTimeout(this.resetTimeout);
        }
        this.animateToReset();
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.resetTimeout) {
            clearTimeout(this.resetTimeout);
        }
        this.element.style.transform = '';
        this.element.style.transformOrigin = '';
        this.element.style.willChange = '';
        this.element.style.touchAction = '';
    }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                     || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    
    if (isMobile) {
        window.pinchZoom = new PinchZoom({
            element: document.body,
            minZoom: 1,
            maxZoom: 4,
            resetDelay: 200,        // Wait 200ms after finger release
            animationDuration: 300   // Smooth 300ms reset animation
        });
    }
});

if (typeof window !== 'undefined') {
    window.PinchZoom = PinchZoom;
}