var currentlyRunningProcess = null;
//List of objects wich stores a list of all the translations
var translationInfo = null;
//A list of names of the words in translation info for word searching
var translationTargetWordNameList = null;
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
//Threshold for which a word has to pass to be considerd as similer if exact translation cant be found
const SEARCH_THREAHOLD = 5;
//Holds the list of the users known words
var knownWordList = [];
//Holds the list of the users learning words
var learningWordList = [];
//Stores the info for currently clicked word so to send to translation window
var currentlyClickedWord = {
  targetLangWord: "",
  isUsingFreeTranslationList: "",
  oldWordStatus: "",
  translationParagraph: "",
  translationShort: "",
  isExactWord: true,
  approximationWord: undefined
};
//Stores the tab id of the last content script tab
//Done because not active when translation window is sending to background script so need to store id
var contentScriptTabId = null;


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
  console.log("Loading translation of file ", fileName)
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
    //Compiles a list of names of the target lang words
    translationTargetWordNameList = [];
    for(let i of translationInfo){
      translationTargetWordNameList.push(i.targetLangWord);
    }
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
//-1 if above threshold else returns the total cost (higher is worse)
function CompareStrings(string1, string2, threshold){
  const WRONG_LETTER_COST = 3.0;
  const TOO_SHORT_COST = 1.0;
  const OVERWEIGHT_FRONT = 0.2;
  let minWordLength = Math.min(string1.length, string2.length);
  let maxWordLength = Math.max(string1.length, string2.length);
  let totalCost = 0;
  for(let i = 0; i < minWordLength; i++){
    if(string1[i] != string2[i]){
      totalCost += WRONG_LETTER_COST * OVERWEIGHT_FRONT * (maxWordLength - i);
      if(totalCost > threshold){
        return -1;
      }
    }
  }
  let differenceInLength = Math.abs(string1.length - string2.length);
  totalCost += differenceInLength * TOO_SHORT_COST;
  if(totalCost <= threshold){
    return totalCost;
  }
  return -1;
}
//seach string is the string being compared against
//string list is the list of all strings which to be found closest
//threshold is the minimum amount of closness to even be considerd
function GetClosestString(searchString, stringList, threshold){
  let indexList = [];
  for(let i = 0; i < stringList.length; i++){
    let totalCost = CompareStrings(searchString, stringList[i], threshold);
    if(totalCost != -1){
      indexList.push({
        totalCost: totalCost,
        index: i
      });
    }
  }
  if(indexList.length !== 0){
    let minTotalCost = indexList[0].totalCost;
    let indexOfMin = 0;
    for(let i = 1; i < indexList.length; i++){
      if(indexList[i].totalCost < minTotalCost){
        minTotalCost = indexList[i].totalCost;
        indexOfMin = i;
      }
    }
    return indexList[indexOfMin].index;
  }
  return undefined;
}
function GetTranslation(wordName){
  if(translationInfo == null){
    console.error("Translation info is not set");
  }
  for(let i = 0; i < translationInfo.length; i++){
    if(translationInfo[i].targetLangWord === wordName){
      return {
        paragraph: translationInfo[i].description,
        short: translationInfo[i].transWords,
        isExactWord: true,
        approxAsWord: undefined
      };
    }
  }
  let closestWordIndex = GetClosestString(wordName, translationTargetWordNameList, SEARCH_THREAHOLD);
  if(closestWordIndex !== undefined){
    return {
      paragraph: translationInfo[closestWordIndex].description,
      short: translationInfo[closestWordIndex].transWords,
      isExactWord: false,
      approxAsWord: translationInfo[closestWordIndex].targetLangWord
    }
  }
  return {
    paragraph: "No Translation of \""+wordName+"\" found. :(",
    short: "...",
    isExactWord: true,
    approxAsWord: undefined
  };  
}
function UpdateStatusOfWord(targetWord, prevStatus, newStatus){
  let index;
  switch(newStatus){
    case "known":
      index = knownWordList.indexOf(targetWord);
      if(index == -1){//needs to be added to word List
        knownWordList.push(targetWord);
      }
      index = learningWordList.indexOf(targetWord);
      if(index != -1){
        learningWordList.splice(index, 1);
      }
      break;
    case "learning":
      index = learningWordList.indexOf(targetWord);
      if(index == -1){//needs to be added to learinging List
        learningWordList.push(targetWord);
      }
      index = knownWordList.indexOf(targetWord);
      if(index != -1){
        knownWordList.splice(index, 1);
      }
      break;
    case "unknown":
      knownWordList = RemoveItemOnce(knownWordList, targetWord);
      learningWordList = RemoveItemOnce(learningWordList, targetWord);
      break;
    default:
      console.error("Invalid word Status when handling word status change -> ", newStatus);
  }
  chrome.storage.sync.set({
    learningWordList: learningWordList,
    knownWordList: knownWordList
  }, function() {
    console.log("Updated word lists word " + targetWord + "  ,  " + newStatus);
  });
}
async function DisplayTranslationWindow(targetWord, wordStatus){
  //If window allready open then close it
  if(translationWindow !== null){
    chrome.windows.remove(translationWindow.id);
  }
  //Load Translation window if not allready loaded
  if(translationWindowHTML === null){
    translationWindowHTML = await LoadTranslationWindowHTML();
  }  
  //Write data into the translation window
  let translationObject = GetTranslation(targetWord);
  let translationParagraph = translationObject.paragraph;
  let translationShort = translationObject.short;
  let isExectWord = translationObject.isExactWord;
  let approximationWord = translationObject.approxAsWord;
  //Set the current word infomation into global varaible
  currentlyClickedWord.targetLangWord = targetWord;
  currentlyClickedWord.translationParagraph = translationParagraph;
  currentlyClickedWord.translationShort = translationShort;
  currentlyClickedWord.oldWordStatus = wordStatus;
  currentlyClickedWord.isUsingFreeTranslationList = isUsingFreeTranslationList;
  currentlyClickedWord.isExactWord = isExectWord;
  currentlyClickedWord.approximationWord = approximationWord;
  //Create the popup window
  chrome.windows.create({
    url: chrome.runtime.getURL("translationWindow/translationWindow.html"),
    type: "popup",
    focused: true,
    width: translationWindowSizeX,
    height: translationWindowSizeY,
    left: translationWindowPosX,
    top: translationWindowPosY
  }, function(newWindow) {
    translationWindow = newWindow;   
    //Attach listener for when windows bounds change
    chrome.windows.onBoundsChanged.addListener(function(win) {
      chrome.windows.get(win.id, function(updatedWin) {
        translationWindowPosX = updatedWin.left;
        translationWindowPosY = updatedWin.top;
        translationWindowSizeX = updatedWin.width;
        translationWindowSizeY = updatedWin.height;
      });
    }); 
  });
}
function SetContentScriptTabId(){
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      contentScriptTabId = tabs[0].id;
    }
  });
}
function OpenStatsPage(){
  const statsPageUrl = chrome.runtime.getURL("statsPage/statsPage.html");
  //window.open(statsPageUrl, "");
  chrome.tabs.create({ url: statsPageUrl });
}
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) { 
    switch(request.type){
      case "LoadTranslationData":
        LoadTranslations(request.fileName, sendResponse);      
        break;
      case "IsYoutubeIntervalRunning":
        sendResponse({data: youtubeIntervalRunning});
        break;
      case "CancleYoutubeRoutine":
        currentlyRunningProcess = null;
        SendMessageToContentScript({type: "CancleRoutine"});
        break;
      case "WordClickEvent":
        SetContentScriptTabId();
        DisplayTranslationWindow(request.targetWord, request.wordStatus);
        break;
      case "GetInfoForTranslationWindow":
        sendResponse(currentlyClickedWord);
        break;
      case "SendingClosingTranslationWindowInfo":
        UpdateStatusOfWord(request.targetLangWord, request.oldWordStatus, request.newWordStatus);
        chrome.tabs.sendMessage(contentScriptTabId, {
            type: "UpdateWordColours",
            targetLangWord: request.targetLangWord,
            newWordStatus: request.newWordStatus
        }
        , (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError.message);
            } else {
                console.log("Response from content script:", response);
            }
        });
        break;
      case "GetKnownWordList":
        sendResponse({knownWordList: knownWordList});
        break;
      case "OpenStatsPage":
        OpenStatsPage();
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