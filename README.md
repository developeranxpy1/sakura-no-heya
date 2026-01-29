# 🌸 Sakura no Heya

> AI character prototype with auto-sync to GitHub

## 🔄 Auto-Sync Service

This project includes `syncfolder.py` - an automatic GitHub sync service that runs in the background.

### Features

- ⏱️ **Auto-sync every 5 seconds** - Continuously monitors for file changes
- 📝 **Verbose logging** with timestamps
- 🕐 **12-hour AM/PM format** with elapsed time tracking
- 🔎 **Upload verification** - Confirms files are pushed correctly
- 🌿 **Branch auto-detection** - Automatically uses current branch

### Log Format

```
[07:54:15 PM] [00:03:16] 🔄 Starting sync cycle...
[07:54:15 PM] [00:03:16] 🔍 Git repo check: Found
[07:54:15 PM] [00:03:16] ✅ Pushed 3 file(s) to GitHub!
[07:54:15 PM] [00:03:16] ⏱️  Sync #37 completed in 427ms
```

- **First bracket**: Current time (12-hour AM/PM)
- **Second bracket**: Elapsed runtime (HH:MM:SS)
- **Emoji prefix**: Log level indicator

### Usage

```bash
python syncfolder.py
```

Press `Ctrl+C` to stop.

### Configuration

Edit the top of `syncfolder.py`:

```python
# Path to sync
LOCAL_FOLDER = r"c:\path\to\folder"

# Branch (or "auto" for auto-detect)
BRANCH = "auto"

# Sync interval in seconds
SYNC_INTERVAL = 5

# Verbose mode
VERBOSE = True

# Verify uploads after push
VERIFY_UPLOADS = True
```

### Log Levels

| Emoji | Level   | Description         |
| ----- | ------- | ------------------- |
| ℹ️    | INFO    | General information |
| ✅    | SUCCESS | Operation completed |
| ⚠️    | WARNING | Non-critical issue  |
| ❌    | ERROR   | Operation failed    |
| 🔍    | DEBUG   | Verbose details     |
| 🔄    | SYNC    | Sync cycle start    |
| 📦    | GIT     | Git command         |
| 🔎    | VERIFY  | Upload verification |
| ⏱️    | TIME    | Timing information  |

---

## 📁 Project Structure

```
desktop/
├── assetts/          # Static assets (images, fonts, etc.)
├── quickmode.html    # Quick chat interface
├── login.html        # Login page
├── mainmenu.html     # Main menu
├── desktopui.html    # Desktop UI
└── syncfolder.py     # Auto-sync service
```

## 📄 License

MIT License
