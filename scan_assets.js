const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, 'assetts'); // Scan everything here
const OUTPUT_FILE = path.join(__dirname, 'assetts', 'manifest.json');

const assets = {
    environments: [],
    characters: {},
    audio: {},
    video: [],
    misc: []
};

// Valid Extensions
const IMG_EXT = /\.(png|jpg|jpeg|webp)$/i;
const AUDIO_EXT = /\.(mp3|wav|ogg|m4a)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov)$/i;

function toWebPath(fullPath) {
    // Convert absolute path to relative web path (assetts/...)
    const rel = path.relative(__dirname, fullPath);
    return rel.replace(/\\/g, '/');
}

function scanAssets() {
    if (!fs.existsSync(ROOT_DIR)) {
        console.error("Asset directory not found:", ROOT_DIR);
        return;
    }

    // --- 1. LEGACY: ENVIRONMENTS (Images in assetts/images EXCLUDING character) ---
    const imgDir = path.join(ROOT_DIR, 'images');
    if (fs.existsSync(imgDir)) {
        function scanEnv(dir) {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const full = path.join(dir, file);
                const stat = fs.statSync(full);
                if (stat.isDirectory()) {
                    if (file !== 'character') scanEnv(full);
                } else if (IMG_EXT.test(file)) {
                    assets.environments.push(toWebPath(full));
                }
            });
        }
        scanEnv(imgDir);
    }

    // --- 2. LEGACY: CHARACTERS (assetts/images/character) ---
    const charDir = path.join(imgDir, 'character');
    if (fs.existsSync(charDir)) {
        try {
            const outfits = fs.readdirSync(charDir);
            outfits.forEach(outfit => {
                const outfitPath = path.join(charDir, outfit);
                if (fs.statSync(outfitPath).isDirectory()) {
                    assets.characters[outfit] = {};
                    const emotions = fs.readdirSync(outfitPath);
                    emotions.forEach(emotion => {
                        const emoPath = path.join(outfitPath, emotion);
                         if (fs.statSync(emoPath).isDirectory()) {
                            assets.characters[outfit][emotion] = [];
                            const files = fs.readdirSync(emoPath);
                            for (const f of files) {
                                 if(IMG_EXT.test(f)) {
                                     assets.characters[outfit][emotion].push(toWebPath(path.join(emoPath, f)));
                                 }
                            }
                         }
                    });
                }
            });
        } catch(e) { console.error("Char scan err", e); }
    }

    // --- 3. NEW: AUDIO (assetts/audio recursively) ---
    const audioDir = path.join(ROOT_DIR, 'audio');
    if (fs.existsSync(audioDir)) {
        function scanAudio(dir, storeObj) {
            const items = fs.readdirSync(dir);
            items.forEach(item => {
                const full = path.join(dir, item);
                if (fs.statSync(full).isDirectory()) {
                    storeObj[item] = {};
                    scanAudio(full, storeObj[item]);
                } else if (AUDIO_EXT.test(item)) {
                    // If leaf is array, push; if object, add key
                    // To keep it simple: if generic file in folder, add to '_files' or similar?
                    // Actually, let's just make the parent object contain the list if it has files
                    if (!Array.isArray(storeObj)) {
                        // If we are mixed (dirs and files), this is tricky. 
                        // Let's use a flat list for folders that contain files?
                        // Simple approach: Audio is usually organized by type (bgm, sfx).
                        // Let's just key by filename for flattening? No, tree is better.
                    }
                }
            });
        }
        // Simpler Recursive Audio: Just mirror structure?
        // Or simple categorization: BGM, SFX
        try {
            function getFileTree(dir) {
                const tree = {};
                const list = fs.readdirSync(dir);
                list.forEach(item => {
                    const full = path.join(dir, item);
                    if(fs.statSync(full).isDirectory()) {
                        tree[item] = getFileTree(full);
                        // If empty, delete? nah
                    } else if (AUDIO_EXT.test(item)) {
                         if(!tree.files) tree.files = [];
                         tree.files.push(toWebPath(full));
                    }
                });
                return tree;
            }
            assets.audio = getFileTree(audioDir);
        } catch(e) { console.error("Audio scan err", e); }
    }

    // --- 4. NEW: VIDEO (assetts/video) ---
    const videoDir = path.join(ROOT_DIR, 'video');
    if(fs.existsSync(videoDir)) {
        try {
             const list = fs.readdirSync(videoDir);
             list.forEach(item=> {
                 const full = path.join(videoDir, item);
                 if(VIDEO_EXT.test(item)) assets.video.push(toWebPath(full));
             });
        } catch(e) {}
    }

    // --- 5. LOG RESULT ---
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(assets, null, 4));
    console.log(`Manifest Generated at ${OUTPUT_FILE}`);
    console.log(`- Envs: ${assets.environments.length}`);
    console.log(`- Chars: ${Object.keys(assets.characters).length} outfits`);
}

scanAssets();
