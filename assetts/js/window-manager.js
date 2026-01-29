

class WindowManager {
    constructor(containerId, taskbarId) {
        this.container = document.getElementById(containerId) || document.body;
        this.taskbar = document.getElementById(taskbarId);
        this.windows = [];
        this.zIndexCounter = 100;
        this.activeWindow = null;
    }

    open(appId, title, contentFunc, options = {}) {
        const id = `win_${Date.now()}`;
        
        // Responsive Defaults
        const isMobile = window.innerWidth < 768;
        const defaultW = isMobile ? window.innerWidth * 0.9 : 600;
        const defaultH = isMobile ? window.innerHeight * 0.6 : 400;
        
        let tx = options.x;
        if (tx === undefined) {
             tx = isMobile ? (window.innerWidth - defaultW) / 2 : 100 + (this.windows.length * 30);
        }
        let ty = options.y;
        if (ty === undefined) {
             ty = 50 + (this.windows.length * 30);
        }

        // Window Structure
        const winConfig = {
            id: id,
            title: title || "Application",
            x: tx,
            y: ty,
            width: options.width || defaultW,
            height: options.height || defaultH,
            minimized: false,
            maximized: false,
            preRect: null 
        };

        const winEl = document.createElement('div');
        winEl.className = 'window glass-panel';
        winEl.id = id;
        winEl.style.position = 'absolute';
        winEl.style.left = winConfig.x + 'px';
        winEl.style.top = winConfig.y + 'px';
        winEl.style.width = winConfig.width + 'px';
        winEl.style.height = winConfig.height + 'px';
        winEl.style.zIndex = ++this.zIndexCounter;
        winEl.style.display = 'flex';
        winEl.style.flexDirection = 'column';
        winEl.style.padding = '0'; 
        winEl.style.overflow = 'hidden';

        // Title Bar
        const titleBar = document.createElement('div');
        titleBar.className = 'window-titlebar';
        titleBar.innerHTML = `
            <div class="window-title">${winConfig.title}</div>
            <div class="window-controls">
                <button class="win-btn min" title="Minimize"></button>
                <button class="win-btn max" title="Maximize"></button>
                <button class="win-btn close" title="Close"></button>
            </div>
        `;
        
        // Content Area
        const contentArea = document.createElement('div');
        contentArea.className = 'window-content';
        contentArea.style.flex = '1';
        contentArea.style.overflow = 'auto';
        contentArea.style.padding = '10px';
        if (typeof contentFunc === 'function') {
            contentArea.appendChild(contentFunc(id));
        } else if (typeof contentFunc === 'string') {
            contentArea.innerHTML = contentFunc;
        }

        winEl.appendChild(titleBar);
        winEl.appendChild(contentArea);
        this.container.appendChild(winEl);

        this.windows.push(winConfig);
        
        // Taskbar Item
        this._addTaskbarItem(id, winConfig.title);

        // Event Listeners
        this._setupDrag(winEl, titleBar);
        this._setupControls(winEl, id);
        
        // Focus on click
        winEl.addEventListener('mousedown', () => this.focus(id));
        
        this.focus(id);
        return id;
    }

    focus(id) {
        const winEl = document.getElementById(id);
        if (winEl) {
            if (winEl.style.display === 'none') {
                winEl.style.display = 'flex'; // Restore if minimized
            }
            winEl.style.zIndex = ++this.zIndexCounter;
            this.activeWindow = id;
            
            document.querySelectorAll('.window').forEach(w => w.classList.remove('active'));
            winEl.classList.add('active');

            // Highlight Taskbar
            if (this.taskbar) {
                Array.from(this.taskbar.children).forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.winId === id);
                });
            }
        }
    }

    close(id) {
        const winEl = document.getElementById(id);
        if (winEl) {
            winEl.classList.add('closing');
            setTimeout(() => winEl.remove(), 200);
            this.windows = this.windows.filter(w => w.id !== id);
            
            if (this.taskbar) {
                const btn = this.taskbar.querySelector(`[data-win-id="${id}"]`);
                if (btn) btn.remove();
            }
        }
    }

    closeAll() {
        this.windows.forEach(w => {
            const el = document.getElementById(w.id);
            if (el) el.remove();
        });
        this.windows = [];
        const taskbarApps = document.getElementById('taskbar-apps');
        if (taskbarApps) taskbarApps.innerHTML = ''; 
    }

    minimize(id) {
        const winEl = document.getElementById(id);
        if (winEl) {
            winEl.style.display = 'none';
            // Deactivate taskbar
            if (this.taskbar) {
               const btn = this.taskbar.querySelector(`[data-win-id="${id}"]`);
               if(btn) btn.classList.remove('active');
            }
        }
    }

    maximize(id) {
        const winEl = document.getElementById(id);
        const winData = this.windows.find(w => w.id === id);
        if (!winEl || !winData) return;

        if (!winData.maximized) {
            // Store prev state
            winData.preRect = {
                left: winEl.style.left,
                top: winEl.style.top,
                width: winEl.style.width,
                height: winEl.style.height
            };
            // Maximize to Safe Area (Floating Dock Style)
            winEl.style.left = '10px';
            winEl.style.top = '10px';
            winEl.style.width = 'calc(100vw - 20px)';
            winEl.style.height = 'calc(100vh - 95px)'; // Reserve space for dock
            winEl.style.borderRadius = '15px'; 
            winData.maximized = true;
        } else {
            // Restore
            if (winData.preRect) {
                winEl.style.left = winData.preRect.left;
                winEl.style.top = winData.preRect.top;
                winEl.style.width = winData.preRect.width;
                winEl.style.height = winData.preRect.height;
                winEl.style.borderRadius = ''; 
            }
            winData.maximized = false;
        }
    }

    _addTaskbarItem(id, title) {
        if (!this.taskbar) return;
        const btn = document.createElement('div');
        btn.className = 'task-item';
        btn.innerHTML = `<span>${title}</span>`; // Icon support later
        btn.dataset.winId = id;
        btn.onclick = () => {
            if (this.activeWindow === id && document.getElementById(id).style.display !== 'none') {
                this.minimize(id);
            } else {
                this.focus(id);
            }
        };
        this.taskbar.appendChild(btn);
    }

    _setupDrag(winEl, titleBar) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const startDrag = (e) => {
            if (e.target.closest('button')) return; 
            isDragging = true;
            
            // Handle touch or mouse
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

            startX = clientX;
            startY = clientY;
            initialLeft = winEl.offsetLeft;
            initialTop = winEl.offsetTop;
            this.focus(winEl.id);
        };

        const onDrag = (e) => {
            if (!isDragging) return;
            e.preventDefault(); // Stop scrolling on touch
            
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;
            
            winEl.style.left = (initialLeft + dx) + 'px';
            winEl.style.top = (initialTop + dy) + 'px';
        };

        const stopDrag = () => { isDragging = false; };

        // Mouse Events
        titleBar.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);

        // Touch Events
        titleBar.addEventListener('touchstart', startDrag, {passive: false});
        document.addEventListener('touchmove', onDrag, {passive: false});
        document.addEventListener('touchend', stopDrag);
    }

    _setupControls(winEl, id) {
        winEl.querySelector('.close').addEventListener('click', (e) => { e.stopPropagation(); this.close(id); });
        winEl.querySelector('.min').addEventListener('click', (e) => { e.stopPropagation(); this.minimize(id); });
        winEl.querySelector('.max').addEventListener('click', (e) => { e.stopPropagation(); this.maximize(id); });
    }
}
