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

    // 1. Scan Environments (Root Images or specific folder?)
    // User structure implies root images like bg-pattern.png are environments, OR they might be in envbg?
    // Based on user prompt "assetts/images/bg-pattern.png", it scans root.
    // Let's scan root for png/jpg/jpeg/webp patterns that look like backgrounds.
    
    const rootFiles = fs.readdirSync(ASSET_DIR);
    rootFiles.forEach(file => {
        const fullPath = path.join(ASSET_DIR, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isFile() && /\.(png|jpg|jpeg|webp)$/i.test(file)) {
             // Assuming root images are environments/backgrounds
             assets.environments.push(`assetts/images/${file}`);
        }
    });

    // 2. Scan Characters (assetts/images/character/<outfit>/<emotion>/<file>)
    const charDir = path.join(ASSET_DIR, 'character');
    if (fs.existsSync(charDir)) {
        const outfits = fs.readdirSync(charDir);
        
        outfits.forEach(outfit => {
            const outfitPath = path.join(charDir, outfit);
            if (fs.statSync(outfitPath).isDirectory()) {
                assets.characters[outfit] = {};
                
                // Scan emotions inside outfit
                const emotions = fs.readdirSync(outfitPath);
                emotions.forEach(emotion => {
                    const emotionPath = path.join(outfitPath, emotion);
                     if (fs.statSync(emotionPath).isDirectory()) {
                        // Scan files inside emotion folder
                        const files = fs.readdirSync(emotionPath);
                        files.forEach(f => {
                             if(/\.(png|jpg|jpeg|webp)$/i.test(f)) {
                                 // Map emotion name to this file path
                                 // "neutral": "path/to/neutral.png"
                                 // If multiple files, usually pick first or map specifically?
                                 // User example: "neutral": ".../shyneutral.png" implies mapping the folder name 'neutral' to the file inside.
                                 // Wait, user example: "neutral": "assetts/images/character/school-dress/neutral/shyneutral.png"
                                 // So: folder is 'neutral', and we take the image inside.
                                 
                                 assets.characters[outfit][emotion] = `assetts/images/character/${outfit}/${emotion}/${f}`;
                             }
                        });
                     }
                });
            }
        });
    }
    
    // Write Manifest
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(assets, null, 4));
    console.log("Manifest generated:", OUTPUT_FILE);
    console.log(JSON.stringify(assets, null, 2));
}

scanAssets();
