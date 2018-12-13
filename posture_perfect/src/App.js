import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import cv from 'opencv.js';
import * as tf from '@tensorflow/tfjs';

import * as posenet from '@tensorflow-models/posenet';
let scrollX = null;
let scrollY = null;
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
    lastEyeHeight : null,
    scrollX : null,
    scrollY : null,
  }
  componentDidMount=()=>{
    const targetSize = 20

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    posenet.load().then(data=>{
       this.setState({
          net : data
        })

    });
    console.log("mounted")
    setInterval(()=>{
      console.log("next loop")
      const y = Math.floor(Math.random() * window.innerHeight)

      const x =  Math.floor(Math.random() * window.innerWidth)
      console.log("x,y" , x,y)
      let domElement = document.getElementById("lookHere")
      domElement.style.position = "absolute";
      domElement.style.top = y-targetSize + "px"; //or whatever 
      domElement.style.left = x-targetSize + "px";
      console.log(domElement)
    }, 2000)
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

    if (!this.state.streaming) { console.warn("Please startup your webcam"); return; }
    
    this.stopVideoProcessing();
    let canvasOutputCtx = this.canvasOutput.getContext('2d');
    this.setState({
      canvasOutputCtx
    })
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
    cv.imshow("canvasOutput", this.state.srcMat);

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

        if(keypoint.part == "leftEye"){
          let currentEyeHeight = keypoint.position.y
           if(!this.state.lastEyeHeight){
              this.setState({
                  lastEyeHeight : currentEyeHeight
                })
            }
          const heightDiff = currentEyeHeight - this.state.lastEyeHeight
          if(heightDiff > 0){
            window.scrollBy(0, heightDiff*4 )
          }else{
            window.scrollBy(0, heightDiff*6 )
          }
           
           this.drawCrossBodyLines(canvasOutputCtx, keypointPositions)
           console.log("left eye", keypoint.position.x, keypoint.position.y )
        }
        
      })

    }
    this.drawGrid(canvasOutputCtx)

    var vidLength = 30 //seconds
    var fps = 24;
    var interval = 1000/fps;
    const delta = Date.now() - this.state.startTime;
    this.setState({
      savedStream : this.canvasOutput.captureStream(vidLength*fps),
    })
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

  render() {
    return (
      <div className="App" style={{position: "relative"}}>
        
        <div id="lookHere"></div>
        <div id="container">
            <h3>Fix your posture</h3>
            <video className="invisible" ref={ref => this.video = ref}></video>
            <canvas ref={ref => this.canvasOutput = ref}  className="center-block" id="canvasOutput" width={320} height={240}></canvas>
        </div>
      </div>
    );
  }
}

export default App;
