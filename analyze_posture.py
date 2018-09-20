import numpy as np
import cv2
import math
bg = cv2.imread('/Users/ianborukhovich/Projects/posture_analyzer/bg.jpg')
fg = cv2.imread('/Users/ianborukhovich/Projects/posture_analyzer/fg.jpg')
just_fg = cv2.subtract(fg,bg)
imgray = cv2.cvtColor(just_fg, cv2.COLOR_BGR2GRAY)
ret, thresh = cv2.threshold(imgray, 127, 255 ,10)

im2, contours, hierarchy = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
print(len(contours))
contour_sizes = [(cv2.contourArea(contour), contour) for contour in contours]
biggest_contour = max(contour_sizes, key=lambda x: x[0])[1]
mask = np.zeros(im2.shape, np.uint8)
mask_left = mask.copy()
mask_right = mask.copy()
cv2.drawContours(mask, [biggest_contour], -1, 255, -1)
vertical_middle_index = math.floor(im2.shape[1]/2)

mask_left[:,:vertical_middle_index] = mask[:,:vertical_middle_index]
mask_right[:,vertical_middle_index:] = mask[:,vertical_middle_index:]

mask_reflected = mask.copy()
mask_reflected = cv2.flip( mask_reflected, 1 )
assymetries = cv2.subtract(mask,mask_reflected)

cv2.namedWindow('original',cv2.WINDOW_NORMAL)
cv2.resizeWindow('original', 350,350)
cv2.imshow("original",mask )

cv2.namedWindow('assymetries',cv2.WINDOW_NORMAL)
cv2.resizeWindow('assymetries', 350,350)
cv2.imshow("assymetries",assymetries )

cv2.namedWindow('left',cv2.WINDOW_NORMAL)
cv2.resizeWindow('left', 350,350)
cv2.imshow("left",mask_left )

cv2.namedWindow('right',cv2.WINDOW_NORMAL)
cv2.resizeWindow('right', 350,350)
cv2.imshow("right",mask_right )

cv2.waitKey(0)
cv2.destroyAllWindows()