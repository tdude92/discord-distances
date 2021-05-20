import socketio
import numpy as np
from sklearn.manifold import MDS
from scipy.spatial import distance
from gensim.models import Word2Vec, KeyedVectors
import json
import time
import random
import re
import sys
import os

# Load config
with open("./config.json", "r") as rh:
    config = json.load(rh)

# Create models/
os.makedirs("./cache/models/", exist_ok = True)

sio = socketio.Client()

@sio.event
def connect():
    print("[BACKEND] I'm connected!")


@sio.event
def disconnect():
    print("[BACKEND] I'm disconnected!")
    exit()


@sio.event
def connect_error():
    print("[BACKEND] The connection failed!")
    exit()


@sio.on("lock") # Debugging/Testing purposes
def on_lock(seconds, nonce):
    print(f"[BACKEND] Locking for {seconds} seconds")
    sio.emit("lock")

    time.sleep(int(seconds))

    sio.emit("unlock")
    print("[BACKEND] Unlocked")

    sio.emit(nonce)


@sio.on("unlock")
def on_unlock():
    sio.emit("unlock")
    print("[BACKEND] Unlocked")


# Updates word2vec models
@sio.on("update")
def on_update():
    print("[BACKEND] Updating models")
    sio.emit("lock")

    # Write combined data into cache/combined_data.txt
    with open("./cache/combined_data.txt", "w") as wh:
        lines = []
        for file in os.listdir("./data/"):
            with open("./data/" + file, "r") as rh:
                lines.extend(rh.readlines())

            # If the size of the array exceeds 10MB, shuffle and write
            if sys.getsizeof(lines) > 10*1000*1000:
                random.shuffle(lines)
                wh.writelines(lines)
                lines = []
        # Write last bit of lines into file
        random.shuffle(lines)
        wh.writelines(lines)
        del lines

    base_model = Word2Vec(
        corpus_file = "./cache/combined_data.txt",
        vector_size = 100,
        min_count = 1,
        workers = 4,
        max_vocab_size = 50000,
        epochs = 10
    )

    # Iterate through each textlog and train a model
    uids = os.listdir("./data/")
    for uid in uids:
        # Create a copy of base_model and continue training
        model = Word2Vec(
            vector_size = 100,
            min_count = 1,
            workers = 4
        )
        model.reset_from(base_model)
        model.wv.vectors = np.copy(base_model.wv.vectors)

        # Next two lines won't work if models do not use negative sampling
        model.syn1neg = np.copy(base_model.syn1neg)
        model.wv.vectors_lockf = np.ones(1, dtype=np.float32)

        # Fine tune model
        with open(f"./data/{uid}", "r") as rh:
            lines = rh.readlines()
        
        model.train(
            corpus_iterable = lines,
            total_examples = model.corpus_count,
            epochs = 15
        )

        # Write keyedvectors to cache
        model.wv.save(f"./cache/models/{uid}.kv")
        del model
    
    # Compute cosine distance sums
    distances = {uid:{} for uid in uids}
    for uid1 in uids:
        for uid2 in uids:
            if uid1 != uid2:
                total = 0
                
                # Load vectors
                vecs1 = KeyedVectors.load(f"./cache/models/{uid1}.kv").vectors
                vecs2 = KeyedVectors.load(f"./cache/models/{uid2}.kv").vectors

                # Sum of cosine distances of every word
                for i in range(vecs1.shape[0]):
                    total += distance.cosine(vecs1[i], vecs2[i])

                distances[uid1][uid2] = total
    
    # Write distances to cache
    with open("./cache/distances.json", "w") as wh:
        json.dump(distances, wh, indent = 4)

    # Compute MDS and write points to cache/points.txt
    uid2idx = {uid:idx for (idx, uid) in enumerate(uids)}
    idx2uid = uids # idx2uid would be uid

    # Populate dissimilarity matrix
    dissimilarity_matrix = np.zeros((len(uids), len(uids)), dtype = np.float32)
    for uid1 in uids:
        for uid2 in uids:
            if uid1 == uid2:
                continue
            dist = distances[uid1][uid2]
            idx1 = uid2idx[uid1]
            idx2 = uid2idx[uid2]
            dissimilarity_matrix[idx1][idx2] = dist

    # Use MDS to reduce dimensionality for plotting
    mds_embedding = MDS(n_jobs = 4, dissimilarity = 'precomputed')
    points2d = mds_embedding.fit_transform(dissimilarity_matrix)
    
    with open("./cache/2dpoints", "w") as wh:
        # Written in form:
        # x y uid
        for i in range(points2d.shape[0]):
            x = points2d[i][0]
            y = points2d[i][1]
            uid = idx2uid[i]
            wh.write(f"{x} {y} {uid}\n")

    sio.emit("unlock")
    print("[BACKEND] Finished updating models")


sio.connect(f"http://localhost:{config['PORT']}")