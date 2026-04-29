import cv2

def enhance_image(image):
    """ Resize gambar jika lebarnya lebih dari 1080px untuk menghemat bandwidth """
    h, w = image.shape[:2]
    max_width = 1080
    
    if w > max_width:
        ratio = max_width / w
        new_dim = (max_width, int(h * ratio))
        # cv2.INTER_AREA adalah algoritma resize terbaik agar teks tidak pecah
        image = cv2.resize(image, new_dim, interpolation=cv2.INTER_AREA)
        
    return image