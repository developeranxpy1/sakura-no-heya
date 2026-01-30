const fs = require('fs');
const path = require('path');

const ASSET_DIR = path.join(__dirname, 'assetts', 'images');
const OUTPUT_FILE = path.join(__dirname, 'assetts', 'manifest.json');

const assets = {
    environments: [],
    characters: {}
};

function scanAssets() {
    if (!fs.existsSync(ASSET_DIR)) {
        console.error("Asset directory not found:", ASSET_DIR);
        return;
    }

    // 1. Scan Environments (Root Images)
    // 1. Scan Environments (Recursive - Excluding 'character')
    try {
        function scanDir(dir, relativePath) {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    if (file !== 'character') { // Skip character folder (handled separately)
                        scanDir(fullPath, path.join(relativePath, file));
                    }
                } else if (/\.(png|jpg|jpeg|webp)$/i.test(file)) {
                     // Normalize path separators to forward slashes for web usage
                     const webPath = path.join('assetts/images', relativePath, file).replace(/\\/g, '/');
                     assets.environments.push(webPath);
                }
            });
        }
        scanDir(ASSET_DIR, '');
    } catch (e) { console.error("Error scanning environments:", e); }

    // 2. Scan Characters
    const charDir = path.join(ASSET_DIR, 'character');
    if (fs.existsSync(charDir)) {
        try {
            const outfits = fs.readdirSync(charDir);
            outfits.forEach(outfit => {
                const outfitPath = path.join(charDir, outfit);
                if (fs.statSync(outfitPath).isDirectory()) {
                    assets.characters[outfit] = {};
                    
                    const emotions = fs.readdirSync(outfitPath);
                    emotions.forEach(emotion => {
                        const emotionPath = path.join(outfitPath, emotion);
                         if (fs.statSync(emotionPath).isDirectory()) {
                            const files = fs.readdirSync(emotionPath);
                            assets.characters[outfit][emotion] = [];
                            for (const f of files) {
                                 if(/\.(png|jpg|jpeg|webp)$/i.test(f)) {
                                     assets.characters[outfit][emotion].push(`assetts/images/character/${outfit}/${emotion}/${f}`);
                                 }
                            }
                            // If only one, keep as string to minimize breaking changes? 
                            // No, requested "all", array is safer for random selection.
                            // BUT: quickmode.html expects a string for src. We must handle this consumption side too.
                            // Let's assume consumption will pick random if array.
                         }
                    });
                }
            });
        } catch (e) { console.error("Error scanning characters:", e); }
    }
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(assets, null, 4));
    console.log("Manifest generated:", OUTPUT_FILE);
}

scanAssets();
