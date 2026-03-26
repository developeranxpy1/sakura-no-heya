(function initTheme() {
    const state = Common.loadState("general.json") || {};
    if (state.theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
    }
})();

const TARGETS = {
    mainmenu: {
        page: "mainmenu.html",
        destination: "Main menu",
        eyebrow: "Sakura startup sequence",
        hero: "Setting the room for {name}",
        copy: "Preparing the menu shell and waiting for every required startup asset to finish loading.",
        resources: [
            { url: "mainmenu.html", type: "text", label: "Main menu shell" },
            { url: "assetts/css/style.css", type: "text", label: "Shared styles" },
            { url: "assetts/js/common.js", type: "text", label: "Common logic" },
            { url: "assetts/images/sakuralogo.png", type: "image", label: "Sakura logo" },
            { url: "assetts/images/bg-pattern.png", type: "image", label: "Light background" },
            { url: "assetts/images/dark-bg-pattern.png", type: "image", label: "Dark background" },
            { url: "assetts/video/bgvideo.mp4", type: "binary", label: "Menu ambience", optional: true, nonEmpty: true }
        ]
    },
    quickmode: {
        page: "quickmode.html",
        destination: "Quick chat",
        eyebrow: "Sakura conversation loader",
        hero: "Opening quick chat for {name}",
        copy: "Preparing the quick chat shell before the in-scene loader restores the current room and character state.",
        resources: [
            { url: "quickmode.html", type: "text", label: "Quick chat shell" },
            { url: "assetts/css/style.css", type: "text", label: "Shared styles" },
            { url: "assetts/js/common.js", type: "text", label: "Common logic" },
            { url: "assetts/manifest.json", type: "json", label: "Scene manifest" },
            { url: "assetts/images/sakuralogo.png", type: "image", label: "Sakura logo" },
            { url: "assetts/images/bg-pattern.png", type: "image", label: "Light background" },
            { url: "assetts/images/dark-bg-pattern.png", type: "image", label: "Dark background" }
        ]
    }
};

const params = new URLSearchParams(window.location.search);
const selectedTarget = TARGETS[params.get("target")] || TARGETS.mainmenu;
const generalState = Common.loadState("general.json") || {};
const username = Common.getCookie("username") || generalState.username || "you";

const loadingShell = document.getElementById("loadingShell");
const displayName = document.getElementById("displayName");
const heroLead = document.getElementById("heroLead");
const loaderEyebrow = document.getElementById("loaderEyebrow");
const heroCopy = document.getElementById("heroCopy");
const themeLabel = document.getElementById("themeLabel");
const destinationLabel = document.getElementById("destinationLabel");
const assetCountLabel = document.getElementById("assetCountLabel");
const phaseChip = document.getElementById("phaseChip");
const elapsedTime = document.getElementById("elapsedTime");
const statusText = document.getElementById("statusText");
const statusNote = document.getElementById("statusNote");
const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const safetyLink = document.getElementById("safetyLink");
const milestoneEls = Array.from(document.querySelectorAll(".milestone"));
const petalField = document.getElementById("petalField");

let redirecting = false;

displayName.textContent = username;
heroLead.textContent = selectedTarget.hero.replace("{name}", "").trim();
loaderEyebrow.textContent = selectedTarget.eyebrow;
heroCopy.textContent = selectedTarget.copy;
destinationLabel.textContent = selectedTarget.destination;
themeLabel.textContent = document.documentElement.getAttribute("data-theme") === "dark" ? "Moonlight" : "Petal Bloom";
safetyLink.href = selectedTarget.page;

function setProgress(percent) {
    const clamped = Math.max(0, Math.min(100, percent));
    progressFill.style.width = clamped + "%";
    progressPercent.textContent = Math.round(clamped) + "%";

    let activeIndex = 0;
    if (clamped >= 100) {
        activeIndex = 3;
    } else if (clamped >= 65) {
        activeIndex = 2;
    } else if (clamped >= 20) {
        activeIndex = 1;
    }

    milestoneEls.forEach((milestone, index) => {
        const stateEl = milestone.querySelector(".milestone-state");
        milestone.classList.remove("active", "done");

        if (clamped >= 100 || index < activeIndex) {
            milestone.classList.add("done");
            stateEl.textContent = "Done";
        } else if (index === activeIndex) {
            milestone.classList.add("active");
            stateEl.textContent = "Active";
        } else {
            stateEl.textContent = "Queued";
        }
    });
}

function setPhase(text, note) {
    statusText.textContent = text;
    statusNote.textContent = note;
}

