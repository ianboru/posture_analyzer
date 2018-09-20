import numpy as np
import cv2

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
cv2.drawContours(mask, [biggest_contour], -1, 255, -1)

cv2.namedWindow('contours',cv2.WINDOW_NORMAL)
cv2.namedWindow('original',cv2.WINDOW_NORMAL)
cv2.resizeWindow('contours', 600,600)
cv2.resizeWindow('original', 600,600)
cv2.imshow("contours", mask)
cv2.imshow("original", im2)
cv2.waitKey(0)
cv2.destroyAllWindows()