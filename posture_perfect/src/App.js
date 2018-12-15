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
    collectingData : false,
    targetX : null,
    targetY : null,
    targetData : [],
    numLoops : 0,
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
        this.startCamera();
    });
    console.log("mounted")
    
    const totalTime = 2000
    const waitTime = 1500
    const collectTime = 500
    setInterval(()=>{
      const y = Math.floor(Math.random() * (window.innerHeight-targetSize))

      const x =  Math.floor(Math.random() * (window.innerWidth-targetSize))
      let domElement = document.getElementById("lookHere")
      domElement.style.position = "absolute";
      domElement.style.top = y + "px"; //or whatever 
      domElement.style.left = x + "px";
      //console.log(x,y, window.innerHeight)
      setTimeout(()=>{
        this.setState({
          numLoops : this.state.numLoops + 1
        })
        document.getElementById("text").innerHTML = "collecting"
        this.setState({
          collectingData : true,
          targetX : x+targetSize/2,
          targetY : y+targetSize/2,
        })
        setTimeout(()=>{
          document.getElementById("text").innerHTML = "waiting"
          this.setState({
            collectingData : false,
          })
        }, collectTime)
      }, waitTime)
    }, totalTime)
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
        //that.canvasOutput.width = videoWidth;
        //that.canvasOutput.height = videoHeight;
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
  
  processVideo=()=> {
    let videoWidth = this.state.videoWidth
    let videoHeight = this.state.videoHeight
    
    //console.log(this.state.numLoops)
    if(this.state.net){
      var imageScaleFactor = 0.5;
      var outputStride = 16;
      var flipHorizontal = true;
        this.state.net.estimateSinglePose(this.video,imageScaleFactor, flipHorizontal, outputStride).then(pose=>{
          this.setState({
            pose
          })
          if(this.state.collectingData){
            this.state.targetData.push([
              pose.keypoints[0].position.x,
              pose.keypoints[0].position.y,
              pose.keypoints[1].position.x,
              pose.keypoints[1].position.y,
              pose.keypoints[2].position.x,
              pose.keypoints[2].position.y,
              pose.keypoints[3].position.x,
              pose.keypoints[3].position.y,
              pose.keypoints[4].position.x,
              pose.keypoints[4].position.y,
              this.state.targetX,
              this.state.targetY
            ])
            if(this.state.numLoops % 5 == 0 ){
              console.log(this.state.numLoops)
              console.log(this.state.targetData)
            }
          }
        });
    }
    
   

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
//            <canvas ref={ref => this.canvasOutput = ref}  className="center-block" id="canvasOutput" width={320} height={240}></canvas>

  render() {
    return (
      <div className="App" style={{position: "relative"}}>
        
        <div id="lookHere"></div>
        <div id="container">
            <h3 id="text">Waiting</h3>
            <video style={{display: "none"}} className="invisible" ref={ref => this.video = ref}></video>
        </div>
      </div>
    );
  }
}

export default App;
