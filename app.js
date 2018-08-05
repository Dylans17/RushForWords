"use strict";
//call libraries
const express = require('express');
const createGame = require('./createGame.js');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http,{pingInterval:3000});
//variables for app
const gameLength = 15;
const gameLengthDec = 0;
const gameLengthDecAcc = .1;
let givenLettersArray = [];
let validWordsArray = [];
let userCount = 0;
let rooms = {};
app.get('/',function(req, res){
  res.sendFile(__dirname + '/http/index.html');
});
app.use(express.static('http',{index:false,extensions:['html']}));
http.listen(8080,function(){
  console.log('Server started on port ' + 8080)
  setInterval(gameClock,1000)//start main loop once server has started
  setInterval(genGames,6000)//start making games once server has started
})
io.on('connection', function(socket){
  let userRoom = ''
  let userName = ''
  console.log('A user connected User Count:'+ ++userCount);
  socket.on('disconnect', function(){
    if (userRoom) {
      let index = rooms[userRoom].users.indexOf(userName);
      if (index > -1) {
        rooms[userRoom].users.splice(index, 4);
        if (rooms[userRoom].users.length == 0)
        delete rooms[userRoom]
      }
    }
    console.log((userName||'A user') + ' disconnected User Count:'+ --userCount);
  });
  socket.on('submitWord', function(msg){
    if (!userName || !userRoom) return;
    console.log(userRoom+":"+userName + ' - ' + msg);
    let index = rooms[userRoom].users.indexOf(userName);
    if (index > -1) {
      rooms[userRoom].users[index+1] += msg.length - 2 - (userName == 'Cassandra');
      rooms[userRoom].users[index+2].push(msg);
    }
    else {
      console.log(";Tried to get ID of non-existent user",userName);
    }
    socket.to(userRoom).emit('submitWord', msg);
    rooms[userRoom].time += Math.round(msg.length - (rooms[userRoom].timeDec+=gameLengthDecAcc));
  });
  socket.on('getRoomState',function(room,name,response){
    room = room.toUpperCase().replace(/[^A-Z ]/g, '');
    response(!!rooms[room])
  })
  socket.on('joinRoom',function(room,name,error){
    room = room.toUpperCase().replace(/[^A-Z ]/g, '').trim();
    name = name.replace(/[^A-Z a-z]/g, '').trim();
    if (userRoom) {
      socket.leave(userRoom);
      let index = rooms[userRoom].users.indexOf(userName);
      if (index > -1) {
        rooms[userRoom].users.splice(index, 4);
        if (rooms[userRoom].users.length == 0)
        delete rooms[userRoom]
      }
    }
    if (typeof rooms[room] == 'object'&&rooms[room].users.indexOf(name)>-1) {
      error('User Name is already taken in this room');
      return;
    }
    userRoom = room;
    userName = name;
    socket.join(room)
    if (!rooms[room]) {
      rooms[userRoom] = {};
      rooms[userRoom].users = [userName,0,[],false]; //Name,Score,Words Found,Is Ready
      rooms[userRoom].gameRunning = false;
      rooms[userRoom].validWords = [];
      rooms[userRoom].givenLetters = [];
      rooms[userRoom].time = gameLength;
      rooms[userRoom].timeDec = gameLengthDec;
      rooms[userRoom].delay = 0;
      rooms[userRoom].allReady = false;
      console.log(rooms)
    }
    else {
      rooms[userRoom].users.push(userName,0,[],false)
      rooms[userRoom].allReady = false;
      console.log(rooms)
      if (rooms[userRoom].gameRunning && rooms[userRoom].time < gameLength) {
        socket.emit('startGame',rooms[room].givenLetters,rooms[room].validWords);
        console.log(userName+' joined '+userRoom+' late.')
      }
    }
  })
  socket.on('leaveRooms',function(){
    if (userRoom) {
      socket.leave(userRoom);
      let index = rooms[userRoom].users.indexOf(userName);
      if (index > -1) {
        rooms[userRoom].users.splice(index, 4);
        if (rooms[userRoom].users.length == 0)
        delete rooms[userRoom]
      }
    }
    userRoom = '';
    userName = '';
  })
  socket.on('sendReady',function(ready){
    if (!userName || !userRoom) return;
    console.log(userName+': '+ !!ready);
    let index = rooms[userRoom].users.indexOf(userName);
    if (index > -1) {
      rooms[userRoom].users[index+3] = !!ready; //!! ensures that input is boolean
    }
    else {
      console.log(";Tried to get ID of non-existent user",userName);
    }
    rooms[userRoom].allReady = true
    for (let i = 0;i<rooms[userRoom].users.length;i+=4) {
      rooms[userRoom].allReady = rooms[userRoom].allReady && rooms[userRoom].users[i+3]
    }
    console.log("All Ready :" + rooms[userRoom].allReady)
    if (rooms[userRoom].allReady && !rooms[userRoom].gameRunning) {
      rooms[userRoom].delay = 5
      console.log('GAME STARTING IN ROOM '+userRoom);
      rooms[userRoom].gameRunning = false;
    }
  });
});
function gameClock() {
  if (!givenLettersArray) return//no point of working if there is no games to play. Also prevents a
                                // theoretical bug of sending nothing on game start if there is no games.
  for (let room in rooms) {
    if (!rooms[room].gameRunning && !rooms[room].allReady && rooms[room].delay > 0) {
      console.log("GAME NOT READY IN ROOM "+room);
      io.in(room).emit('delay',"Cancelled");
      rooms[room].gameRunning = false;
      rooms[room].delay = 0;
    }
   if (rooms[room].delay > 0 && !rooms[room].gameRunning && rooms[room].allReady) {
      io.in(room).emit('delay',rooms[room].delay--);
    }
    else if (rooms[room].delay == 0 && !rooms[room].gameRunning && rooms[room].allReady) {
      console.log('Game Start')
      io.in(room).emit('startGame',rooms[room].givenLetters = givenLettersArray.pop(),rooms[room].validWords = validWordsArray.pop());
      rooms[room].time = gameLength - 1;
      rooms[room].timeDec = gameLengthDec;
      rooms[room].gameRunning = true;
    }
    else if (rooms[room].time > 0 && rooms[room].gameRunning) {
      io.in(room).emit('time',rooms[room].time--);
    }
    else if (rooms[room].time == 0 && rooms[room].gameRunning && rooms[room].delay == 0){
      io.in(room).emit('time',rooms[room].time--);
      console.log("GAME OVER");
      for (let i = 0;i<rooms[room].users.length;i+=4) {
        console.log(room+':'+rooms[room].users[i]+": "+rooms[room].users[i+1] + "   " +rooms[room].users[i+2].length+" words")
        rooms[room].users[i+1] = 0
        rooms[room].users[i+2] = []
        rooms[room].users[i+3] = false;
      }
      rooms[room].allReady = false;
      rooms[room].time = gameLength;
      rooms[room].gameRunning = false;
    }
  }
}
function genGames() {
  if (userCount == 0)
    createGame.create(addtoArray) //if everyone is offline, generate games
  else if (givenLettersArray.length < Math.max(Object.keys(rooms).length * 3,10))
    createGame.quick(addtoArray) //We need more games than rooms and extras just in case
}
function addtoArray(givenLetters,validWords) {
  givenLettersArray.push(givenLetters)
  validWordsArray.push(validWords)
  console.log(givenLettersArray.length,validWordsArray.length)
}
