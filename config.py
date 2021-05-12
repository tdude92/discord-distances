# Set up src/config.json, which holds config info for the Discord bot
import json


config = {
    # Default values
    "TOKEN": None,
    "PREFIX": ">dd",
    "ADMINS": [],
    "PORT": 5000,
    "BLACKLIST": []
}


config["TOKEN"] = input("Input Discord bot token: ")
config["PREFIX"] = input(f"Set bot prefix: ({config['PREFIX']}) ") or config["PREFIX"]
config["PORT"] = input(f"Choose server port: ({config['PORT']}) ") or config["PORT"]
config["ADMINS"].append(input("Paste your Discord profile ID: "))


with open("./src/config.json", "w") as wh:
    json.dump(config, wh, indent = 4)
