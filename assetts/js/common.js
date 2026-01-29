const STORAGE_PREFIX = "delta_os_";

const Common = {
  // --- Cookie Helpers (For Credentials) ---
  setCookie: (name, value, days) => {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  },

  getCookie: (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  },

  // --- JSON File Storage Helpers (For Persistent Memory) ---
  // files: history.json, mood.json, bg.json, general.json
  saveState: (filename, data) => {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(STORAGE_PREFIX + filename, json);

      // Sync 'general.json' to Cookie as requested
      if (filename === "general.json") {
        Common.setCookie("delta_settings", json, 365); // 1 year persistence
      }
    } catch (e) {
      console.error("Storage Full or Disabled", e);
    }
  },

  loadState: (filename) => {
    const item = localStorage.getItem(STORAGE_PREFIX + filename);
    return item ? JSON.parse(item) : null;
  },

  // Initialize default files if missing
  initStorage: () => {
    // Try to restore general settings from cookie if LS is empty
    const cookieSettings = Common.getCookie("delta_settings");
    if (
      cookieSettings &&
      !localStorage.getItem(STORAGE_PREFIX + "general.json")
    ) {
      try {
        localStorage.setItem(STORAGE_PREFIX + "general.json", cookieSettings);
      } catch (e) {}
    }

    const now = Date.now(); // Timestamp for correct localization
    const defaults = {
      "history.json": { logs: [], commands: [], createdAt: now },
      "mood.json": { current: "neutral", createdAt: now },
      "bg.json": { current: "default", custom_url: "", createdAt: now },
      "general.json": {
        theme: "light",
        sfx: true,
        music: true,
        prompt: "",
        createdAt: now,
      },
      "log1.json": { createdAt: now },
    };

    for (const [file, defaultData] of Object.entries(defaults)) {
      const currentData = Common.loadState(file);
      if (!currentData) {
        // Create new
        Common.saveState(file, defaultData);
      } else {
        // Backfill createdAt if missing
        if (!currentData.createdAt) {
          currentData.createdAt = now;
          Common.saveState(file, currentData);
        }
      }
    }
  },

  // --- Legacy Wrapper (Deprecated but kept for compat if needed) ---
  saveData: (key, data) => Common.saveState(key + ".json", data), // Map old calls to JSONs
  loadData: (key) => Common.loadState(key + ".json"),

  // --- Theme ---
  initTheme: () => {
    const gen = Common.loadState("general.json");
    if (gen && gen.theme) {
      document.documentElement.setAttribute("data-theme", gen.theme);
    }
  },
};

// --- CLICK ANIMATION ---
window.addEventListener('click', (e) => {
    const sparkle = document.createElement('div');
    sparkle.style.position = 'fixed';
    sparkle.style.left = (e.clientX - 10) + 'px'; // Center roughly
    sparkle.style.top = (e.clientY - 10) + 'px';
    sparkle.style.width = '20px';
    sparkle.style.height = '20px';
    sparkle.style.background = "url('assetts/images/sparkle.png') no-repeat center/contain";
    sparkle.style.pointerEvents = 'none';
    sparkle.style.zIndex = '99999';
    sparkle.style.animation = 'sparkleAnim 0.5s ease-out forwards';
    
    document.body.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 500);
});

// Add keyframes for sparkle if not in CSS
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes sparkleAnim {
    0% { transform: scale(0) rotate(0deg); opacity: 1; }
    50% { transform: scale(1.2) rotate(45deg); opacity: 1; }
    100% { transform: scale(0) rotate(90deg); opacity: 0; }
}
`;
document.head.appendChild(styleSheet);

// --- UI Helpers (Replaces alert/confirm) ---
const UI = {
  toast: (msg, duration = 3000) => {
    let toast = document.getElementById("ui-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "ui-toast";
      toast.className = "toast";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>✨</span> ${msg}`;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), duration);
  },

  confirm: (msg, onConfirm, onCancel) => {
    let modal = document.getElementById("ui-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "ui-modal";
      modal.style =
        "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); backdrop-filter:blur(5px); z-index:10000; display:none; align-items:center; justify-content:center; padding:20px;";
      modal.innerHTML = `
                <div class="glass-panel" style="max-width:400px; width:100%; padding:30px; text-align:center; background:var(--glass-bg); border:3px solid var(--border-color); border-radius:30px; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                    <h3 style="margin-top:0; color:var(--text-color); font-family:'Comic Sans MS', cursive;">Delta BIOS</h3>
                    <p id="ui-modal-msg" style="font-size:1.1rem; color:var(--text-color); margin:20px 0;"></p>
                    <div style="display:flex; gap:15px;">
                        <button id="ui-modal-yes" class="btn" style="flex:1">Yes</button>
                        <button id="ui-modal-no" class="btn btn-secondary" style="flex:1">No</button>
                    </div>
                </div>
            `;
      document.body.appendChild(modal);
    }

    const msgEl = document.getElementById("ui-modal-msg");
    msgEl.innerText = msg;
    modal.style.display = "flex";

    document.getElementById("ui-modal-yes").onclick = () => {
      modal.style.display = "none";
      if (onConfirm) onConfirm();
    };
    document.getElementById("ui-modal-no").onclick = () => {
      modal.style.display = "none";
      if (onCancel) onCancel();
    };
  },

  alert: (msg) => UI.toast(msg, 4000), // Simple alert becomes a toast

  prompt: (msg, defaultValue, onConfirm) => {
    let modal = document.getElementById("ui-prompt-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "ui-prompt-modal";
      modal.style =
        "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); backdrop-filter:blur(5px); z-index:10001; display:none; align-items:center; justify-content:center; padding:20px;";
      modal.innerHTML = `
                <div class="glass-panel" style="max-width:400px; width:100%; padding:30px; text-align:center; background:var(--glass-bg); border:3px solid var(--border-color); border-radius:30px; box-shadow:0 10px 40px rgba(0,0,0,0.3);">
                    <h3 style="margin-top:0; color:var(--text-color); font-family:'Comic Sans MS', cursive;">Delta BIOS</h3>
                    <p id="ui-prompt-msg" style="margin-bottom:15px; color:var(--text-color); font-weight:bold;"></p>
                    <input type="text" id="ui-prompt-input" style="width:100%; margin-bottom:20px; font-family:inherit;">
                    <div style="display:flex; gap:10px;">
                        <button id="ui-prompt-ok" class="btn" style="flex:1">OK</button>
                        <button id="ui-prompt-cancel" class="btn btn-secondary" style="flex:1">Cancel</button>
                    </div>
                </div>
            `;
      document.body.appendChild(modal);
    }
    document.getElementById("ui-prompt-msg").innerText = msg;
    const input = document.getElementById("ui-prompt-input");
    input.value = defaultValue || "";
    modal.style.display = "flex";
    input.focus();

    const close = () => {
      modal.style.display = "none";
    };
    document.getElementById("ui-prompt-ok").onclick = () => {
      close();
      if (onConfirm) onConfirm(input.value);
    };
    document.getElementById("ui-prompt-cancel").onclick = close;
    input.onkeydown = (e) => {
      if (e.key === "Enter") document.getElementById("ui-prompt-ok").click();
      if (e.key === "Escape") close();
    };
  },
};

// Auto-run init
Common.initStorage();
Common.initTheme();