async function loadText(url) {
    const response = await fetch(url, { cache: "default" });
    if (!response.ok) {
        throw new Error(response.status + " " + response.statusText);
    }
    return response.text();
}

async function loadJson(url) {
    const response = await fetch(url, { cache: "default" });
    if (!response.ok) {
        throw new Error(response.status + " " + response.statusText);
    }
    return response.json();
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(url);
        image.onerror = () => reject(new Error("image failed"));
        image.src = url;
    });
}

async function loadBinary(url, nonEmpty) {
    const response = await fetch(url, { cache: "default" });
    if (!response.ok) {
        throw new Error(response.status + " " + response.statusText);
    }

    const buffer = await response.arrayBuffer();
    if (nonEmpty && buffer.byteLength === 0) {
        throw new Error("empty file");
    }
    return buffer;
}

async function loadResource(resource) {
    const absoluteUrl = new URL(resource.url, window.location.href).href;

    if (resource.type === "image") {
        return loadImage(absoluteUrl);
    }

    if (resource.type === "json") {
        return loadJson(absoluteUrl);
    }

    if (resource.type === "binary") {
        return loadBinary(absoluteUrl, resource.nonEmpty);
    }

    return loadText(absoluteUrl);
}

async function runLoader() {
    const resources = selectedTarget.resources.slice();
    assetCountLabel.textContent = resources.length + (resources.length === 1 ? " item" : " items");

    let completed = 0;
    const requiredFailures = [];

    for (const resource of resources) {
        const percentBase = resources.length === 0 ? 0 : (completed / resources.length) * 100;
        setProgress(percentBase);
        phaseChip.textContent = completed === 0 ? "Preparing" : "Loading";
        setPhase(resource.label, "Waiting for " + resource.label.toLowerCase() + " to finish loading.");

        try {
            await loadResource(resource);
        } catch (error) {
            if (!resource.optional) {
                requiredFailures.push({ resource, error });
                break;
            }
        }

        completed += 1;
        setProgress((completed / resources.length) * 100);
    }

    if (requiredFailures.length > 0) {
        phaseChip.textContent = "Blocked";
        setPhase("Required assets failed", "The loader stopped at " + requiredFailures[0].resource.label.toLowerCase() + ".");
        safetyLink.classList.add("visible");
        return;
    }

    redirecting = true;
    phaseChip.textContent = "Ready";
    phaseChip.classList.add("ready");
    setProgress(100);
    setPhase("Destination ready", "All required assets finished loading. Redirecting now.");
    sessionStorage.setItem("sakura_loader_target", JSON.stringify({
        target: selectedTarget.page,
        completedAt: Date.now()
    }));

    window.setTimeout(() => {
        loadingShell.classList.add("exit");
    }, 280);

    window.setTimeout(() => {
        window.location.href = selectedTarget.page;
    }, 980);
}

function spawnPetal() {
    const petal = document.createElement("span");
    petal.className = "petal";
    petal.style.setProperty("--start-x", Math.random() * 100 + "%");
    petal.style.setProperty("--petal-size", 12 + Math.random() * 18 + "px");
    petal.style.setProperty("--petal-scale", (0.82 + Math.random() * 0.55).toFixed(2));
    petal.style.setProperty("--petal-drift", -110 + Math.random() * 220 + "px");
    petal.style.setProperty("--petal-duration", 7 + Math.random() * 5 + "s");
    petalField.appendChild(petal);
    petal.addEventListener("animationend", () => petal.remove(), { once: true });
}

for (let i = 0; i < 10; i += 1) {
    window.setTimeout(spawnPetal, i * 320);
}

const petalInterval = window.setInterval(() => {
    if (!redirecting) {
        spawnPetal();
    } else {
        window.clearInterval(petalInterval);
    }
}, 760);

const startedAt = Date.now();
const elapsedInterval = window.setInterval(() => {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    const minutesText = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secondsText = String(seconds % 60).padStart(2, "0");
    elapsedTime.textContent = minutesText + ":" + secondsText;

    if (redirecting) {
        window.clearInterval(elapsedInterval);
    }
}, 1000);

window.setTimeout(() => {
    if (!redirecting) {
        safetyLink.classList.add("visible");
    }
}, 10000);

runLoader().catch((error) => {
    console.error("Loader failed", error);
    phaseChip.textContent = "Blocked";
    setPhase("Loader error", "The loading sequence failed before the target screen was ready.");
    safetyLink.classList.add("visible");
});
