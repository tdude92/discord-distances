import socketio
import numpy as np
from sklearn.manifold import MDS
from gensim.models import Word2Vec, KeyedVectors
import matplotlib.pyplot as plt
from matplotlib.transforms import Bbox
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
    for file in os.listdir("./cache/avatars/"):
        os.remove(f"./cache/avatars/{file}")
    for file in os.listdir("./cache/figs/"):
        os.remove(f"./cache/figs/{file}")
    for file in os.listdir("./cache/"):
        if file not in ["models", "avatars", "figs"]:
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
    
    # No data to train models with
    with open("./cache/combined_data.txt", "r") as rh:
        if not len(rh.read().strip()):
            sio.emit("unlock")
            print("[BACKEND] No train data")
            return

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
        
        uids.append(uid)
        model.train(
            corpus_iterable = lines,
            total_examples = model.corpus_count,
            epochs = 8,
            start_alpha = 0.01,
            end_alpha = 0.001
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
            if upper != lower:
                distances[uid1][uid2] = (scaled_max - scaled_min)/(upper - lower)*(distances[uid1][uid2] - upper) + scaled_max
            else:
                # If upper == lower, then cannot normalize into a range of numbers.
                # Just set distance of everything equal to 1.
                distances[uid1][uid2] = 1

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

    sio.emit("finish_update")
    print("[BACKEND] Finished updating models")


@sio.on("scatter")
def on_scatter(nonce, guild_id):
    try:
        # Load points
        with open("./cache/2dpoints", "r") as rh:
            # Using synchronous socketio, no need for mutex
            x_arr, y_arr, uids = zip(*[line.split() for line in rh.readlines()])
            x_arr = [float(x) for x in x_arr]
            y_arr = [float(y) for y in y_arr]
        
        # Compute axes limits
        w = 0.025 # Width of a point / 2
        x_min = min(x_arr) - 2*w
        y_min = min(y_arr) - 2*w
        x_max = max(x_arr) + 2*w
        y_max = max(y_arr) + 2*w

        fig, ax = plt.subplots()
        ax.set_xlim(left = x_min, right = x_max)
        ax.set_ylim(bottom = y_min, top = y_max)

        for i in range(len(uids)):
            x = x_arr[i]
            y = y_arr[i]
            uid = uids[i]

            avatar = plt.imread(f"./cache/avatars/{uid}.jpg")
            ax.imshow(avatar, extent = (x - w, x + w, y - w, y + w))

        fig.savefig(f"./cache/figs/{guild_id}.jpg", bbox_inches = "tight")
        sio.emit(nonce)
    except Exception as e:
        sys.stderr.write(str(e))
        sio.emit(nonce, str(e))


sio.connect(f"http://localhost:{config['PORT']}")