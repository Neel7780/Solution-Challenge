import os
import time
import json
import cv2
import requests
from ultralytics import YOLO

# ============================================================
# CCTV YOLO Agent — Fire Detection + Server Trigger
# When fire/smoke is detected, it POSTs to the server API
# which triggers the AI Council and updates the live dashboard.
# ============================================================

print("Loading YOLO AI Vision Model...")
model = YOLO("yolov8n.pt")

CCTV_DIR = "cctv-streams"
SERVER_URL = "http://localhost:3333"

# Map image filenames to section IDs
# Name your images like: F2-SA.jpg, F1-SB.png, etc.
# Or use descriptive names and we'll map them
SECTION_MAP = {
    "F1-SA": "F1-SA",
    "F1-SB": "F1-SB",
    "F2-SA": "F2-SA",
    "F2-SB": "F2-SB",
    "F3-SA": "F3-SA",
    "F3-SB": "F3-SB",
    "north-wing-f1": "F1-SA",
    "south-wing-f1": "F1-SB",
    "north-wing-f2": "F2-SA",
    "south-wing-f2": "F2-SB",
    "north-wing-f3": "F3-SA",
    "south-wing-f3": "F3-SB",
    "lobby": "F1-SA",
    "parking": "F1-SB",
}

def get_section_from_filename(filename):
    """Extract section ID from the image filename."""
    name = os.path.splitext(filename)[0].lower().replace(" ", "-")
    
    # Direct match
    if name.upper() in SECTION_MAP:
        return SECTION_MAP[name.upper()]
    
    # Fuzzy match
    if name in SECTION_MAP:
        return SECTION_MAP[name]
    
    # Default: assign to F2-SA (the test fire zone)
    return "F2-SA"

def trigger_server(section_id, camera_name):
    """POST to the server to trigger the AI pipeline."""
    new_sensor = {
        "id": f"CCTV-{camera_name}",
        "section_id": section_id,
        "location": f"CCTV Camera: {camera_name}",
        "type": "visual_fire_confirmation",
        "status": "CRITICAL"
    }
    
    try:
        response = requests.post(
            f"{SERVER_URL}/api/trigger",
            json={"new_sensor": new_sensor},
            timeout=10
        )
        if response.status_code == 200:
            print(f"   [+] Server updated! Dashboard will show fire in {section_id}")
        else:
            print(f"   [-] Server error: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print(f"   [-] Server not running. Start it with: node server.js")
        print(f"   [-] Falling back to local JSON update...")
        update_local_json(section_id, camera_name)

def update_local_json(section_id, camera_name):
    """Fallback: update mock-data.json directly if server isn't running."""
    try:
        with open('mock-data.json', 'r') as f:
            data = json.load(f)
        
        new_sensor = {
            "id": f"CCTV-{camera_name}",
            "section_id": section_id,
            "location": f"CCTV Camera: {camera_name}",
            "type": "visual_fire_confirmation",
            "status": "CRITICAL"
        }
        
        exists = any(s['id'] == new_sensor['id'] for s in data['sensors'])
        if not exists:
            data['sensors'].append(new_sensor)
            with open('mock-data.json', 'w') as f:
                json.dump(data, f, indent=2)
            print(f"   [+] Local JSON updated with fire in {section_id}")
    except Exception as e:
        print(f"   [-] Error: {e}")

def scan_cctv_network():
    print(f"\n{'='*50}")
    print(f"  CCTV YOLO Fire Detection Agent")
    print(f"  Monitoring: ./{CCTV_DIR}/")
    print(f"  Server: {SERVER_URL}")
    print(f"{'='*50}")
    print(f"\nDrop images into '{CCTV_DIR}/' to simulate camera feeds.")
    print(f"Name them after sections (e.g., F2-SA.jpg, north-wing-f2.png)\n")
    
    scanned_images = set()

    while True:
        if not os.path.exists(CCTV_DIR):
            os.makedirs(CCTV_DIR)
            
        images = [f for f in os.listdir(CCTV_DIR) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
        
        for img_file in images:
            if img_file not in scanned_images:
                img_path = os.path.join(CCTV_DIR, img_file)
                section_id = get_section_from_filename(img_file)
                
                print(f"\n📷 Scanning: {img_file} (mapped to section: {section_id})")
                
                # Run YOLO
                results = model(img_path, verbose=False)
                
                detections = []
                for result in results:
                    for box in result.boxes:
                        cls_id = int(box.cls[0])
                        conf = float(box.conf[0])
                        cls_name = result.names[cls_id]
                        detections.append(f"{cls_name} ({conf:.0%})")
                
                if detections:
                    print(f"   🔍 Detected: {', '.join(detections)}")
                    print(f"   🚨 FIRE ALERT triggered for section {section_id}!")
                    trigger_server(section_id, os.path.splitext(img_file)[0])
                else:
                    print(f"   ✅ No hazards detected.")
                
                scanned_images.add(img_file)
                
        time.sleep(2)

if __name__ == "__main__":
    try:
        scan_cctv_network()
    except KeyboardInterrupt:
        print("\n\nCCTV Monitoring Terminated.")
