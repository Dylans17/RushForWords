"use strict";
//netsh wlan start hostednetwork
//starts a local network that should share on 192.168.137.1

//call libraries
const express = require('express');
const fs = require('fs');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
let storage = require('node-persist');
//variables for app
const gameLength = 30;
let givenLettersArray = [];
let validWordsArray = [];
let currentGivenLetters = "";
let currentValidWords = [];
let userArray = [];
let gameRunning = false;
//global.userArray = userArray;
(async () => {
await storage.init()
givenLettersArray = await storage.getItem('letters')
validWordsArray = await storage.getItem('words')
console.log(givenLettersArray.length,validWordsArray.length);
})()
let Time = gameLength
let delay = 5
let delayTimeout = 0
let countdownTimeout = 0
let userCount = 0;
app.get('/',function(req, res){
  res.sendFile(__dirname + '/http/index.html');
});
app.use(express.static('http',{index:false,extensions:['html']}));
http.listen(8080,function(){
  console.log('Server started on port ' + 8080)
})
io.on('connection', function(socket){
  console.log(socket.handshake.query.name + ' connected User Count:'+ ++userCount);
  userArray.push(socket.handshake.query.name,0,[],false)
  socket.on('disconnect', function(){
    let index = userArray.indexOf(socket.handshake.query.name);
    if (index > -1) {
      userArray.splice(index, 4);
  }
    console.log(socket.handshake.query.name + ' disconnected User Count:'+ --userCount);
  });
  socket.on('submitWord', function(msg){
    console.log(socket.handshake.query.name + ': ' + msg);
    let index = userArray.indexOf(socket.handshake.query.name);
    if (index > -1) {
      userArray[index+1] += msg.length - 2 - (socket.handshake.query.name == 'Cassandra');
      userArray[index+2].push(msg);
    }
    else {
      console.log(";Tried to get ID of non-existent user",userArray,socket.handshake.query.name);
    }
    socket.broadcast.emit('submitWord', msg);
    Time += msg.length - 2;
  });
  socket.on('wordsGenerated',function(givenLetters,validWords){
    addtoArray(givenLetters,validWords);
  });
  socket.on('sendReady',function(ready){
    console.log(socket.handshake.query.name+': '+ !!ready);
    let index = userArray.indexOf(socket.handshake.query.name);
    if (index > -1) {
      userArray[index+3] = !!ready; //!! ensures that input is boolean
    }
    else {
      console.log(";Tried to get ID of non-existent user",userArray,socket.handshake.query.name);
    }
    let allReady = true
    for (let i = 0;i<userArray.length;i+=4) {
      allReady = allReady && userArray[i+3]
    }
    console.log("All Ready :" + allReady)
    if (allReady) {
      delay = 5
      startGame()
    }
    else if (!gameRunning){
      clearTimeout(delayTimeout)
      clearTimeout(countdownTimeout)
      console.log("GAME NOT READY");
      io.emit('delay',"Cancelled");
    }
  });
});
function startGame() {
  console.log('GAME STARTING');
  countdownTimeout = setTimeout(function() {
    io.emit('startGame',currentGivenLetters = givenLettersArray.pop(),currentValidWords = validWordsArray.pop());
    updateStorage();
    gameRunning = true
    Time = gameLength;
    clearTimeout(countdownTimeout)
    countdown()
  },5000)
  delayTimer()
}
function delayTimer() {
  if (delay > 0) {
    delayTimeout = setTimeout(delayTimer,1000);
    io.emit('delay',delay--);
  }
}
function countdown() {
  if (Time > 0) {
    countdownTimeout = setTimeout(countdown,1000);
    io.emit('time',Time--);
  }
  else {
    io.emit('time',Time--);
    Time = gameLength;
    console.log("GAME OVER");
    for (let i = 0;i<userArray.length;i+=4) {
      console.log(userArray[i]+": "+userArray[i+1] + "   " +userArray[i+2].length+" words")
      userArray[i+1] = 0
      userArray[i+2] = []
      userArray[i+3] = false;
      gameRunning = false;
    }
  }
}
function ding() {
  setTimeout(ding,2000)
  io.emit('ding')
}
ding()
function addtoArray(givenLetters,validWords) {
  givenLettersArray.push(givenLetters)
  validWordsArray.push(validWords)
  updateStorage()
}
async function updateStorage () {
  if (givenLettersArray.length == validWordsArray.length) {
    console.log("Array length: "+givenLettersArray.length)
    await storage.setItem('letters',givenLettersArray)
    await storage.setItem('words',validWordsArray)
  }
  else {
    console.log("givenLetters and validWords arrays have different lengths")
    let minLength = Math.min(givenLettersArray.length,validWordsArray.length)
    givenLettersArray.splice(minLength);
    validWordsArray.splice(minLength);
    updateStorage();
  }
}
