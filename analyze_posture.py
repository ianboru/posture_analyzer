import numpy as np
import cv2
import math
import time

bg = cv2.imread('/Users/ianborukhovich/Projects/posture_analyzer/bg_lit.jpg')
fg = cv2.imread('/Users/ianborukhovich/Projects/posture_analyzer/fg_lit.jpg')
just_fg = cv2.subtract(fg,bg)
imgray = cv2.cvtColor(just_fg, cv2.COLOR_BGR2GRAY)

window_names = ["current","diffrev","assymetries"]
window_size = 425
#window_locations = [[0,0],[0,window_size],[window_size,0],[window_size,window_size],[window_size*2,window_size],[window_size*2,0]]
window_locations = [[0,0],[window_size,0],[window_size*2,0]]
def setup_windows():
	for i in range(0,len(window_names)):
		cur_name = window_names[i]
		cv2.namedWindow(cur_name,cv2.WINDOW_NORMAL)
		cv2.resizeWindow(cur_name, window_size,window_size)
		cv2.moveWindow(cur_name, window_locations[i][0],window_locations[i][1])
	
img_counter = 0
space_counter = 0
timing = False
start = time.time()
font = cv2.FONT_HERSHEY_SIMPLEX
snapshot_timer_length = 4
cam = cv2.VideoCapture(0)
setup_windows()
center_line_width = 20
while True:
	ret, frame = cam.read()
	width = cam.get(cv2.CAP_PROP_FRAME_WIDTH)
	height = cam.get(cv2.CAP_PROP_FRAME_HEIGHT)

	if not ret:
		break
	frame = cv2.flip(frame,1)
	print("frame " + str(img_counter))

	if img_counter == 0:
		bg = np.zeros(frame.shape, np.uint8)
		fg = np.zeros(frame.shape, np.uint8)
		diff = np.zeros(frame.shape, np.uint8)
		mask = np.zeros(frame.shape, np.uint8)
		assymetries = np.zeros(frame.shape, np.uint8)
		text_mask = np.zeros(frame.shape, np.uint8)
		cv2.putText(text_mask, 'Take BG snap',(10,500), font, 4,(255,255,255),2,cv2.LINE_AA)
	#Find contours
	imgray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
	ret, thresh = cv2.threshold(imgray, 127, 255 ,10)
	im2, contours, hierarchy = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
	if len(contours) > 0:
		mask = np.zeros(im2.shape, np.uint8)
		print("drawing contours")

		for contour in contours:
			if cv2.contourArea(contour) > 50:
				cv2.drawContours(mask, [contour], -1, (255,0,0), -1)

		mask_reflected = mask.copy()
		mask_reflected = cv2.flip( mask_reflected, 1 )
		assymetries = cv2.subtract(mask,mask_reflected)
	if timing:
		time_diff = str(math.floor(time.time()-start))
		text_mask = np.zeros(frame.shape, np.uint8)
		cv2.putText(text_mask, time_diff + ' seconds BG snap',(10,500), font, 4,(255,255,255),2,cv2.LINE_AA)
	
	display_frame = frame.copy()
	cv2.rectangle(display_frame, (math.floor(width/2), 0), (math.floor(width/2), int(height)), (255,0,0), center_line_width)
	cv2.imshow("current", cv2.add(display_frame,text_mask))
	cv2.imshow("diffrev", mask)
	if np.any(mask):
		#frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
		#frame_ret, frame_thresh = cv2.threshold(frame_gray, 127, 255 ,10)
		assymetries = cv2.cvtColor(assymetries,cv2.COLOR_GRAY2RGB)
		assymetries =  cv2.flip( assymetries, 1 )

		assymetries = cv2.add(frame,assymetries)
		cv2.rectangle(assymetries, (math.floor(width/2), 0), (math.floor(width/2), int(height)), (255,0,0), center_line_width)
		cv2.imshow("assymetries", assymetries )

	k = cv2.waitKey(1)
	if k%256 == 27:
		break
	elif k%256 == 32:
		# SPACE pressed
		start = time.time()
		timing = True
		if space_counter == 1:
			bg = np.zeros(frame.shape, np.uint8)
			fg = np.zeros(frame.shape, np.uint8)
			diff = np.zeros(frame.shape, np.uint8)
			diffrev = np.zeros(frame.shape, np.uint8)
			gray = np.zeros(frame.shape, np.uint8)
			start = time.time()

	print(time.time()-start)
	if np.any(bg):
		fg = frame.copy()
		diff = cv2.subtract(fg,bg)
		diffrev = cv2.subtract(bg,fg)
		text_mask = np.zeros(frame.shape, np.uint8)
		cv2.putText(text_mask, 'Retake BG photo',(10,500), font, 4,(255,255,255),2,cv2.LINE_AA)	
	if timing and time.time()-start > snapshot_timer_length :
		timing = False
		start = time.time()
		bg = frame.copy()
		
					
	img_counter += 1

cv2.waitKey(0)
cv2.destroyAllWindows()