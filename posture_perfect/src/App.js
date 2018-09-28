import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import cv from 'opencv.js';
import * as tf from '@tensorflow/tfjs';

import * as posenet from '@tensorflow-models/posenet';
class App extends Component {

  state = {
    canvasInput : null,
    canvasInputCtx : null,
    canvasBuffer: null,
    canvasBufferCtx: null,
    canvasOutputCtx : null,
    bufferContext : null,
    numFrames : 0,
    src : null,
    dst : null,
    vc : null,
    stream : null,
    streaming : false,
    videoHeight : null,
    videoWidth : null,
    srcMat : null,
    grayMat : null,
    net : null,
    startTime : Date.now(),
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
    if (!this.state.streaming) { console.warn("Please startup your webcam"); return; }
    this.stopVideoProcessing();
    let canvasInput = document.createElement('canvas');
    canvasInput.width = this.state.videoWidth;
    canvasInput.height = this.state.videoHeight;  
    let canvasInputCtx = canvasInput.getContext('2d');
    
    let canvasBuffer = document.createElement('canvas');
    canvasBuffer.width = this.state.videoWidth;
    canvasBuffer.height = this.state.videoHeight;
    let canvasBufferCtx = canvasBuffer.getContext('2d');
    let canvasOutputCtx = this.canvasOutput.getContext('2d');
    this.setState({
      canvasInput,
      canvasInputCtx,
      canvasBuffer,
      canvasBufferCtx,
      canvasOutputCtx
    })
    let srcMat = new cv.Mat(this.state.videoHeight, this.state.videoWidth, cv.CV_8UC4);
    let grayMat = new cv.Mat(this.state.videoHeight, this.state.videoWidth, cv.CV_8UC1);
    this.setState({
      srcMat,
      grayMat
    })

    requestAnimationFrame(this.processVideo);
  }

  stopVideoProcessing = () =>{
    let src = this.state.src
    if (src != null && !src.isDeleted()) src.delete();

  }

  drawCrossBodyLines = (context,keypointPositions)=>{
    let connectParts = ["Ear","Hip","Shoulder"]
    connectParts.forEach((part)=>{
      if(keypointPositions["left"+part] && keypointPositions["right"+part] ){
        context.beginPath()
        context.moveTo(keypointPositions["left"+part].x,keypointPositions["left"+part].y)
        context.lineTo(keypointPositions["right"+part].x,keypointPositions["right"+part].y)
        context.stroke(); 
      }
    })
  }
  processVideo=()=> {
    
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
    let canvasInputCtx = this.state.canvasInputCtx
    let canvasOutputCtx = this.canvasOutput.getContext("2d")
    let videoWidth = this.state.videoWidth
    let videoHeight = this.state.videoHeight

    canvasInputCtx.drawImage(this.video, 0, 0, videoWidth, videoHeight);
    let imageData = canvasInputCtx.getImageData(0, 0, videoWidth, videoHeight);
    this.state.srcMat.data.set(imageData.data);

    cv.flip(this.state.srcMat, this.state.srcMat,1)
    cv.cvtColor(this.state.srcMat, this.state.grayMat, cv.COLOR_RGBA2GRAY);
    cv.threshold(this.state.grayMat, this.state.grayMat, 100, 200, cv.THRESH_BINARY);
    this.state.canvasOutputCtx.drawImage(this.state.canvasInput, 0, 0, videoWidth, videoHeight);
    let tempMat = new cv.Mat(this.state.videoHeight, this.state.videoWidth, cv.CV_8UC1);
    
    cv.flip(this.state.grayMat, tempMat,1)
    cv.imshow("canvasOutput", this.state.srcMat);
    canvasOutputCtx.lineWidth = 6;
    canvasOutputCtx.strokeStyle = 'rgba(0,255,0,0.5)';
    canvasOutputCtx.strokeRect(Math.floor(videoWidth/2), 0, 15, videoHeight);
    let keypointPositions = {}
    if(this.state.pose){
      let boxSize = 15
      this.state.pose.keypoints.forEach((keypoint,index)=>{
        if(keypoint.score > .35){

          keypointPositions[keypoint.part] = keypoint.position

          canvasOutputCtx.strokeRect(keypoint.position.x - boxSize/2 , keypoint.position.y - boxSize/2, boxSize, boxSize);
        }
      })

      this.drawCrossBodyLines(canvasOutputCtx, keypointPositions)
    }

    /*cv.subtract(tempMat, this.state.grayMat, tempMat)
    let canvasAsymCtx = this.canvasASym.getContext("2d")
    
    cv.imshow("canvasAsym", tempMat);
    canvasAsymCtx.lineWidth = 6;
    canvasAsymCtx.strokeStyle = 'rgba(0,255,0,0.5)';
    canvasAsymCtx.strokeRect(Math.floor(videoWidth/2), 0, 15, videoHeight);*/
    var fps = 24;
    var interval = 1000/fps;
    const delta = Date.now() - this.state.startTime;;
      
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
    this.state.canvasOutputCtx.drawImage(
      this.state.canvasInput, 0, 0, 
      this.state.videoWidth, this.state.videoHeight
    );
    
  }
  opencvIsReady=()=> {
    console.log('OpenCV.js is ready');
    this.startCamera();
  }
  render() {
    
    
    // schedule first one.
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <button  onClick={this.startCamera}>Start Video</button>

        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
       
         <div id="container">
            <h3>OUTPUT</h3>
            <video className="invisible" ref={ref => this.video = ref}></video>

            <canvas ref={ref => this.canvasOutput = ref}  className="center-block" id="canvasOutput" width={320} height={240}></canvas>
            ASYM
            <canvas ref={ref => this.canvasASym = ref}  className="center-block" id="canvasAsym" width={320} height={240}></canvas>

          </div>
          <div className="invisible">
            <video id="video" className="hidden">Your browser does not support the video tag.</video>
          </div>
        </div>
    );
  }
}

export default App;
