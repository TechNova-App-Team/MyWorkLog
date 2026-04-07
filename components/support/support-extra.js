(function() {
            /* ── init geo lines ── */
            var geoContainer = document.getElementById('sp-geo-container');
            if (geoContainer) {
                for (var i = 0; i < 6; i++) {
                    var line = document.createElement('div');
                    line.className = 'sp-geo-line';
                    var top = 5 + Math.random() * 88;
                    var w   = 180 + Math.random() * 420;
                    var dur = 9 + Math.random() * 14;
                    var del = -(Math.random() * dur);
                    line.style.cssText = 'top:' + top + '%;width:' + w + 'px;animation-duration:' + dur + 's;animation-delay:' + del + 's';
                    geoContainer.appendChild(line);
                }
            }

            /* ── scroll parallax bound to .main container ── */
            var mainScroll = document.querySelector('.main');
            var blob1 = document.getElementById('sp-blob1');
            var blob2 = document.getElementById('sp-blob2');
            var blob3 = document.getElementById('sp-blob3');
            var grid  = document.getElementById('sp-grid');

            function onSupportScroll() {
                var viewEl = document.getElementById('view-support');
                if (!viewEl || !viewEl.classList.contains('active')) return;
                var y = mainScroll ? mainScroll.scrollTop : 0;
                if (blob1) blob1.style.transform = 'translateY(' + (y * .13) + 'px)';
                if (blob2) blob2.style.transform = 'translateY(' + (-y * .09) + 'px)';
                if (blob3) blob3.style.transform = 'translateY(' + (y * .06) + 'px)';
                if (grid)  grid.style.transform  = 'translateY(' + (y * .035) + 'px)';
            }

            if (mainScroll) {
                mainScroll.addEventListener('scroll', onSupportScroll, { passive: true });
            }

            /* ── scroll reveal via IntersectionObserver ── */
            var srObserver = new IntersectionObserver(function(entries) {
                entries.forEach(function(e) {
                    if (e.isIntersecting) {
                        e.target.classList.add('sp-visible');
                        srObserver.unobserve(e.target);
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

            /* observe when tab becomes active */
            function observeSupportItems() {
                document.querySelectorAll('#view-support .sp-sr').forEach(function(el) {
                    srObserver.observe(el);
                });
            }

            /* watch for tab activation via MutationObserver */
            var viewSupport = document.getElementById('view-support');
            if (viewSupport) {
                new MutationObserver(function(muts) {
                    muts.forEach(function(m) {
                        if (m.type === 'attributes' && m.attributeName === 'class') {
                            if (viewSupport.classList.contains('active')) {
                                setTimeout(observeSupportItems, 80);
                            }
                        }
                    });
                }).observe(viewSupport, { attributes: true });

                /* also check if already active on load */
                if (viewSupport.classList.contains('active')) {
                    setTimeout(observeSupportItems, 80);
                }
            }
        })();