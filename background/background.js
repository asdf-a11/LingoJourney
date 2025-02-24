//"matches": ["<all_urls>"],
//"tabs"
var currentlyRunningProcess = null;
var translationInfo = null;
//Boolean if user is using free translation list
var isUsingFreeTranslationList = false;
//List of the names of all free translation list files
const INCOMPLETE_TRANSLATION_LIST_FILE_NAMES = [
  "EnglishRussianTranslations_Incomplete.json"
];

//The max number of elements sent in a single transfer
const WORD_SENDING_BLOCK_SIZE = 5000;

var knownWordList = [];
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