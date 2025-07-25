//Stores the list of all known and learning words in a array
var knownWordList = undefined;
var learningWordList = undefined;
//How often the youtube subtitles are updated
const youtube_refreshRate = 500;//ms
//How often the entire page is updated
const updatePage_refreshRate = 1000;//ms
//Stores a handle to the youtube routine so it can be cancled
var routineId;
//A handle to the popup translation window
var popupWindow = undefined;
//Boolean if the user is using the free translation list
var isUsingFreeTranslationList = false;

//Stores the position and size of the popup translation window
var translationWindowPositionX = 20;
var translationWindowPositionY = 20;
var translationWindowSizeX = 400;
var translationWindowSizeY = 800;

//A list of all the translations words and their translations
var translationInfo = undefined;
//Stores a string for the html of the popup translation window
var translationWindowHTML = undefined;
//List of all word buttons, may contain buttons that have been deleted
//these buttons are removed if the id is not found when the updateColour function is called
var buttonIdList = [];
//Counter to make sure buttons have unique id (resets at 1000000)
let buttonIdCounter = 0;

//Remove one item from the array
function RemoveItemFromArray(arr, item){  
  let index = arr.indexOf(item);
  if (index > -1) {
    console.log(arr);
    arr.splice(index, 1);
  }
  return arr;
}
//
function AddIfNotAllreadyIn(arr, item){
  let index = arr.indexOf(item);
  if(index == -1){
    return arr.concat([item]);
  }
  return arr;
}
//Removes all the accents from a string
function RemoveAllAccents(string){
  let decomposedString = string.normalize("NFD");
  let allowedCharacters = [
    "й"
  ];
  for(const c of allowedCharacters){
    decomposedString = decomposedString.replace(c.normalize("NFD"), c.normalize("NFC"));
  }
  decomposedString = decomposedString.replace(/[\u0300-\u036f]/g, "");
  return decomposedString;
}
//Puts spaces either side of each character
//stops words contain punctuation
function ReplaceWithSpace(content){
  const repList = [
    "-",".",",","?","!", "[","]","&","#","@", "-", "_", "(", ")", "\"", "\'", ":", ";",
    "«", "»", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", 
    "\n", "\t",
    "\u00A0" // non-breaking space
  ];
  for(let i = 0; i < repList.length; i++){
    content = content.replaceAll(repList[i]," "+repList[i]+" ");
  }
  return content
}
//Takes a HTML collection of elements
//and converts to a normal array
function HTMLCollectionToJSArray(htmlCollection){
  let outList = [];
  for(let i = 0; i < htmlCollection.length; i++){
    outList.push(htmlCollection[i]);
  }
  return outList
}
//?
function GetDirectTextContent(element) {
  let textContent = '';
  element.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        textContent += node.textContent.trim() + " ";            
      }
  });
  return textContent;
}
//?
function RemoveTextNodes(element) {
  const childNodes = element.childNodes;
  for (let i = childNodes.length - 1; i >= 0; i--) {
    if (childNodes[i].nodeType === Node.TEXT_NODE) {
        element.removeChild(childNodes[i]);
    }
  }
}
//Returns a list of elements in which the words are to be
//replaced with buttons for translations
function GetElementsToEdit(argument){
  let textElements = [];
  const textTagNames = ["p", "div", "span", "li"];
  if(argument == "whole"){    
    for(let i in textTagNames){
      textElements = textElements.concat(HTMLCollectionToJSArray(document.getElementsByTagName(textTagNames[i])));
    }
  }
  if(argument == "youtube"){
    const youtubeCaptionClassName = "ytp-caption-segment";
    textElements = HTMLCollectionToJSArray(document.getElementsByClassName(youtubeCaptionClassName));
    /*
    Need a way to return wordifed text back to normal text when out of sight otherwise it woun't update colours when it comes back into view
    */
    /*
    for(let i in textTagNames){
      let arr = HTMLCollectionToJSArray(document.getElementsByTagName(textTagNames[i]));
      //Remove elements that are out of sight
      const testingBounds = 100;
      const screenX = window.innerWidth;
      const screenY = window.innerHeight;
      for(let j = arr.length-1; j > 0; j--){
        //rect.top, rect.right, rect.bottom, rect.left
        let rect = arr[j].getBoundingClientRect();
        let offScreen = rect.left + rect.width < testingBounds;
        offScreen ||= rect.left > testingBounds + screenX;
        offScreen ||= rect.top > testingBounds + screenY;
        offScreen ||= rect.top < testingBounds;
        if(offScreen){
          arr.splice(j,1);
        } 
      }
      //
      textElements = textElements.concat(arr);
    }
    */    
  }  
  return textElements;
}
//Takes the most important style settings and
//applies them to the new element
function ApplyStyleSettings(element, styleSettings){
  let settingsNameList = ["font-size", "font-weight", "font-color", "font-family", "fill", "color"]
  for(let i = 0; i < settingsNameList.length; i++){
    let settingName = settingsNameList[i];
    element.style[settingName] = styleSettings.getPropertyValue(settingName);
  }
}
//Returns which status a word has
function GetWordType(word){
  if(knownWordList.includes(word)){
    return "known";
  }
  if(learningWordList.includes(word)){
    return "learning";
  }
  return "unknown";
}
//Takes in the status of a word and returns
//the corrisponding colour for that status
function GetWordColour(wordType){
  switch(wordType){
    case "known":
      return "rgba(255, 200, 180, 0.0)";
    case "learning":
      return "rgba(255, 200, 180, 0.4)";
    case "unknown":
      return "rgba(210, 210, 255, 0.4)";
    default:
      console.error("Cannot get colour for a invalid word type");
  }  
}
function GetTranslation(wordName){
  for(let i = 0; i < translationInfo.length; i++){
    if(translationInfo[i].targetLangWord === wordName){
      return [translationInfo[i].description, translationInfo[i].transWords];
    }
  }
  return ["No Translation of \""+wordName+"\" found. :(", "..."];
}
//Check if word contains any numbers or punctuation
//returns true if it does not
function IsValidWord(word){
  let invalidList = ",<.>/?\'@;:]}[{=+-_)(*&^%$£\"1`¬\\|1234567890#~«»";
  for(let i of invalidList){
    if (word.indexOf(i) > -1){
      return false;
    }
  }
  return true;
}
//Takes a word and a the status of which that word is to be set
//Performs checking then removes from other status and adds to new status
function SetWordStatus(word, wordStatus){
  switch(wordStatus){
    case "known":
      learningWordList = learningWordList.filter(e => e !== word);
      knownWordList = AddIfNotAllreadyIn(knownWordList, word);
      break;
    case "learning":
      knownWordList = knownWordList.filter(e => e !== word);
      learningWordList = AddIfNotAllreadyIn(learningWordList, word);
      break;
    case "unknown":
      learningWordList = RemoveItemFromArray(learningWordList, word);
      knownWordList = RemoveItemFromArray(knownWordList, word);
      break;
    default:
      console.error("Invalid word status ("+wordStatus+") is invalid");
  }
}
//After a word has changed status needs to go over all words and update them
//because their word colour might need to change
function UpdateAllButtonColours(targetWord, typeName, buttonIdList){  
  let newColour = GetWordColour(typeName);
  for(let i = 0; i < buttonIdList.length; i++){   
    let e = document.getElementById(buttonIdList[i]);
    //Chance button could have been deleted after wordify therefore step over to stop crash
    if(e === null){ continue; }    
    let splitList = buttonIdList[i].split("-");
    let buttonsTargetWord = splitList[1];
    if(targetWord == buttonsTargetWord){
      e.style.backgroundColor = newColour;      
    }
  }
}
//Routine is called when another word is clicked and the current translation window
//is about to close
function CloseTranslationWindowRoutine(popupWindow, buttonIdList){  
  let windowPositionX = popupWindow.screenx || popupWindow.screenLeft;
  let windowPositionY = popupWindow.screeny || popupWindow.screenTop;
  translationWindowPositionX = Number(windowPositionX);
  translationWindowPositionY = Number(windowPositionY);
  translationWindowSizeX = Number(popupWindow.innerWidth);
  translationWindowSizeY = Number(popupWindow.innerHeight);
  let targetWord = popupWindow.document.getElementById("targetWordTitle").innerHTML;
  let newWordStatus = popupWindow.document.getElementById("wordStatus").innerHTML;
  //To set a word to unknown us "not known" as unknown is used to set to learning automatically
  if(newWordStatus == "unknown"){
    newWordStatus = "learning";
  }
  if(newWordStatus == "not known"){
    newWordStatus = "unknown";
  }
  if(IsValidWord(targetWord) || newWordStatus == "unknown"){
    SetWordStatus(targetWord, newWordStatus);
    SendMessageToBackground({
      type: "WordStatusChange",
      word: targetWord,
      wordStatus: newWordStatus
    });
    UpdateAllButtonColours(targetWord, newWordStatus, buttonIdList);
  }
  else{
    console.log("Word contains invlid characters therefore status is not being updated.");
  }
}
//Attach a routine to every button that handles when it is clicked
function AssignFunctionToButtons(buttonIdList){
  buttonIdList.forEach(id => {
    const button = document.getElementById(id);
    if(button !== null){//Check button has not been deleted
      button.addEventListener('click', function () {
        let splitList = button.id.split("-");
        let targetWord = splitList[1];     
        let wordStatus = splitList[2];   
        SendMessageToBackground({
          type: "WordClickEvent",
          targetWord: targetWord,
          wordStatus: wordStatus
        }); 
      });
    }
  });
}
//Sends a object back the background script
//And takes a optional function which is called when 
//a response is recived
function SendMessageToBackground(message, onResponseFunction){
  chrome.runtime.sendMessage(message, function(response) {
    if(onResponseFunction !== undefined){
      onResponseFunction(response);
    }
  });
}
//Remove all ids for buttons that no longer exist
function RemoveDeletedButtons(buttonIdList){
  for(let i = 0; i < buttonIdList.length;){
    let e = document.getElementById(buttonIdList[i]);
    if(e === null){
      buttonIdList.splice(i,1);
      continue;
    }
    i++;
  }
  return buttonIdList;
}
//Turns text on the webpage to buttons
//takes whether to do whole page or just youtube sutitles as a string
function Wordify(argument){
  const BUTTON_ID_STRING = "buttonIdString";
  //Gets list of all p, h1, h2 etc elements
  textElements = GetElementsToEdit(argument);
  let newButtons = [];
  for(let elementCounter in textElements){
    let currentElement = textElements[elementCounter];
    let currentElementStyle = window.getComputedStyle(currentElement);
    //Get text content of current element and not child elements
    let text = GetDirectTextContent(currentElement).toLowerCase();
    //All gramatical characters have spaces put round them
    text = ReplaceWithSpace(text);
    //Removes all the accents from the text
    text = RemoveAllAccents(text);
    const wordList = text.split(" ");
    //Remove original text to replace with buttons
    RemoveTextNodes(currentElement);
    //Loop over each word in the current element
    for(let i = 0; i < wordList.length; i++){
      if(wordList[i].length == 0){ continue; }
      let newButton = document.createElement('button');
      newButton.textContent = wordList[i];      
      let wordType = GetWordType(wordList[i]);
      let buttonIdString = BUTTON_ID_STRING+"-".concat(newButton.textContent)+"-".concat(wordType)+"-".concat(buttonIdCounter.toString());
      newButton.id = buttonIdString; 
      ApplyStyleSettings(newButton, currentElementStyle);        
      newButton.style.backgroundColor = GetWordColour(wordType);
      newButton.style.border = "none";
      newButton.style.padding = "1px 0.25em";
      newButton.style.textAlign= "center";
      newButton.style.margin= "0px 0px";
      newButton.style.cursor= "pointer";
      newButtons.push(newButton.id);
      currentElement.appendChild(newButton);
      buttonIdCounter++;
      //Stop id counting to rediculus numbers
      if(buttonIdCounter > 1000000){buttonIdCounter=0;}
    } 
  }
  //Attach click event to all new buttons
  AssignFunctionToButtons(newButtons);
  buttonIdList = RemoveDeletedButtons(buttonIdList);
  //Add new buttons to button list
  buttonIdList = buttonIdList.concat(newButtons);
}
//Updates whole page just once
function UpdatePage(argument="whole"){
  Wordify(argument);
}
//Set it to routinly update page
function SetRoutine(routineArgument){
  let refreshRate;
  switch(routineArgument){
    case "youtube":
      refreshRate = youtube_refreshRate;
      break;
    case "whole":
      refreshRate = updatePage_refreshRate;
      break;
    default:
      console.error("Invalid routine name");
  }
  routineId = setInterval(function(){UpdatePage(routineArgument);}, refreshRate);
}
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch(request.type){
    case "IsFreeTranslationList":
      isUsingFreeTranslationList = request.isUsingFreeTranslationList;
      break;
    //Background script is sending the translation window HTML
    case "SendTranslationWindowHTML":
      translationWindowHTML = request.translationWindowHTML;
      break;
    //Background script checking it has the translation window HTML
    case "HasTranslationInfo":
      sendResponse({answer: (translationInfo !== undefined)});
      break;
    //Check if it has the known and learning word list
    case "HasKnownWordList":
      sendResponse({answer: (knownWordList !== undefined)});
      break;
    //Sends a section of the known word list from the background script
    case "SendKnownListSection":
      if(knownWordList === undefined){
        knownWordList = [];
      }  
      knownWordList = knownWordList.concat(request.listSection);  
      break;
    //Sends a section of the learning list from the background script
    case "SendLearningListSection":
      if(learningWordList === undefined){
        learningWordList = [];
      }   
      learningWordList = learningWordList.concat(request.listSection);
      break;
    //Sends the translation list in chuncks
    case "SendTranslationInfoSection":
      if(translationInfo === undefined){
        translationInfo = [];
      }
      translationInfo = translationInfo.concat(request.listSection);   
      break;
    case "UpdateWordColours":
      SetWordStatus(request.targetLangWord, request.newWordStatus);
      UpdateAllButtonColours(request.targetLangWord, request.newWordStatus, buttonIdList);
      break;
    //Wordifies the page
    case "StartUpdatePage":
      UpdatePage();
      break;
    //Set a routine to wordify the page
    case "StartYoutubeRoutine":
      SetRoutine("youtube");
      break;
    //Stops any currently running routine
    case "CancleRoutine":
      if(routineId == undefined){
        console.error("Tried to cancle routine but the routine id was undefiend");
      }
      clearInterval(routineId);
      break;
  }
});