import socketio
import gensim.downloader
from gensim.models import Word2Vec

import json
import time
import random
import sys
import os

# MODEL PARAMS
BASEMODEL_PATH = "./models/basemodel.txt"
MODEL_PARAMS = {
    "vector_size": 100,
    "min_count": 2,
    "epochs": 10
}

# Load config
with open("./config.json", "r") as rh:
    config = json.load(rh)

# Create models/
os.makedirs("./cache/models/", exist_ok = True)

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
    
    # Write combined data into cache/combined_data.txt
    """with open("./cache/combined_data.txt", "w") as wh:
        lines = []
        for file in os.listdir("./data/"):
            with open("./data/" + file, "r") as rh:
                lines.extend(rh.readlines())

            # If the size of the array exceeds 10MB, shuffle and write
            if sys.getsizeof(lines) > 10*1000*1000:
                random.shuffle(lines)
                wh.writelines(lines)
        # Write last bit of lines into file
        random.shuffle(lines)
        wh.writelines(lines)
        del lines

    # Iterate through each textlog and train a model
    for file in os.listdir("./data/"):
        model = Word2Vec(
            corpus_file = "./cache/combined_data.txt",
            vector_size = 100,
            min_count = 2,
            workers = 4,
            max_vocab_size = 50000,
            epochs = 10
        )"""
    time.sleep(5)
    
    sio.emit("unlock")
    sys.stdout.write("[BACKEND] Finished updating models")


sio.connect(f"http://localhost:{config['PORT']}")