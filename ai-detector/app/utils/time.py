from datetime import datetime

def ts():
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]