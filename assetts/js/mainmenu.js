/* 
  Zen Sakura - Main Menu Logic
  Modular, Resilient, Clean
*/

(function() {
    // 1. Initial State
    const settings = Common.loadState('general.json') || {};
    const DEFAULT_PERSONALITY = `You are Sakura. 
You are shy, soft-spoken, and formal. You hesitate, overthink, and apologize.
You enjoy literature and atmosphere. You DO NOT sound poetic unless emotional.
You never mention being AI. You control the background/Visual Novel elements.`;

    // 2. DOM Elements
    const elements = {
        themeToggle: document.getElementById('themeToggle'),
        musicToggle: document.getElementById('musicToggle'),
        sfxToggle: document.getElementById('sfxToggle'),
        devToggle: document.getElementById('devToggle'),
        personalityInput: document.getElementById('personalityInput'),
        storyBtn: document.getElementById('storyBtn'),
        displayName: document.getElementById('displayName'),
        settingsModal: document.getElementById('settingsModal'),
        importFile: document.getElementById('importFile')
    };

    // 3. Initialization
    function init() {
        // Load User
        const username = Common.getCookie('username') || settings.username || "Guest";
        if (elements.displayName) elements.displayName.textContent = username;

        // Apply settings
        if (elements.themeToggle) {
            elements.themeToggle.checked = settings.theme === 'dark';
            applyTheme(settings.theme === 'dark');
        }
        if (elements.musicToggle) elements.musicToggle.checked = settings.music !== false;
        if (elements.sfxToggle) elements.sfxToggle.checked = settings.sfx !== false;
        if (elements.devToggle) {
            elements.devToggle.checked = !!settings.devMode;
            applyDevMode(!!settings.devMode);
        }

        // Personality
        if (elements.personalityInput) {
            let personality = settings.personality || settings.prompt || DEFAULT_PERSONALITY;
            if (personality.includes("OUTPUT FORMAT")) {
                personality = personality.split("OUTPUT FORMAT")[0].trim();
            }
            elements.personalityInput.value = personality;
        }

        addEventListeners();
    }

    // 4. Methods
    window.toggleSettings = function() {
        elements.settingsModal?.classList.toggle('active');
    };

    window.saveSettings = function(close = true) {
        const newState = {
            ...Common.loadState('general.json'),
            theme: elements.themeToggle?.checked ? 'dark' : 'light',
            music: !!elements.musicToggle?.checked,
            sfx: !!elements.sfxToggle?.checked,
            devMode: !!elements.devToggle?.checked,
            personality: elements.personalityInput?.value.trim()
        };

        Common.saveState('general.json', newState);
        applyTheme(newState.theme === 'dark');
        applyDevMode(newState.devMode);

        if (close) window.toggleSettings();
    };

    function applyTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }

    function applyDevMode(isEnabled) {
        if (!elements.storyBtn) return;
        elements.storyBtn.disabled = !isEnabled;
        elements.storyBtn.onclick = isEnabled ? () => window.location.href = 'desktopui.html' : null;
    }

    window.startQuickMode = function() {
        window.location.href = 'loading.html?target=quickmode';
    };

    // Data Management
    window.exportData = async function() {
        if (typeof JSZip === 'undefined') {
            alert("JSZip not loaded!");
            return;
        }
        const zip = new JSZip();
        let count = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('delta_os_')) {
                zip.file(key, localStorage.getItem(key));
                count++;
            }
        }
        
        const creds = {
            username: Common.getCookie('username'),
            key: Common.getCookie('key')
        };
        zip.file('credentials.json', JSON.stringify(creds));

        if (count === 0) {
            alert("No memory data to export!");
            return;
        }

        const blob = await zip.generateAsync({type:"blob"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sakura-backup-${new Date().toISOString().slice(0,10)}.zip`;
        a.click();
    };

    window.triggerImport = function() {
        elements.importFile?.click();
    };

    window.importData = async function(input) {
        const file = input.files[0];
        if (!file) return;

        try {
            const zip = await JSZip.loadAsync(file);
            let imported = 0;

            for (const filename of Object.keys(zip.files)) {
                const content = await zip.file(filename).async("string");
                
                if (filename === 'credentials.json') {
                    try {
                        const creds = JSON.parse(content);
                        if(creds.username) Common.setCookie('username', creds.username, 30);
                        if(creds.key) Common.setCookie('key', creds.key, 30);
                    } catch(e) {}
                } else if (filename.startsWith('delta_os_')) {
                    localStorage.setItem(filename, content);
                    imported++;
                }
            }
            
            alert(`Imported ${imported} files successfully!`);
            window.location.reload(); 
        } catch (e) {
            alert("Import failed: " + e.message);
        }
    };

    function addEventListeners() {
        // Theme real-time preview
        elements.themeToggle?.addEventListener('change', (e) => applyTheme(e.target.checked));
    }

    // Go!
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
