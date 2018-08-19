"use strict";
let validWords = [];
let foundWords = [];
let wordsIfound = [];
let givenLetters = "";
let givenLettersReady = "";
let activeLetter = 0;
let activeLetters = "";
let activeLettersIndex = '';
let score = 0;
let delay = 0;
let time = 0;
let timeDec = 0;
const timeDecAcc = 0.1;
let ready = false;
let multiplayer = true;
let room = "";
function startGame() {
  ready = false;
  delay = 0;
  time = 45;
  timeDec = 0;
  foundWords = [];
  wordsIfound = [];
  activeLetter = 0;
  activeLetters = "";
  activeLettersIndex = "";
  score = 0;
  if (!multiplayer) {
    givenLetters = givenLettersReady;
    givenLettersReady = '';
    setTimeout(gameLoop,1000)
  }
  document.getElementById('score').innerHTML = score;
  document.getElementById("wordsIfoundList").innerHTML = "";
  populateLetters(" ");
  endGameButtons(false);
  addClickEvents();
}
function getWords(sentWords,letters,words) {
  if (sentWords) {
    validWords = words
    givenLettersReady = letters
    delay = 5
    countdown()
  }
  else {
    populateLetters("CREATING")
    endGameButtons(true)
    genWordsWorker()
  }
}
function gameLoop() {
  if (time>0) {
    setTimeout(gameLoop,1000)
    document.getElementById('time').innerHTML = Math.floor(--time/60) + ":" + ("0" + (time % 60)).slice(-2);
  }
  else
    gameOver()
}
function countdown() {
  populateLetters("12345".substr(0,delay--))
  endGameButtons(false)
  if (delay >= 0) {
    setTimeout(countdown,1000);
  }
  else {
    startGame();
  }
}
function genWordsWorker() {
  if (window.Worker) {
    alert('Please wait till a future update for offline singleplayer.')
  }
  else {
    alert('Your browser is out of date and cannot create a game.')
  }
}
function sort(array) {
    array.sort(function(a, b) {
        return a.length - b.length || a.localeCompare(b)
    })
}
function populateLetters(resetOld) {
    for (let i = 0;i<10;i++) {
        document.getElementById("letter" + i).innerText = givenLetters.charAt(i).toUpperCase()
    }
    if (resetOld) {
        for (let i = 0;i<10;i++) {
            document.getElementById("spot" + i).innerText = resetOld.charAt(i)
        }
    }
}
function addClickEvents() {
    for (let i = 0;i<10;i++) {
        document.getElementById("letter" + i).addEventListener("click", placeLetter);
        document.getElementById("spot" + i).addEventListener("click", submitWord);
    }
}
function mixLetters(inputStr) {
    return inputStr.split('').sort(function(a, b) {
        return Math.random()>.5 ? -1 : 1;
    }).join('')
}
function placeLetter(e) {
  if (e.srcElement.innerText !== "") {
    activeLetters += e.srcElement.innerText.toLowerCase()
    activeLettersIndex += e.srcElement.id.charAt(6)
    document.getElementById("spot" + activeLetter++).innerText = e.srcElement.innerText
    e.srcElement.innerText = ""
    checkClass()
  }
  //parseInt(e.srcElement.id.charAt(6)) //Get Element ID
}
function checkClass() {
  if(validWords.indexOf(activeLetters)+1) {
    if(foundWords.indexOf(activeLetters)+1) {
      changeClass("used");
    }
    else {
      changeClass("correct");
    }
  }
  else {
    changeClass("wrong");
  }
}
function changeClass(newClass) {
    for (let i = 0;i<activeLetter;i++) {
        document.getElementById("spot" + i).className = "letter " + newClass;
    }
}
function submitWord(e,char) {
  if (activeLetters == "") {
    givenLetters = mixLetters(givenLetters);
    populateLetters();
    return
  }
  else if (activeLetter <= e.srcElement.id.charAt(4)) {
    if(validWords.indexOf(activeLetters)+1 && !(foundWords.indexOf(activeLetters)+1)) {
      foundWords.push(activeLetters);
      wordsIfound.push(activeLetters);
      if (multiplayer)
        socket.emit('submitWord',activeLetters)
      else {
        time += Math.round(activeLetters.length - (timeDec+=timeDecAcc));
      }
      score += activeLetters.length - 2 - (name == 'Cassandra')
      document.getElementById('score').innerHTML = score
    }
    populateLetters(" ");
    changeClass("blank");
    activeLetter = 0;
    activeLetters = "";
    activeLettersIndex = "";
    return;
  }
  else {
    const missingLetter = e.srcElement.id.charAt(4)
    const missingLetterOrigin = activeLettersIndex.charAt(missingLetter)
    e.srcElement.innerHTML=""
    document.getElementById("letter" + missingLetterOrigin).innerHTML = activeLetters.charAt(missingLetter).toUpperCase();
    activeLetters = activeLetters.slice(0, missingLetter) + activeLetters.slice(parseInt(missingLetter)+1);
    activeLettersIndex = activeLettersIndex.slice(0, missingLetter) + activeLettersIndex.slice(parseInt(missingLetter)+1);
    for (let i = missingLetter;i<activeLetter;document.getElementById('spot' + i).innerHTML = activeLetters.charAt(i++).toUpperCase()){}
    document.getElementById("spot" + --activeLetter).className = "letter blank";
    checkClass();
  }
}
function gameOver() {
  changeClass("blank")
  populateLetters("GAMEOVER")
  if (score > highScore && multiplayer == false) {
    localStorage.setItem("High Score",score)
    document.getElementById("HighScore").innerHTML = "High Score: " + highScore;
  }
  for (let i = 0;i<10;i++) {
    document.getElementById("letter" + i).removeEventListener("click", placeLetter);
    document.getElementById("spot" + i).removeEventListener("click", submitWord);
  }
  endGameButtons(true)
  sort(wordsIfound);
  for (let i = 0;i<wordsIfound.length;i++) {
    document.getElementById("wordsIfoundList").innerHTML += "<li>" + wordsIfound[i] + "</li>"
  }
}
function toggleReady() {
  ready = !ready
  document.getElementById("spot" + 9).className = "letter " + (ready ? 'correct' : 'wrong');
  if (multiplayer)
    socket.emit('sendReady',ready)
  else {
    if (ready && socket.connected)
      socket.emit('requestWords',getWords)
    else if (ready && !socket.connected)
      genWordsWorker()
  }
}
function noPing() {
  document.getElementById('connection').style.color = "Red";
  document.getElementById('connection').innerHTML = "Disconnect";
}
function changescreen(screen) {
  document.getElementById("Screen0").style.display = (screen==0 ? 'block' : 'none');
  document.getElementById("Screen1").style.display = (screen==1 ? 'block' : 'none');
  document.getElementById("Screen2").style.display = (screen==2 ? 'block' : 'none');
  document.getElementById("Screen3").style.display = (screen==3 ? 'block' : 'none');
  if (screen == 3) {
    populateLetters("READY")
    endGameButtons(true)
  }
}
function endGameButtons(enable) {
  if (enable) {
    document.getElementById("spot9").className = "letter " + (ready ? 'correct' : 'wrong');
    document.getElementById("spot9").addEventListener("click", toggleReady);
    document.getElementById("spot8").addEventListener("click", homeScreen);
    document.getElementById("spot8").innerHTML = '<i class="fa fa-home"></i>'
    document.getElementById("spot9").innerHTML = "➠"
    document.getElementById("spot8").className = "letter used";
  }
  else {
    document.getElementById("spot8").className = "letter blank";
    document.getElementById("spot9").className = "letter blank";
    document.getElementById("spot9").removeEventListener("click", toggleReady);
    document.getElementById("spot8").removeEventListener("click", homeScreen);
  }
}
function homeScreen() {
  gameOver()
  if (multiplayer) {
    socket.emit('sendReady',true)
    socket.emit('leaveRooms')
  }
  changescreen(0)
}
function checkId(src) {
  name = document.getElementById("name").value.replace(/[^A-Z a-z]/g, '');
  document.getElementById("name").value = name;
  room = src.value.toUpperCase().replace(/[^A-Z ]/g, '').trim();
  src.value = room
  if(room && name) {
    socket.emit('getRoomState',room,name,function(response){
      document.getElementById('roomBtn').innerHTML = (response?'Join Room':'Create Room')
    })
  }
  else {
    document.getElementById('roomBtn').innerHTML = ""
  }
}
function joinRoom() {
  name = document.getElementById("name").value.replace(/[^A-Z a-z]/g, '').trim();
  document.getElementById("name").value = name;
  localStorage.setItem("username",name);
  socket.emit('joinRoom',room,name,function (error){document.getElementById('userNotMsg').className = "msgEnter";changescreen(2)})
  changescreen(3);
}
