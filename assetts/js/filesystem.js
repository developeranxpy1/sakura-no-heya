
/**
 * Virtual File System (VFS)
 * Structure:
 * {
 *   "root": {
 *      "type": "dir",
 *      "children": {
 *          "home": { "type": "dir", "children": { ... } },
 *          "bin": { ... }
 *      }
 *   }
 * }
 */

class FileSystem {
    constructor() {
        this.fs = Common.loadData('vfs_data') || this._createDefaultFS();
        this.currentPath = ['root', 'home', 'user']; // Default path: /home/user
    }

    _createDefaultFS() {
        return {
            "root": {
                type: "dir",
                children: {
                    "home": {
                        type: "dir",
                        children: {
                            "user": {
                                type: "dir",
                                children: {
                                    "documents": { type: "dir", children: {} },
                                    "pictures": { type: "dir", children: {} },
                                    "welcome.txt": { type: "file", content: "Welcome to SakuraOS!\nThis is a virtual file system." }
                                }
                            }
                        }
                    },
                    "bin": {
                        type: "dir",
                        children: {
                            "echo": { type: "file", content: "[Executable]" },
                            "ls": { type: "file", content: "[Executable]" }
                        }
                    }
                }
            }
        };
    }

    _save() {
        Common.saveData('vfs_data', this.fs);
    }

    // Traverse to a node
    _resolvePath(pathArray) {
        let current = this.fs;
        for (const part of pathArray) {
            if (current.children && current.children[part]) {
                current = current.children[part];
            } else {
                return null;
            }
        }
        return current;
    }

    // Public API
    ls(path = null) {
        const targetPath = path ? this.parsePath(path) : this.currentPath;
        const node = this._resolvePath(targetPath);
        if (node && node.type === 'dir') {
            return Object.keys(node.children).map(name => {
                const child = node.children[name];
                return { name, type: child.type };
            });
        }
        throw new Error("Not a directory");
    }

    cd(path) {
        if (path === '..') {
            if (this.currentPath.length > 1) { // Don't go above root
                this.currentPath.pop();
                return this.getPWD();
            }
        } else if (path === '/') {
            this.currentPath = ['root'];
            return '/';
        } else {
            // Simple relative CD for now
            const newPath = [...this.currentPath, path];
            const node = this._resolvePath(newPath);
            if (node && node.type === 'dir') {
                this.currentPath = newPath;
                return this.getPWD();
            }
            throw new Error("Directory not found: " + path);
        }
    }

    mkdir(name) {
        const currentDir = this._resolvePath(this.currentPath);
        if (currentDir.children[name]) throw new Error("File/Dir exists");
        currentDir.children[name] = { type: 'dir', children: {} };
        this._save();
        return `Created directory: ${name}`;
    }

    touch(name, content = "") {
        const currentDir = this._resolvePath(this.currentPath);
        currentDir.children[name] = { type: 'file', content: content };
        this._save();
        return `Created file: ${name}`;
    }

    readFile(name) {
        const currentDir = this._resolvePath(this.currentPath);
        const file = currentDir.children[name];
        if (file && file.type === 'file') return file.content;
        throw new Error("File not found or is a directory");
    }

    getPWD() {
        return '/' + this.currentPath.slice(1).join('/'); // hide 'root'
    }
    
    // Convert string path like "/home/user" to array ['root', 'home', 'user']
    parsePath(pathStr) {
        if (pathStr.startsWith('/')) {
            const parts = pathStr.split('/').filter(p => p.length > 0);
            return ['root', ...parts];
        }
        return [...this.currentPath, pathStr];
    }
}

// Global Instance
const VFS = new FileSystem();
