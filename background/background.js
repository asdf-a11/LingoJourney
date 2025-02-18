//var currentTab;
var definedWordListFlag = false;
//const youtubeRefreshRate = 2000;//ms
var sessionTag;
var language;
var stats;
//var youtubeIntervalRunning;
var currentlyRunningProcess = null;
var translationInfo = null;

const WORD_SENDING_BLOCK_SIZE = 5000;

var knownWordList = [];
var learningWordList = [];

/*
function WordListToArray(wordString){
  let lst = wordString.split("\n");
  return lst;
}
function DefineWordListRus_inject(code){
  window.rusWordList = code;
}
function DefineWordListEng_inject(code){
  window.engWordList = code;
}
function DefineWordLists(rusWordList, engWordList){
  chrome.scripting.executeScript({
    target : {tabId : currentTab.id, allFrames : true},
    func : DefineWordListRus_inject,
    args: [rusWordList],
    world: "MAIN"
  })
  chrome.scripting.executeScript({
    target : {tabId : currentTab.id, allFrames : true},
    func : DefineWordListEng_inject,
    args: [engWordList],
    world: "MAIN"
  })
}
function AttemptDefineWordList(rusWordList, engWordList){
  if(definedWordListFlag == false){
    DefineWordLists(rusWordList, engWordList);  
  }
  definedWordListFlag = true;
}
*/
function RemoveItemOnce(arr, value) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}
/*
function GetCurrentTab(ActionMessage_callback, request, sender, sendResponse){
  let queryOptions = { active: true, currentWindow: true};
  chrome.tabs.query(queryOptions, ([tab]) => {
    if (chrome.runtime.lastError){
      console.error(chrome.runtime.lastError);    
    }
    if(tab === undefined){
      console.error("tab is undefined");
    }
    currentTab = tab;
    ActionMessage_callback(request, sender, sendResponse);
  });
}
*/
function ActionMessage(request, sender, sendResponse){
  SendMessageToContentScript(request);
}
async function GetTranslationWebPage(word){
  const url = "https://lingojourney.net/w/Translate.php";
  const formData = new FormData();
  formData.append("randomKey", sessionTag);
  formData.append("translationTable", "EnglishRussianTranslations");
  formData.append("toTranslateWord", word);
  const response = await fetch(url, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const result = await response.text();
  return {webpage: result};
}
/*
async function GetWordStatusChanges(){
  const formData = new FormData();
  formData.append("sessionTag", sessionTag);
  formData.append("language", language);
  const url = "https://lingojourney.net/translationWindow/GetWordStatusChanges.php";
  const response = await fetch(url, {
      method: "POST",
      body: formData
  });
  if (!response.ok) {
      throw new Error("Network response was not ok");
  }
  const result = await response.text(); 
  return result;
}
  */
function LoadKnownAndLearningWords(){
  /*
  let fileRelPath = "LanguageData/Russian/";
  let fileNameList = [fileRelPath + "knownWordList.txt", fileRelPath + "learningWordList.txt"];
  let returnList = [null, null];
  for(let i = 0; i < fileNameList.length; i++){
    let link = chrome.runtime.getURL(fileNameList[i]);
    const response = await fetch(link);
    let content = await response.text();
    let splitList = content.split("¬");
    returnList[i] = splitList;
  }
  console.log("loading lists, ",returnList);
  return returnList;
  */
  chrome.storage.sync.get({
    learningWordList: [],
    knownWordList: []
  }, function(result) {
    knownWordList = result.knownWordList;
    learningWordList = result.learningWordList;
  });
}
async function GetUpdatedWindowSettings(){
  const formData = new FormData();
  formData.append("sessionTag", sessionTag);
  const url = "https://lingojourney.net/GetWindowSettings/GetWindowSettings.php";
  const response = await fetch(url, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const result = await response.text();
  return result;
}
async function LoadTranslationWindowHTML(){
  let link = chrome.runtime.getURL("translationWindow/translationWindow.html");
  const response = await fetch(link);
  let text = await response.text();
  console.log("translation window HTML -> ", text);
  return text;
}
async function LoadTranslations(fileName, sendResponse){
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
/*
async function CheckIfLoadLanguageTranslations(
  callbackFunction,  request, sender, sendResponse
){
  if(translationInfo === null){
    await LoadTranslations();
  }
  if(translationInfo !== null){
    callbackFunction(request, sender, sendResponse);
  }
}
  */
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
    //console.log("Connected .....", request);
    switch(request.type){
      /*
      case "IsLoggedIn":
        sendResponse({loggedIn: sessionTag});
        break;
      case "SetData":
        sessionTag = request.sessionTag;
        language = request.language;
        break;
      */
      case "LoadTranslationData":
        LoadTranslations(request.fileName, sendResponse);
        console.log("Sending response");        
        //return true;
        break;
      case "WordStatusChange":
        HandleWordStatusChange(request.word, request.wordStatus);
        break;
      /*case "Ping":
        sendResponse({data:"pong"});
        break;*/
      /*
      case "GetLanguage":
        sendResponse({language: language});
        break;
      */
      case "GetUpdatedWindowSettings":
        GetUpdatedWindowSettings().then((result)=>{
          sendResponse({webpage:result});
        });
        break;
      /*
      case "GetWordStatusChanges":
        GetWordStatusChanges().then((result) => {
          sendResponse({webpage: result});
        });    
        break;
      */
      case "GetSessionTag":
        sendResponse({sessionTag:sessionTag});
        break;
      case "IsYoutubeIntervalRunning":
        sendResponse({data: youtubeIntervalRunning});
        break;
      case "GetWordLists":
        GetWordListsWebPage().then(data=>{
          console.log("send back", data);
          sendResponse(data);
        });
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
        //GetCurrentTab(
        //  function(request, sender, sendResponse){
        SendMessageToContentScript({type: "HasTranslationInfo"}, async function(response){
          console.log(response);
          console.log("response to background, ", response.answer);
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
            ActionMessage(request, sender, sendResponse);
          });
        });
        //  },  request, sender, sendResponse);   
        /*        
        GetCurrentTab(
          function(request, sender, sendResponse){
            CheckIfLoadLanguageTranslations(async function(request, sender, sendResponse){
                SendMessageToContentScript({type: "HasTranslationInfo"}, async function(response){
                  console.log(response);
                  console.log("response to background, ", response.answer);
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
                    ActionMessage(request, sender, sendResponse);
                  });
                });
              }, request, sender, sendResponse);
          },  request, sender, sendResponse);    
        */     
        break;
      default:
        console.error("Invalid type -> ", request.type);
    }
    //return false;
    return true;
});

LoadKnownAndLearningWords();