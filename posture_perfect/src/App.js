import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import cv from 'opencv.js';
import * as tf from '@tensorflow/tfjs';

import * as posenet from '@tensorflow-models/posenet';
class App extends Component {

  state = {
    canvasOutputCtx : null,
    numFrames : 0,
    src : null,
    dst : null,
    vc : null,
    stream : null,
    streaming : false,
    videoHeight : null,
    videoWidth : null,
    srcMat : null,
    net : null,
    startTime : Date.now(),
    backgroundTimer: 4,
    background : null,
    lh:5,
    ls:5,
    lv:5,
    hh:30,
    hs:30,
    hv:30,
    upsideDownMode:false,
  }
  componentDidMount=()=>{
    posenet.load().then(data=>{
       this.setState({
          net : data
        })

    });
  }
  startCamera=()=> {
    let that = this
    if (this.state.streaming) return;
      navigator.mediaDevices.getUserMedia({video: true, audio: false})
        .then(function(s) {

        that.setState({
          stream : s,
        })
        that.video.srcObject = s;
        that.video.play();
    })
      .catch(function(err) {
      console.log("An error occured! " + err);
    });

    this.video.addEventListener("canplay", function(ev){
      if (!that.state.streaming) {
        let videoWidth = that.video.videoWidth;
        let videoHeight = that.video.videoHeight;
        that.video.setAttribute("width", videoWidth);
        that.video.setAttribute("height", videoHeight);
        that.canvasOutput.width = videoWidth;
        that.canvasOutput.height = videoHeight;
        that.setState({
          videoWidth,
          videoHeight
        })
        that.setState({
          streaming : true,
        })
      }
      that.startVideoProcessing();
    }, false);
  }
  startVideoProcessing=()=> {
    var vidLength = 30 //seconds
    var fps = 24;
    if (!this.state.streaming) { console.warn("Please startup your webcam"); return; }
    this.stopVideoProcessing();
    let srcMat = new cv.Mat(this.state.videoHeight, this.state.videoWidth, cv.CV_8UC4);
    this.setState({
      srcMat
    })
    requestAnimationFrame(this.processVideo);
  }

