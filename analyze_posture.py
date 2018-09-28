import numpy as np
import cv2
import math
import time
import os

# Set resolution for the video capture
# Function adapted from https://kirr.co/0l6qmh
def change_res(cap, width, height):
    cap.set(3, width)
    cap.set(4, height)

# Standard Video Dimensions Sizes
# grab resolution dimensions and set video capture to it.
def get_dims(cap, res='1080p'):
    width, height = STD_DIMENSIONS["480p"]
    if res in STD_DIMENSIONS:
        width,height = STD_DIMENSIONS[res]
    ## change the current caputre device
    ## to the resulting resolution
    change_res(cap, width, height)
    return width, height

def get_video_type(filename):
    filename, ext = os.path.splitext(filename)
    if ext in VIDEO_TYPE:
      return  VIDEO_TYPE[ext]
    return VIDEO_TYPE['avi']

def draw_filtered_contours(image, contours):
	mask = np.zeros(image.shape, np.uint8)
	print("drawing contours")
	for contour in contours:
		if cv2.contourArea(contour) > 500:
			cv2.drawContours(mask, [contour], -1, (255,0,0), -1)
	return mask


def setup_windows():

	window_names = ["current","diffrev","assymetries"]
	window_size = 425
	#window_locations = [[0,0],[0,window_size],[window_size,0],[window_size,window_size],[window_size*2,window_size],[window_size*2,0]]
	window_sizes = [300,300,600]
	window_locations = [[0,0],[0,300],[300,0]]

	for i in range(0,len(window_names)):
		cur_name = window_names[i]
		cv2.namedWindow(cur_name,cv2.WINDOW_NORMAL)
		cv2.resizeWindow(cur_name, window_sizes[i],window_sizes[i])
		cv2.moveWindow(cur_name, window_locations[i][0],window_locations[i][1])

def convert_to_gray(image, threshold):
#Find contours
	imgray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
	ret, thresh = cv2.threshold(imgray, threshold, 255 ,cv2.THRESH_BINARY)
	return thresh

# Video Encoding, might require additional installs
# Types of Codes: http://www.fourcc.org/codecs.php
VIDEO_TYPE = {
    'avi': cv2.VideoWriter_fourcc(*'XVID'),
    #'mp4': cv2.VideoWriter_fourcc(*'H264'),
    'mp4': cv2.VideoWriter_fourcc(*'XVID'),
}

filename = 'video.avi'
frames_per_second = 24.0
res = '720p'
STD_DIMENSIONS =  {
    "480p": (640, 480),
    "720p": (1280, 720),
    "1080p": (1920, 1080),
    "4k": (3840, 2160),
}

cam = cv2.VideoCapture(0)
out = cv2.VideoWriter(filename, get_video_type(filename), 25, get_dims(cam, res))
width = cam.get(cv2.CAP_PROP_FRAME_WIDTH)
height = cam.get(cv2.CAP_PROP_FRAME_HEIGHT)
shape = (int(width), int(height))

img_counter = 0
space_counter = 0
timing = False
start = time.time()
font = cv2.FONT_HERSHEY_SIMPLEX
snapshot_timer_length = 4
setup_windows()
center_line_width = 20
grayscale_filter_threshold = 127

def initialize_frames():
	bg = np.zeros(shape, np.uint8)
	fg = np.zeros(shape, np.uint8)
	diff = np.zeros(shape, np.uint8)
	mask = np.zeros(shape, np.uint8)
	assymetries = np.zeros(shape, np.uint8)
	text_mask = np.zeros(shape, np.uint8)
	diffrev = np.zeros(shape, np.uint8)
	gray = np.zeros(shape, np.uint8)
	return bg,fg,diff,mask,assymetries,text_mask,diffrev,gray

bg,fg,diff,mask,assymetries,text_mask,diffrev,gray = initialize_frames()
cv2.putText(text_mask, 'Take BG snap',(10,500), font, 4,(255,255,255),2,cv2.LINE_AA)
while True:
	ret, frame = cam.read()
	if not ret:
		break
	frame = cv2.flip(frame,1)
	print("frame " + str(img_counter))

		
	cv2.putText(text_mask, 'Thresh = ' + str(grayscale_filter_threshold),(10,200), font, 4,(255,255,255),2,cv2.LINE_AA)
	
	mask = draw_filtered_contours(gray_diff, contours)
	if len(contours) > 0:
		mask_reflected = mask.copy()
		mask_reflected = cv2.flip( mask_reflected, 1 )
		assymetries = cv2.subtract(mask,mask_reflected)
	if timing:
		time_diff = str(math.floor(time.time()-start))
		text_mask = np.zeros(shape, np.uint8)
		cv2.putText(text_mask, time_diff + ' seconds BG snap',(10,500), font, 4,(255,255,255),2,cv2.LINE_AA)
	display_frame = frame.copy()
	cv2.rectangle(display_frame, (math.floor(width/2), 0), (math.floor(width/2), int(height)), (255,0,0), center_line_width)
	cv2.imshow("current", cv2.add(display_frame,text_mask))
	if np.any(mask):
		assymetries = cv2.cvtColor(assymetries,cv2.COLOR_GRAY2RGB)
		assymetries =  cv2.flip( assymetries, 1 )
		assymetries = cv2.add(frame,assymetries)
		cv2.rectangle(assymetries, (math.floor(width/2), 0), (math.floor(width/2), int(height)), (255,0,0), center_line_width)
		cv2.imshow("diffrev", mask)
		cv2.imshow("assymetries", assymetries )

	k = cv2.waitKey(1)
	if k%256 == 27:
		break
	elif k%256 == 32:
		# SPACE pressed
		start = time.time()
		timing = True
		if space_counter == 1:
			bg,fg,diff,mask,assymetries,text_mask,diffrev,gray = initialize_frames()
			start = time.time()
	elif k%256 == ord('u'):
		grayscale_filter_threshold += 1
	elif k%256 == ord('y'):	
		grayscale_filter_threshold -= 1

	print(time.time()-start)
	if np.any(bg):
		fg = frame.copy()
		diffrev = cv2.subtract(fg,bg)
		text_mask = np.zeros(shape, np.uint8)
		cv2.putText(text_mask, 'Retake BG photo',(10,500), font, 4,(255,255,255),2,cv2.LINE_AA)	
		gray_fg = convert_to_gray(fg,grayscale_filter_threshold)
		gray_bg = convert_to_gray(bg,grayscale_filter_threshold)
		gray_diff = cv2.subtract(gray_fg,gray_bg)
		im2, contours, hierarchy = cv2.findContours(gray_diff, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
	if timing and time.time()-start > snapshot_timer_length :
		timing = False
		start = time.time()
		bg = frame.copy()
		
					
	img_counter += 1

out.release()
cv2.destroyAllWindows()