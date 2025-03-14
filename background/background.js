var currentlyRunningProcess = null;
var translationInfo = null;
//global to the current translation window
var translationWindow = null;
//Boolean if user is using free translation list
var isUsingFreeTranslationList = false;
//A string that stores the html of the popup translation window
var translationWindowHTML = null;
//When translation window first open what dims should it have
const TRANSLATION_WINDOW_DEFAULT_DIMS = [600,600];
//Stores the position and the size of the translation popup window
var translationWindowPosX;
var translationWindowPosY;
var translationWindowSizeX = TRANSLATION_WINDOW_DEFAULT_DIMS[0];
var translationWindowSizeY = TRANSLATION_WINDOW_DEFAULT_DIMS[1];
//List of the names of all free translation list files
const INCOMPLETE_TRANSLATION_LIST_FILE_NAMES = [
  "EnglishRussianTranslations_Incomplete.json"
];
//The max number of elements sent in a single transfer
const WORD_SENDING_BLOCK_SIZE = 5000;
//Holds the list of the users known words
var knownWordList = [];
//Holds the list of the users learning words
var learningWordList = [];


function RemoveItemOnce(arr, value) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}
function ActionMessage(request, sender, sendResponse){
  SendMessageToContentScript(request);
}
function LoadKnownAndLearningWords(){
  chrome.storage.sync.get({
    learningWordList: [],
    knownWordList: []
  }, function(result) {
    knownWordList = result.knownWordList;
    learningWordList = result.learningWordList;
  });
}
async function LoadTranslationWindowHTML(){
  let link = chrome.runtime.getURL("translationWindow/translationWindow.html");
  const response = await fetch(link);
  let text = await response.text();
  return text;
}
async function LoadTranslations(fileName, sendResponse){
  //Checks if user is using free translation list and sets bool acordingly
  isUsingFreeTranslationList = false;
  for(let i of INCOMPLETE_TRANSLATION_LIST_FILE_NAMES){
    if(fileName == i){
      isUsingFreeTranslationList = true;
      break;
    }
  }
  let filePath = "LanguageData/"+fileName
  let link = chrome.runtime.getURL(filePath);
  let response = undefined;
  let succ = true;
  try{
    response = await fetch(link);
  }
  catch(e){
    console.error("Failed to load file ", filePath, " link is ", link);    
    succ = false;
  }  
  if(response !== undefined){
    let content = await response.text();
    translationInfo = JSON.parse(content);
  }
  sendResponse({type: "LoadingTranslationDataSucc", status: succ});
}
function SendMessageToContentScript(message, onReciveFunc=undefined) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, message, response => {
        if(onReciveFunc !== undefined){
          onReciveFunc(response);
        }
      });
    }
  });
}
async function SendLargeArrayToContentScript(messageTypeName, arrayToSend){
  let start = 0;
  let end;
  do{
    end = start + Math.min(WORD_SENDING_BLOCK_SIZE, arrayToSend.length - start);
    let listToSend = arrayToSend.slice(start, end);
    SendMessageToContentScript({type: messageTypeName, listSection: listToSend});
    start = end;
  }while(end != arrayToSend.length);  
}
//When the translation window has been closed and might need to change
//thes status of a word
function HandleWordStatusChange(word, wordStatus){
  let index;
  switch(wordStatus){
    case "known":
      index = knownWordList.indexOf(word);
      if(index == -1){//needs to be added to word List
        knownWordList.push(word);
      }
      index = learningWordList.indexOf(word);
      if(index != -1){
        learningWordList.splice(index, 1);
      }
      break;
    case "learning":
      index = learningWordList.indexOf(word);
      if(index == -1){//needs to be added to learinging List
        learningWordList.push(word);
      }
      index = knownWordList.indexOf(word);
      if(index != -1){
        knownWordList.splice(index, 1);
      }
      break;
    case "unknown":
      knownWordList = RemoveItemOnce(knownWordList, word);
      learningWordList = RemoveItemOnce(learningWordList, word);
      break;
    default:
      console.error("Invalid word Status when handling word status change");
  }
  chrome.storage.sync.set({
    learningWordList: learningWordList,
    knownWordList: knownWordList
  }, function() {
    console.log("Updated word lists word " + word + "  ,  " + wordStatus);
  });
}
function GetTranslation(wordName){
  for(let i = 0; i < translationInfo.length; i++){
    if(translationInfo[i].targetLangWord === wordName){
      return [translationInfo[i].description, translationInfo[i].transWords];
    }
  }
  return ["No Translation of \""+wordName+"\" found. :(", "..."];
}
function UpdateStatusOfWord(targetWord, prevStatus, newStatus){

}
async function DisplayTranslationWindow(targetWord, wordStatus){
  //If window allready open then close it
  if(translationWindow !== null){

  }
  //Load Translation window if not allready loaded
  if(translationWindowHTML === null){
    translationWindowHTML = await LoadTranslationWindowHTML();
  }  
  //Write data into the translation window
  let [translationParagraph, translationShort] = GetTranslation(targetWord);
  let translationWindowHTML_withData = translationWindowHTML
    + "\t\t<p id=\"targetLangWord\" hidden>"+targetWord+"</p>\n"
    + "\t\t<p id=\"oldWordStatus\" hidden>"+wordStatus+"</p>\n"
    + "\t\t<p id=\"translationParagraph\" hidden>"+translationParagraph+"</p>\n"
    + "\t\t<p id=\"translationShort\" hidden>"+translationShort+"</p>\n"
    + "\t\t<p id=\"isUsingFreeTranslationList\" hidden>"+isUsingFreeTranslationList.toString()+"</p>\n"
    + "\t</body>\n"
  ;
  //Create the popup window
  chrome.windows.create({
    url: chrome.runtime.getURL("translationWindow/translationWindow.html"),//"data:text/html,<html>"+translationWindowHTML_withData+"</html>"
    type: "popup",
    focused: true,
    width: translationWindowSizeX,
    height: translationWindowSizeY,
    left: translationWindowPosX,
    top: translationWindowPosY
  }, function(newWindow) {
    translationWindow = newWindow;   
    //attach listener for when windows bounds change
    chrome.windows.onBoundsChanged.addListener(function(win) {
      chrome.windows.get(win.id, function(updatedWin) {
        translationWindowPosX = updatedWin.left;
        translationWindowPosY = updatedWin.top;
        translationWindowSizeX = updatedWin.width;
        translationWindowSizeY = updatedWin.height;
      });
    }); 
    //attach listen for when window is closed.  
    chrome.windows.onRemoved.addListener(function (windowId) {
      if (windowId === translationWindow.id) {
        SendMessageToContentScript({
          type: "GetNewWordStatus"
        }, function(response){
          UpdateStatusOfWord(response.targetWord, response.prevWordStatus, response.newWordStatus);
        })
        translationWindow = null;
      }
    }); 
  });
}
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch(request.type){
      case "LoadTranslationData":
        LoadTranslations(request.fileName, sendResponse);      
        break;
      case "WordStatusChange":
        HandleWordStatusChange(request.word, request.wordStatus);
        break;
      case "GetSessionTag":
        sendResponse({sessionTag:sessionTag});
        break;
      case "IsYoutubeIntervalRunning":
        sendResponse({data: youtubeIntervalRunning});
        break;
      case "CancleYoutubeRoutine":
        currentlyRunningProcess = null;
        SendMessageToContentScript({type: "CancleRoutine"});
        break;
      case "WordClickEvent":
        //HandleWordClickEvent(request.targetWord);
        DisplayTranslationWindow(request.targetWord, request.wordStatus);
        break;
      case "StartUpdatePage":
      case "StartUpdatePageRoutine":
      case "StartYoutubeRoutine":
        if(request.type == "StartUpdatePage"){
          currentlyRunningProcess = "updatePageRoutine";
        }
        else{
          if(request.type == "StartUpdatePageRoutine"){
            currentlyRunningProcess = "updatePageRoutine";
          }
          else{
            currentlyRunningProcess = "youtubeRoutine";
          }
        }
        SendMessageToContentScript({type: "HasTranslationInfo"}, async function(response){
          if(response.answer == false){//send translation info
            await SendLargeArrayToContentScript("SendTranslationInfoSection", translationInfo);
          }
          SendMessageToContentScript({type: "HasKnownWordList"}, async function(response){
            if(response.answer == false){//send both known word list and learning word list
              await SendLargeArrayToContentScript("SendKnownListSection", knownWordList);
              await SendLargeArrayToContentScript("SendLearningListSection", learningWordList);
            }
            SendMessageToContentScript({
              type: "SendTranslationWindowHTML",
              translationWindowHTML: await LoadTranslationWindowHTML()
            });
            SendMessageToContentScript({
              type: "IsFreeTranslationList",
              isUsingFreeTranslationList: isUsingFreeTranslationList
            });
            ActionMessage(request, sender, sendResponse);
          });
        });   
        break;
      default:
        console.error("Invalid type -> ", request.type);
    }
    //return false;
    return true;
});

LoadKnownAndLearningWords();