# Set up src/config.json, which holds config info for the Discord bot
import json


config = {
    # Default values
    "TOKEN": None,
    "PREFIX": ">dd",
    "ADMINS": [],
    "BLACKLIST": []
}


config["TOKEN"] = input("Input Discord bot token: ")
config["PREFIX"] = input("Set bot prefix: (>dd) ") or config["PREFIX"]
config["ADMINS"].append(input("Paste your Discord profile ID: "))


with open("./src/config.json", "w") as wh:
    json.dump(config, wh, indent = 4)
