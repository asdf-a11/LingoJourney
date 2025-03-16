var targetLangWord = null;
var translationParagraph = null;
var translationShort = null;
var oldWordStatus = null;
var newWordStatus = null;
var isUsingFreeTranslationList = null;

function SendMessageToBackground(message, onResponseFunction){
    chrome.runtime.sendMessage(message, function(response) {
        if(onResponseFunction !== undefined){
            onResponseFunction(response);
        }
    });
}
function SetButtonColour(){
    let buttonNameList = [
        "learningButton", 
        "knownButton",
        "unknownButton"
    ];
    for(let i in buttonNameList){
        document.getElementById(buttonNameList[i]).className = "wordStatusButton_notSelected";
    }
    if(newWordStatus !== null){
        document.getElementById(newWordStatus+"Button").className = "wordStatusButton_selected";
    }
}
function OnWordStatusButtonClicked(newWordStatus_arg){
    newWordStatus = newWordStatus_arg;
    SetButtonColour();
}
function AttachClickFunctionToButtons(){
    document.getElementById("learningButton").onclick = function(){OnWordStatusButtonClicked("learning");};
    document.getElementById("knownButton").onclick = function(){OnWordStatusButtonClicked("known");};
    document.getElementById("unknownButton").onclick = function(){OnWordStatusButtonClicked("unknown");};
}
function ShowMessageIfFreeTranslationList(){
    if(isUsingFreeTranslationList === true){
        document.getElementById("UsingFreeTranslationList").hidden = false;
    }
}
function DisplayTranslationsAndTitle(){
    document.getElementById("translationParagraph_display").innerHTML = translationParagraph;
    document.getElementById("transWords").innerHTML = translationShort;
    document.getElementById("targetWordTitle").innerHTML = targetLangWord;
}  
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "CloseTranslationWindow") {
        window.close();
    }
});     
window.onload = function(){      
    chrome.runtime.sendMessage({ type: "GetInfoForTranslationWindow" }, (message) => {
        //Move values into global varaibles
        targetLangWord = message.targetLangWord;
        isUsingFreeTranslationList = message.isUsingFreeTranslationList;
        oldWordStatus = message.oldWordStatus;
        translationParagraph = message.translationParagraph;
        translationShort = message.translationShort;
        //Unknown words auto set to learning
        newWordStatus = oldWordStatus;
        if(newWordStatus == "unknown"){
            newWordStatus = "learning";
        }
        //
        AttachClickFunctionToButtons();     
        SetButtonColour();
        ShowMessageIfFreeTranslationList();
        DisplayTranslationsAndTitle();
    });
}
window.onbeforeunload = function(){
    chrome.runtime.sendMessage({
        type: "SendingClosingTranslationWindowInfo",
        targetLangWord: targetLangWord,
        oldWordStatus: oldWordStatus,
        newWordStatus: newWordStatus
    });
}