  stopVideoProcessing = () =>{
    let src = this.state.src
    if (src != null && !src.isDeleted()) src.delete();

  }
  getAngleDeg = (ax,ay,bx,by)=> {
    var angleRad = Math.atan((ay-by)/(ax-bx));
    var angleDeg = angleRad * 180 / Math.PI;
    
    return angleDeg;
  }
  hslColPercent = (percent, start, end)=>{
    var a = percent / 100,
        b = (end - start) * a,
        c = b + start;

    // Return a CSS HSL string
    return 'hsl('+c+', 100%, 50%)';
  }
  connectConsecutiveParts=(context, keypointPositions, parts)=>{
    parts.forEach((part, i)=>{
      if(i < parts.length){
        context.beginPath()
        if(keypointPositions["left"+parts[i]] && keypointPositions["left"+parts[i+1]]){
          context.moveTo(keypointPositions["left"+parts[i]].x,keypointPositions["left"+parts[i]].y)
          context.lineTo(keypointPositions["left"+parts[i+1]].x,keypointPositions["left"+parts[i+1]].y)
        }
        if(keypointPositions["right"+parts[i]] && keypointPositions["right"+parts[i+1]]){
          context.moveTo(keypointPositions["right"+parts[i]].x,keypointPositions["right"+parts[i]].y)
          context.lineTo(keypointPositions["right"+parts[i+1]].x,keypointPositions["right"+parts[i+1]].y)
        }
      }
      context.stroke(); 
    })
    

  }
  drawCrossBodyLines = (context,keypointPositions)=>{
    let connectHorizontalParts = ["Ear","Hip","Shoulder","Eye"]
    
    context.lineWidth = 3;
    let bodyAngles = {}
    connectHorizontalParts.forEach((part)=>{
      if(keypointPositions["left"+part] && keypointPositions["right"+part]){
        let xFrom = keypointPositions["left"+part].x
        let yFrom = keypointPositions["left"+part].y
        let xTo = keypointPositions["right"+part].x
        let yTo = keypointPositions["right"+part].y
        const angle = this.getAngleDeg(xFrom,yFrom,xTo,yTo)
        const anglePercent = 100- 100*(Math.min(Math.abs(angle),10)/10)
        bodyAngles[part] = anglePercent
        var hue = Math.floor((100 - anglePercent) * 120 / 100);  // go from green to red
        var saturation = Math.abs(anglePercent - 50)/50; 
        context.strokeStyle = this.hslColPercent(anglePercent,0,120);
        context.beginPath()
        context.moveTo(keypointPositions["left"+part].x,keypointPositions["left"+part].y)
        context.lineTo(keypointPositions["right"+part].x,keypointPositions["right"+part].y)
        context.stroke(); 
        context.font="25px Verdana"
        context.fillStyle = this.hslColPercent(anglePercent,0,120);
        context.fillText(angle.toFixed(1) + String.fromCharCode(176),xFrom+15,Math.floor((yFrom+yTo)/2));

      }
    })
    let parts = ["Shoulder","Elbow", "Wrist"]
    this.connectConsecutiveParts(context, keypointPositions, parts)
    if(
        keypointPositions["leftShoulder"] && 
        keypointPositions["rightShoulder"] && 
        keypointPositions["leftHip"] && 
        keypointPositions["rightHip"]
      ){
      context.strokeStyle = 'rgba(0,255,0,0.5)';

      context.beginPath()
      context.moveTo(keypointPositions["leftShoulder"].x,keypointPositions["leftShoulder"].y)
      context.lineTo(keypointPositions["leftHip"].x, keypointPositions["leftHip"].y)
      context.stroke(); 
      context.beginPath()
      context.moveTo(keypointPositions["rightShoulder"].x,keypointPositions["rightShoulder"].y)
      context.lineTo(keypointPositions["rightHip"].x, keypointPositions["rightHip"].y)
      context.stroke();
      context.beginPath()
      context.moveTo(keypointPositions["leftShoulder"].x,keypointPositions["rightShoulder"].y)
      context.lineTo(keypointPositions["rightHip"].x, keypointPositions["leftHip"].y)
      context.stroke(); 
      context.beginPath()
      context.moveTo(keypointPositions["rightShoulder"].x,keypointPositions["leftShoulder"].y)
      context.lineTo(keypointPositions["leftHip"].x, keypointPositions["rightHip"].y)
      context.stroke(); 
      
    }
    

  }
  drawGrid = (context) =>{
    const gridSpacing = 40
    context.lineWidth = 2;
    context.strokeStyle = 'rgba(255,255,255,0.2)';
    
    for (let i = 0; i < Math.floor(this.state.videoWidth/gridSpacing);i++){
      context.beginPath()
      context.moveTo(40*(i-1),0)
      context.lineTo(40*(i-1),this.state.videoHeight)
      context.stroke(); 
    }
    for (let i = 0; i < Math.floor(this.state.videoHeight/gridSpacing);i++ ){
      context.beginPath()
      context.moveTo(0,40*(i-1))
      context.lineTo(this.state.videoWidth,40*(i-1))
      context.stroke(); 
    }
  }
  
  captureBackground =()=>{
  	let videoWidth = this.state.videoWidth
    let videoHeight = this.state.videoHeight
  	let canvasOutputCtx = this.canvasOutput.getContext("2d")

 
    let currentBackground = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4);
    
