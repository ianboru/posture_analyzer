import numpy as np
import cv2
import math
import time

bg = cv2.imread('/Users/ianborukhovich/Projects/posture_analyzer/bg_lit.jpg')
fg = cv2.imread('/Users/ianborukhovich/Projects/posture_analyzer/fg_lit.jpg')
just_fg = cv2.subtract(fg,bg)
imgray = cv2.cvtColor(just_fg, cv2.COLOR_BGR2GRAY)

cam = cv2.VideoCapture(0)
cv2.namedWindow("bg",cv2.WINDOW_NORMAL)
cv2.namedWindow("fg",cv2.WINDOW_NORMAL)
cv2.namedWindow("current",cv2.WINDOW_NORMAL)
cv2.namedWindow("diff",cv2.WINDOW_NORMAL)
cv2.namedWindow("diffrev",cv2.WINDOW_NORMAL)
cv2.namedWindow("gray",cv2.WINDOW_NORMAL)

cv2.resizeWindow('bg', 350,350)
cv2.resizeWindow('fg', 350,350)
cv2.resizeWindow('current', 350,350)
cv2.resizeWindow('diff', 350,350)
cv2.resizeWindow('diffrev', 350,350)
cv2.resizeWindow('gray', 350,350)

cv2.moveWindow('bg', 0,0)
cv2.moveWindow('fg', 0,350)
cv2.moveWindow('current', 350,0)
cv2.moveWindow('diff', 350,350)
cv2.moveWindow('diffrev', 700,350)
cv2.moveWindow('gray', 700,0)

img_counter = 0
space_counter = 0
timing = False
start = time.time()
font = cv2.FONT_HERSHEY_SIMPLEX
snapshot_timer_length = 5
while True:
	ret, frame = cam.read()
	if not ret:
		break
	frame = cv2.flip(frame,1)
	print("frame " + str(img_counter))

	if img_counter == 0:
		bg = np.zeros(frame.shape, np.uint8)
		fg = np.zeros(frame.shape, np.uint8)
		diff = np.zeros(frame.shape, np.uint8)
		diffrev = np.zeros(frame.shape, np.uint8)
		gray = np.zeros(frame.shape, np.uint8)
		text_mask = np.zeros(frame.shape, np.uint8)
		cv2.putText(text_mask, 'Take BG snap',(10,500), font, 4,(255,255,255),2,cv2.LINE_AA)


	imgray = cv2.cvtColor(diffrev, cv2.COLOR_BGR2GRAY)
	ret, thresh = cv2.threshold(imgray, 127, 255 ,10)
	im2, contours, hierarchy = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
	if len(contours) > 0:
		contour_sizes = [(cv2.contourArea(contour), contour) for contour in contours]
		biggest_contour = max(contour_sizes, key=lambda x: x[0])[1]
		mask = np.zeros(im2.shape, np.uint8)
		cv2.drawContours(mask, [biggest_contour], -1, 255, -1)
		mask_reflected = mask.copy()
		mask_reflected = cv2.flip( mask_reflected, 1 )
		gray = cv2.subtract(mask,mask_reflected)
	if timing:
		time_diff = str(math.floor(time.time()-start))
		if space_counter == 1:
			text_mask = np.zeros(frame.shape, np.uint8)
			cv2.putText(text_mask, time_diff + ' seconds BG snap',(10,500), font, 4,(255,255,255),2,cv2.LINE_AA)
		if space_counter == 2:
			text_mask = np.zeros(frame.shape, np.uint8)
			cv2.putText(text_mask, time_diff + ' seconds FG snap',(10,500), font, 4,(255,255,255),2,cv2.LINE_AA)
	else:
		if space_counter == 1 :
			text_mask = np.zeros(frame.shape, np.uint8)
			cv2.putText(text_mask, 'Take FG Snap',(10,500), font, 4,(255,255,255),2,cv2.LINE_AA)
	cv2.imshow("bg", bg)
	cv2.imshow("fg", fg)
	cv2.imshow("diff", diff)
	cv2.imshow("current", cv2.add(frame,text_mask))
	cv2.imshow("diffrev", diffrev)
	cv2.imshow("gray", gray)
	k = cv2.waitKey(1)
	if k%256 == 27:
		break
	elif k%256 == 32:
		# SPACE pressed
		space_counter = space_counter%3
		start = time.time()
		if space_counter == 2:
			bg = np.zeros(frame.shape, np.uint8)
			fg = np.zeros(frame.shape, np.uint8)
			diff = np.zeros(frame.shape, np.uint8)
			diffrev = np.zeros(frame.shape, np.uint8)
			gray = np.zeros(frame.shape, np.uint8)
			start = time.time()
			text_mask = np.zeros(frame.shape, np.uint8)
			cv2.putText(text_mask, 'Take BG photo',(10,500), font, 4,(255,255,255),2,cv2.LINE_AA)

		if space_counter < 2:
			timing = True
		space_counter += 1 
	print(time.time()-start)
	
	if timing and time.time()-start > snapshot_timer_length :
		timing = False
		start = time.time()
		if not np.any(bg):
			bg = frame.copy()

		elif np.any(bg) and not np.any(fg):
			fg = frame.copy()
			diff = cv2.subtract(fg,bg)
			diffrev = cv2.subtract(bg,fg)
			if space_counter == 2:
				text_mask = np.zeros(frame.shape, np.uint8)
				cv2.putText(text_mask, 'Retake BG photo',(10,500), font, 4,(255,255,255),2,cv2.LINE_AA)			
	img_counter += 1

'''im2, contours, hierarchy = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
print(len(contours))
contour_sizes = [(cv2.contourArea(contour), contour) for contour in contours]
biggest_contour = max(contour_sizes, key=lambda x: x[0])[1]
mask = np.zeros(im2.shape, np.uint8)
mask_left = mask.copy()
mask_right = mask.copy()
cv2.drawContours(mask, [biggest_contour], -1, 255, -1)

cv2.imshow("assymetries",assymetries )

cv2.namedWindow('left',cv2.WINDOW_NORMAL)
cv2.resizeWindow('left', 350,350)
cv2.imshow("left",mask_left )

cv2.namedWindow('right',cv2.WINDOW_NORMAL)
cv2.resizeWindow('right', 350,350)
cv2.imshow("right",mask_right )
'''
cv2.waitKey(0)
cv2.destroyAllWindows()