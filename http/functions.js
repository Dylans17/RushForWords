"use strict";
let validWords = [];
let foundWords = [];
let wordsIfound = [];
let givenLetters = "";
let activeLetter = 0;
let activeLetters = "";
let activeLettersIndex = '';
let score = 0;
let ready = false;
let multiplayer = true;
function startGame() {
  foundWords = [];
  wordsIfound = [];
  activeLetter = 0;
  activeLetters = "";
  activeLettersIndex = "";
  score = 0;
  document.getElementById("spot" + 9).className = "letter blank";
  document.getElementById('score').innerHTML = score
  document.getElementById("wordsIfoundList").innerHTML = ""
  populateLetters(" ");
  document.getElementById("spot" + 9).removeEventListener("click", toggleReady);
  addClickEvents();
}
function detectWords() {
    validWords = [];
    for (let i = 0;i<wordList.length;i++) {
        let letterList = givenLetters
        for (let p = 0;p <= wordList[i].length;p++) {
            if (p == wordList[i].length) validWords.push(wordList[i]);
            let newList = letterList.replace(wordList[i].charAt(p),"");
            if (letterList == newList)break;
            letterList = newList
        }
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
  if (activeLetter <= e.srcElement.id.charAt(4)) {
    if(validWords.indexOf(activeLetters)+1 && !(foundWords.indexOf(activeLetters)+1)) {
      foundWords.push(activeLetters);
      wordsIfound.push(activeLetters);
      socket.emit('submitWord',activeLetters)
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
  populateLetters("GAME OVER➠")
  if (score > highScore) {
    localStorage.setItem("High Score",score)
  }
  for (let i = 0;i<10;i++) {
    document.getElementById("letter" + i).removeEventListener("click", placeLetter);
    document.getElementById("spot" + i).removeEventListener("click", submitWord);
  }
  ready = false;
  document.getElementById("spot" + 9).className = "letter wrong";
  document.getElementById("spot" + 9).addEventListener("click", toggleReady);
  sort(wordsIfound);
  for (let i = 0;i<wordsIfound.length;i++) {
    document.getElementById("wordsIfoundList").innerHTML += "<li>" + wordsIfound[i] + "</li>"
  }
}
function toggleReady() {
  ready = !ready
  document.getElementById("spot" + 9).className = "letter " + (ready ? 'correct' : 'wrong');
  socket.emit('sendReady',ready)
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
  if (screen == 3 && givenLetters == "") {
    ready = false;
    document.getElementById("spot" + 9).className = "letter wrong";
    document.getElementById("spot" + 9).innerHTML = "➠";
    document.getElementById("spot" + 9).addEventListener("click", toggleReady);
  }
}
document.body.addEventListener("keydown", test);
function test(e) {
  //console.log(e.key)
}