  	let interval = setInterval(()=>{
  		this.setState({
	  		backgroundTimer : this.state.backgroundTimer - 1,
	  	},()=>{
	  		if(this.state.backgroundTimer <= 0){
		  		canvasOutputCtx.drawImage(this.video, 0, 0, videoWidth, videoHeight);
		    	let imageData = canvasOutputCtx.getImageData(0, 0, videoWidth, videoHeight);
		  		currentBackground.data.set(imageData.data);
	    		cv.flip(currentBackground, currentBackground,1)

		  		this.setState({
		  			backgroundTimer : 4,
		  			background : currentBackground.clone(),
		  		},()=>{
		  			clearInterval(interval)
		  		})	
	  		}
	  	})
  		
  		
  	},1000)
  }
  drawFilteredContours=(src)=>{

    let dst = cv.Mat.zeros(this.state.videoHeight, this.state.videoWidth, cv.CV_8UC4);
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    cv.threshold(src, src, 100, 255, cv.THRESH_BINARY_INV );//+ cv.THRESH_OTSU
  
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(src, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_NONE);
    for (let i = 0; i < contours.size(); ++i) {
        let color = new cv.Scalar(150,0,0)
        cv.drawContours(dst, contours, i, color, 4, cv.LINE_8, hierarchy, 200);
    }
    //src.delete(); dst.delete(); contours.delete(); hierarchy.delete();

    return [dst,src];

  }
  processVideo=()=> {
    let canvasOutputCtx = this.canvasOutput.getContext("2d")
    let videoWidth = this.state.videoWidth
    let videoHeight = this.state.videoHeight
    if(this.state.net){
      var imageScaleFactor = 0.5;
      var outputStride = 16;
      var flipHorizontal = true;
        this.state.net.estimateSinglePose(this.video,imageScaleFactor, flipHorizontal, outputStride).then(pose=>{
          this.setState({
            pose
          })
        });
    }

    canvasOutputCtx.drawImage(this.video, 0, 0, videoWidth, videoHeight);
    let imageData = canvasOutputCtx.getImageData(0, 0, videoWidth, videoHeight);
    this.state.srcMat.data.set(imageData.data);
    cv.flip(this.state.srcMat, this.state.srcMat,1)
    let dst = new cv.Mat();
    let low = new cv.Mat(this.state.srcMat.rows, this.state.srcMat.cols, this.state.srcMat.type(), [this.state.lh, this.state.ls, this.state.lv, 0]);
    let high = new cv.Mat(this.state.srcMat.rows, this.state.srcMat.cols, this.state.srcMat.type(), [this.state.hh, this.state.hs, this.state.hv, 255]);
    // You can try more different parameters
   /* cv.inRange(this.state.srcMat, low, high, dst);
    let M = cv.Mat.ones(2, 2, cv.CV_8U);
    cv.erode(dst, dst, M);
    cv.dilate(dst, dst, M);
    cv.dilate(dst, dst, M, new cv.Point(-1, -1), 3);
    
    cv.imshow('canvasOutput',dst)
    low.delete()
    high.delete()*/
    if(this.state.background){
    	let foregroundMat = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4);
    	let drawingFlipMat = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4);
    	let finalMat = new cv.Mat(videoHeight, videoWidth, cv.CV_8UC4);

    	cv.subtract(this.state.background,this.state.srcMat , foregroundMat)

    	let contourData = this.drawFilteredContours(this.state.srcMat.clone())
	    let drawing = contourData[0]
	    cv.flip(drawing, drawingFlipMat,1)
	    cv.subtract(drawingFlipMat,drawing, drawingFlipMat)

	    cv.add(this.state.srcMat,foregroundMat,finalMat)
    	cv.imshow('canvasOutput',finalMat)
    	foregroundMat.delete()
    	drawing.delete()
    	drawingFlipMat.delete()

    }else{
    	cv.imshow('canvasOutput',this.state.srcMat)
    }
 	  canvasOutputCtx.lineWidth = 6;
    canvasOutputCtx.strokeStyle = 'rgba(255,255,255,0.7)';
    canvasOutputCtx.strokeRect(Math.floor(videoWidth/2)-10, 0, 20, videoHeight);
    
    canvasOutputCtx.lineWidth = 4;
    canvasOutputCtx.strokeStyle = 'rgba(0,0,255,0.6)'
    const scoreThreshold = .35
    let keypointPositions = {}
    if(this.state.pose){
      let boxSize = 20
      this.state.pose.keypoints.forEach((keypoint,index)=>{
        if(keypoint.score > scoreThreshold && keypoint.part.indexOf("nose") == -1 && keypoint.part.indexOf("Ear") == -1){
          keypointPositions[keypoint.part] = keypoint.position
          canvasOutputCtx.strokeRect(keypoint.position.x - boxSize/2 , keypoint.position.y - boxSize/2, boxSize, boxSize);
        }
      })

      this.drawCrossBodyLines(canvasOutputCtx, keypointPositions)

    }
    this.drawGrid(canvasOutputCtx)

    var vidLength = 30 //seconds
    var fps = 24;
    var interval = 1000/fps;
    const delta = Date.now() - this.state.startTime;
    

    if (delta > interval) {
      requestAnimationFrame(this.processVideo);
      this.setState({
        startTime : Date.now()
      })
    }
  }
  stopCamera=()=> {
    if (!this.state.streaming) return;
    this.stopVideoProcessing();
    document.getElementById("canvasOutput").getContext("2d").clearRect(0, 0, this.state.videoWidth, this.state.videoHeight);
    this.video.pause();
    this.video.srcObject=null;
    this.state.stream.getVideoTracks()[0].stop();
    this.setState({
      streaming :false,
    })
    
  }
  opencvIsReady=()=> {
    console.log('OpenCV.js is ready');
    this.startCamera();
  }
  handleLHChange=(e)=>{
  	this.setState({
  		lh : parseInt(e.target.value)
  	})
  }
  handleLSChange=(e)=>{
  	this.setState({
  		ls : parseInt(e.target.value)
  	})
  }
  handleLVChange=(e)=>{
  	this.setState({
  		lv : parseInt(e.target.value)
  	})
  }
  
  handleHHChange=(e)=>{
    this.setState({
      hh : parseInt(e.target.value)
    })
  }
  handleHSChange=(e)=>{
    this.setState({
      hs : parseInt(e.target.value)
    })
  }
  handleHVChange=(e)=>{
    this.setState({
      hv : parseInt(e.target.value)
    })
  }
  handleUpsideDown=()=>{
    this.setState({
      upsideDownMode : !this.state.upsideDownMode
    })
  }
  render() {
  	
    return (
      <div className="App">
        <button  onClick={this.startCamera}>Start Video</button> 
        <button  onClick={this.stopCamera}>Stop Video</button>      
        <button  onClick={this.captureBackground}>Set Background</button>      
        <button  onClick={this.handleUpsideDown}>Upside down mode</button>      

         <div id="container">
            <h3>Fix your posture</h3>
            <div className="sliders">

              <input type="range" min={0} max={255} value={this.state.lh} onChange={this.handleLHChange}/>
             	<input type="range" min={0} max={255} value={this.state.ls} onChange={this.handleLSChange}/>
             	<input type="range" min={0} max={255} value={this.state.lv} onChange={this.handleLVChange}/>
              <input type="range" min={0} max={255} value={this.state.hh} onChange={this.handleHHChange}/>
              <input type="range" min={0} max={255} value={this.state.hs} onChange={this.handleHSChange}/>
              <input type="range" min={0} max={255} value={this.state.hv} onChange={this.handleHVChange}/>
            </div>
            <p>{this.state.backgroundTimer}</p>
            <video className="invisible" ref={ref => this.video = ref}></video>
            <canvas ref={ref => this.canvasOutput = ref}  className="center-block" id="canvasOutput" width={320} height={240}></canvas>
          </div>
        </div>
    );
  }
}

export default App;
