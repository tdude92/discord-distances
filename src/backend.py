import socketio
import json
import time # TODO remove
import sys

with open("./config.json", "r") as rh:
    config = json.load(rh)

sio = socketio.Client()

@sio.event
def connect():
    sys.stdout.write("[BACKEND] I'm connected!")

@sio.event
def disconnect():
    sys.stdout.write("[BACKEND] I'm disconnected!")
    exit()

@sio.event
def connect_error(data):
    sys.stdout.write("[BACKEND] The connection failed!")
    exit()

@sio.on("update_models")
def on_update():
    sys.stdout.write("[BACKEND] Updating models")
    sio.emit("lock")
    # TODO stuff
    time.sleep(10)
    sio.emit("unlock")
    sys.stdout.write("[BACKEND] Finished updating models")

sio.connect(f"http://localhost:{config['PORT']}")