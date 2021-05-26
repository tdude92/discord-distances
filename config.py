# Set up src/config.json, which holds config info for the Discord bot
import json


config = {
    # Default values
    "TOKEN": None,
    "PREFIX": ">dd",
    "ADMINS": [],
    "PORT": 5000,
    "UPDATE_INTERVAL": 3,
    "WHITELIST": []
}


config["TOKEN"] = input("Input Discord bot token: ")
config["PREFIX"] = input(f"Set bot prefix: ({config['PREFIX']}) ") or config["PREFIX"]
config["PORT"] = int(input(f"Choose server port: ({config['PORT']}) ") or config["PORT"])
config["ADMINS"].append(input("Paste your Discord profile ID: "))
config["WHITELIST"].append(config["ADMINS"][0])
config["UPDATE_INTERVAL"] = int(input(f"Set update interval (hours between model updates): ({config['UPDATE_INTERVAL']}) ") or config["UPDATE_INTERVAL"])


with open("./src/config.json", "w") as wh:
    json.dump(config, wh, indent = 4)
