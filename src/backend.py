import socketio
import gensim
import json
import time
import sys

# Load config
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
def connect_error():
    sys.stdout.write("[BACKEND] The connection failed!")
    exit()


@sio.on("lock") # Debugging/Testing purposes
def on_lock(seconds, nonce):
    sys.stdout.write(f"[BACKEND] Locking for {seconds} seconds")
    sio.emit("lock")

    time.sleep(int(seconds))

    sio.emit("unlock")
    sys.stdout.write("[BACKEND] Unlocked")

    sio.emit(nonce)


@sio.on("unlock")
def on_unlock(): # TODO: add nonces + repeating unlock calls?
    sio.emit("unlock")
    sys.stdout.write("[BACKEND] Unlocked")


# Updates word2vec models
@sio.on("update")
def on_update():
    sys.stdout.write("[BACKEND] Updating models")
    sio.emit("lock")

    # TODO stuff
    time.sleep(1)
    
    sio.emit("unlock")
    sys.stdout.write("[BACKEND] Finished updating models")


sio.connect(f"http://localhost:{config['PORT']}")