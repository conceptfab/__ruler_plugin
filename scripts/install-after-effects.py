import os
import shutil
import sys

# Get the directory of the current script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# The panel files this installer copies into the ScriptUI Panels folder.
# tests/installAfterEffects.test.js asserts this list and the copy behaviour.
PANEL_FILES = [
    "RulerAnimator.jsx",
    "rulerAnimatorCore.js",
    "DimensionAnimator.jsx",
    "dimensionAnimatorCore.js",
    "DimensionLine.jsx",
    "dimensionLineCore.js",
]


def get_install_directory():
    # 1. Check if overridden by environment variable
    env_dir = os.environ.get("AE_SCRIPTUI_PANELS")
    if env_dir:
        return os.path.abspath(env_dir)
    
    # 2. Check if a custom path is provided as CLI argument
    if len(sys.argv) > 1:
        return os.path.abspath(sys.argv[1])
        
    # 3. Platform-specific default path
    ae_version = os.environ.get("AE_VERSION", "2026")
    
    if sys.platform.startswith("win"):
        # Default Windows path requested by user
        return fr"S:\_software\ADOBE\Adobe After Effects {ae_version}\Support Files\Scripts\ScriptUI Panels"
    elif sys.platform == "darwin":
        # Default macOS path from the JS script
        return f"/Applications/Adobe After Effects {ae_version}/Scripts/ScriptUI Panels"
    else:
        return None

def install():
    src_dir = os.path.join(PROJECT_ROOT, "src")
    dest_dir = get_install_directory()
    
    if not dest_dir:
        print(
            "Error: Unsupported OS. Please set the AE_SCRIPTUI_PANELS environment variable "
            "to your After Effects ScriptUI Panels folder.",
            file=sys.stderr
        )
        sys.exit(1)
        
    print(f"Installing panels to: {dest_dir}")
    
    if not os.path.exists(src_dir):
        print(f"Error: Source directory does not exist: {src_dir}", file=sys.stderr)
        sys.exit(1)
        
    try:
        # Create destination directory if it doesn't exist
        os.makedirs(dest_dir, exist_ok=True)
    except Exception as e:
        print(f"Error creating destination directory: {e}", file=sys.stderr)
        sys.exit(1)
        
    # Copy only the known panel files. Avoid os.listdir + copytree/rmtree:
    # that shipped stray files and could recursively delete a destination
    # folder on a name collision.
    for file_name in PANEL_FILES:
        src_path = os.path.join(src_dir, file_name)
        dest_path = os.path.join(dest_dir, file_name)

        if not os.path.exists(src_path):
            print(f"Error: Missing source file: {src_path}", file=sys.stderr)
            sys.exit(1)

        try:
            shutil.copy2(src_path, dest_path)
            print(f"Copied {file_name} -> {dest_path}")
        except Exception as e:
            print(f"Error copying {file_name}: {e}", file=sys.stderr)
            sys.exit(1)

    print("Installation completed successfully!")

if __name__ == "__main__":
    install()
