// ═══ CORE: EMOJI-PICKER MODULE ═══
// Vanilla popover emoji picker. Kategorisiert + suchbar.
// Usage:
//   openEmojiPicker(triggerEl, (emoji) => { ... })
// Schließt sich bei Klick außerhalb oder ESC.

    const EMOJI_CATEGORIES = [
        {
            id: 'work',
            label: 'Arbeit',
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
            emojis: ['💼','💻','🖥️','⌨️','🖱️','📱','📞','☎️','📠','📧','📨','📩','📋','📋','📌','📎','✏️','✒️','📝','📊','📈','📉','📅','📆','🗓️','⏰','⏱️','⏲️','🕐','🗂️','📁','📂','🗄️','🗃️','📔','📓','📒','📕','📗','📘','📙','📚','🔖','🏷️']
        },
        {
            id: 'activity',
            label: 'Aktivität',
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
            emojis: ['🏋️','🤸','🤾','🤺','🏃','🚶','🧘','🧗','🏊','🚴','🏇','⛹️','🤽','🛹','⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🥋','⛳','⛸️','🎿','🏂','🏄','🎯','🎮','🎲','🎰','🎳','🎤','🎧','🎼','🎹','🎸','🥁']
        },
        {
            id: 'food',
            label: 'Essen',
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
            emojis: ['☕','🍵','🥤','🧃','🧉','🍷','🍺','🍻','🥂','🍸','🍹','🍶','🍾','🥃','🥛','🍼','🍽️','🍴','🥄','🔪','🍕','🍔','🍟','🌭','🥪','🌮','🌯','🥙','🍝','🍜','🍲','🍛','🍱','🍣','🍤','🥟','🍞','🥐','🥖','🥨','🧀','🥗','🍩','🍪','🍰','🎂','🍫','🍬','🍭','🍿','🍎','🍌','🍇','🍊']
        },
        {
            id: 'travel',
            label: 'Reise',
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 4.4 8 12 8 12s8-7.6 8-12a8 8 0 0 0-8-8z"/></svg>',
            emojis: ['✈️','🛫','🛬','🚀','🛸','🚁','🛶','⛵','🚤','🛳️','⛴️','🚢','🚂','🚃','🚄','🚅','🚆','🚇','🚊','🚝','🚞','🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🚕','🚖','🚗','🚙','🚚','🚛','🚜','🏎️','🏍️','🛴','🚲','🏖️','🏝️','🏜️','🏔️','⛰️','🗻','🏕️','🏠','🏡','🏢','🏣','🏥','🏦','🏨','🏪','🏫','🏬','🏭','🏯','🏰']
        },
        {
            id: 'symbols',
            label: 'Symbole',
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
            emojis: ['✅','❌','⚠️','🚫','⛔','📛','🔰','💯','✔️','☑️','❎','🆗','🆕','🆙','🆒','🆓','🆖','🆘','♻️','✨','⭐','🌟','💫','⚡','🔥','💥','💢','💨','💧','💦','🎯','🎪','🎨','🎭','🎬','🎁','🎉','🎊','🎈','🏆','🏅','🥇','🥈','🥉','🎖️','💎','💰','💵','💴','💶','💷','🏦','💳','🧾','📊','📈','📉','🔍','🔎','🔑','🗝️','🔒','🔓','🛡️']
        },
        {
            id: 'smileys',
            label: 'Smileys',
            iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
            emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖']
        }
    ];

    function openEmojiPicker(triggerEl, onPick) {
        // Existierenden Picker schließen.
        const existing = document.getElementById('emojiPickerPopover');
        if (existing) {
            existing.remove();
            if (existing.dataset.trigger === triggerEl.id) return; // Toggle off
        }

        if (!document.getElementById('emojiPickerStyle')) {
            const style = document.createElement('style');
            style.id = 'emojiPickerStyle';
            style.textContent = `
                #emojiPickerPopover {
                    position: fixed;
                    z-index: 10000;
                    width: 320px;
                    max-width: calc(100vw - 24px);
                    background: #14141a;
                    border: 1px solid rgba(255,255,255,0.10);
                    border-radius: 14px;
                    box-shadow: 0 20px 48px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.3);
                    overflow: hidden;
                    opacity: 0;
                    transform: translateY(-4px) scale(0.98);
                    transition: opacity 0.16s ease, transform 0.16s ease;
                    font-family: var(--font-main);
                }
                #emojiPickerPopover.ep-visible { opacity: 1; transform: translateY(0) scale(1); }

                .ep-search-wrap {
                    padding: 10px 12px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                }
                .ep-search {
                    width: 100%;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 8px;
                    padding: 8px 12px;
                    color: var(--text-main);
                    font-size: 0.82rem;
                    font-family: inherit;
                    outline: none;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }
                .ep-search:focus {
                    border-color: rgba(var(--primary-rgb), 0.5);
                    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.15);
                }
                .ep-search::placeholder { color: rgba(255,255,255,0.3); }

                .ep-tabs {
                    display: flex;
                    gap: 2px;
                    padding: 6px 8px;
                    border-bottom: 1px solid rgba(255,255,255,0.06);
                    overflow-x: auto;
                    scrollbar-width: none;
                }
                .ep-tabs::-webkit-scrollbar { display: none; }
                .ep-tab {
                    flex-shrink: 0;
                    width: 36px;
                    height: 32px;
                    border: none;
                    background: transparent;
                    color: var(--text-muted);
                    border-radius: 7px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.15s ease, color 0.15s ease;
                }
                .ep-tab svg { width: 16px; height: 16px; }
                .ep-tab:hover { background: rgba(255,255,255,0.04); color: var(--text-main); }
                .ep-tab.ep-tab-active {
                    background: rgba(var(--primary-rgb), 0.14);
                    color: var(--primary);
                }

                .ep-grid {
                    display: grid;
                    grid-template-columns: repeat(8, 1fr);
                    gap: 2px;
                    padding: 8px;
                    max-height: 240px;
                    overflow-y: auto;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255,255,255,0.1) transparent;
                }
                .ep-grid::-webkit-scrollbar { width: 6px; }
                .ep-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

                .ep-emoji {
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 1.3rem;
                    padding: 4px;
                    border-radius: 6px;
                    transition: background 0.12s ease, transform 0.12s ease;
                    line-height: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 32px;
                }
                .ep-emoji:hover {
                    background: rgba(255,255,255,0.08);
                    transform: scale(1.15);
                }

                .ep-empty {
                    grid-column: 1 / -1;
                    padding: 24px 12px;
                    text-align: center;
                    font-size: 0.78rem;
                    color: var(--text-muted);
                }
            `;
            document.head.appendChild(style);
        }

        const popover = document.createElement('div');
        popover.id = 'emojiPickerPopover';
        popover.dataset.trigger = triggerEl.id || '';
        popover.innerHTML = `
            <div class="ep-search-wrap">
                <input type="text" class="ep-search" placeholder="Suchen…" autocomplete="off" spellcheck="false">
            </div>
            <div class="ep-tabs"></div>
            <div class="ep-grid"></div>
        `;
        document.body.appendChild(popover);

        const tabsEl = popover.querySelector('.ep-tabs');
        const gridEl = popover.querySelector('.ep-grid');
        const searchEl = popover.querySelector('.ep-search');
        let activeCat = EMOJI_CATEGORIES[0].id;

        function renderTabs() {
            tabsEl.innerHTML = '';
            EMOJI_CATEGORIES.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'ep-tab' + (cat.id === activeCat ? ' ep-tab-active' : '');
                btn.title = cat.label;
                btn.innerHTML = cat.iconSvg;
                btn.onclick = () => {
                    activeCat = cat.id;
                    searchEl.value = '';
                    renderTabs();
                    renderGrid();
                };
                tabsEl.appendChild(btn);
            });
        }

        function renderGrid(filter = '') {
            const f = filter.trim().toLowerCase();
            let pool;
            if (f) {
                // Suche: pack alles in einen Pool, dedupliziert.
                pool = [...new Set(EMOJI_CATEGORIES.flatMap(c => c.emojis))];
            } else {
                const cat = EMOJI_CATEGORIES.find(c => c.id === activeCat);
                pool = cat ? cat.emojis : [];
            }
            gridEl.innerHTML = '';
            if (!pool.length) {
                gridEl.innerHTML = '<div class="ep-empty">Keine Emojis</div>';
                return;
            }
            pool.forEach(em => {
                const b = document.createElement('button');
                b.className = 'ep-emoji';
                b.type = 'button';
                b.textContent = em;
                b.onclick = (e) => {
                    e.stopPropagation();
                    if (typeof onPick === 'function') onPick(em);
                    closePicker();
                };
                gridEl.appendChild(b);
            });
        }

        function position() {
            const r = triggerEl.getBoundingClientRect();
            const pw = popover.offsetWidth;
            const ph = popover.offsetHeight;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            let top = r.bottom + 6;
            let left = r.left;
            if (left + pw > vw - 8) left = Math.max(8, vw - pw - 8);
            if (top + ph > vh - 8) top = Math.max(8, r.top - ph - 6);
            popover.style.top = top + 'px';
            popover.style.left = left + 'px';
        }

        renderTabs();
        renderGrid();
        position();

        requestAnimationFrame(() => popover.classList.add('ep-visible'));

        searchEl.addEventListener('input', (e) => renderGrid(e.target.value));

        function closePicker() {
            popover.style.opacity = '0';
            popover.style.transform = 'translateY(-4px) scale(0.98)';
            setTimeout(() => popover.remove(), 160);
            document.removeEventListener('mousedown', outsideClick, true);
            document.removeEventListener('keydown', escClose, true);
            window.removeEventListener('resize', position);
            window.removeEventListener('scroll', position, true);
        }
        function outsideClick(e) {
            if (popover.contains(e.target) || triggerEl.contains(e.target)) return;
            closePicker();
        }
        function escClose(e) {
            if (e.key === 'Escape') { e.stopPropagation(); closePicker(); }
        }
        setTimeout(() => {
            document.addEventListener('mousedown', outsideClick, true);
            document.addEventListener('keydown', escClose, true);
            window.addEventListener('resize', position);
            window.addEventListener('scroll', position, true);
        }, 0);
    }
