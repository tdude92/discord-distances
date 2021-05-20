import socketio
import numpy as np
from sklearn.manifold import MDS
from gensim.models import Word2Vec, KeyedVectors
import json
import time
import random
import re
import sys
import os

# Useful cosine distance function between two matrices (list of vectors)
def cosine_distance_mat(mat1, mat2):
    # mat1 and mat2 are numpy arrays with shape (n * d)
    # where n is the number of vectors, d is the dimensions of each vector
    dots = (mat1 * mat2).sum(axis = 1)
    norms = np.linalg.norm(mat1, axis = 1) * np.linalg.norm(mat2, axis = 1)
    return mat1.shape[0] - np.sum(dots / norms)

# Load config
with open("./config.json", "r") as rh:
    config = json.load(rh)

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

    # Clear cache
    for file in os.listdir("./cache/models/"):
        os.remove(f"./cache/models/{file}")
    for file in os.listdir("./cache/"):
        if file != "models" and file != "avatars":
            os.remove(f"./cache/{file}")

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
        epochs = 8
    )
    print("[BACKEND] Loaded base model.")

    # Iterate through each textlog and train a model
    uids = []
    for uid in os.listdir("./data/"):
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
        
        if len(lines) < 2000:
            # Require at least 2000 messages sent
            continue
        else:
            uids.append(uid)
        
        model.train(
            corpus_iterable = lines,
            total_examples = model.corpus_count,
            epochs = 15
        )

        # Write keyedvectors to cache
        model.wv.save(f"./cache/models/{uid}.kv")
        print(f"[BACKEND] Trained model for {uid}")
        del model

    # Compute cosine distance sums
    distances = {uid:{} for uid in uids}
    for uid1 in uids:
        for uid2 in uids:
            if uid1 != uid2:
                if distances[uid2].get(uid1):
                    distances[uid1][uid2] = distances[uid2][uid1]
                    continue

                # Load vectors
                vecs1 = KeyedVectors.load(f"./cache/models/{uid1}.kv").vectors
                vecs2 = KeyedVectors.load(f"./cache/models/{uid2}.kv").vectors

                # Sum of cosine distances of every words
                total_dist = cosine_distance_mat(vecs1, vecs2)

                print(f"[BACKEND] Computed distance between {uid1} and {uid2}.")
                distances[uid1][uid2] = total_dist # Conversion from np.float32 to float deferred to normalization step

    # Normalize distance between 1 and 0
    scaled_max = 1
    scaled_min = 0.05
    upper = max([max(row.values()) for row in distances.values()])
    lower = min([min(row.values()) for row in distances.values()])
    for uid1 in distances.keys():
        for uid2 in distances[uid1].keys():
            distances[uid1][uid2] = (scaled_max - scaled_min)/(upper - lower)*(distances[uid1][uid2] - upper) + scaled_max
    
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
    print("[BACKEND] Finished MDS")
    
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