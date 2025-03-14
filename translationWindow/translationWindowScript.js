var targetLangWord = null;
var translationParagraph = null;
var translationShort = null;
var oldWordStatus = null;
var newWordStatus = null;

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
    document.getElementById("newWordStatus").innerHTML = newWordStatus;
    SetButtonColour();
}
function AttachClickFunctionToButtons(){
    document.getElementById("learningButton").onclick = function(){OnWordStatusButtonClicked("learning");};
    document.getElementById("knownButton").onclick = function(){OnWordStatusButtonClicked("known");};
    document.getElementById("unknownButton").onclick = function(){OnWordStatusButtonClicked("unknown");};
}
function LoadData(){
    targetLangWord = document.getElementById("targetLangWord").innerHTML;
    oldWordStatus = document.getElementById("oldWordStatus").innerHTML;
    translationParagraph = document.getElementById("translationParagraph").innerHTML;
    translationShort = document.getElementById("translationShort").innerHTML;
}
function IfFreeTranslationListDisplayMessage(){
    let isFreeTranslationList = document.getElementById("isUsingFreeTranslationList").innerHTML == "true";
    if(isFreeTranslationList){
        document.getElementById("UsingFreeTranslationList").hidden = false;
    }
}
function DisplayTranslationsAndTitle(){
    document.getElementById("translationParagraph_display").innerHTML = translationParagraph;
    document.getElementById("transWords").innerHTML = translationShort;
    document.getElementById("targetWordTitle").innerHTML = targetLangWord;
}       
//Recives messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch(message.type){
        case "GetNewWordStatus":
            SendMessageToBackground({
                newWordStatus: document.getElementById("newWordStatus").innerHTML,
                targetWord: document.getElementById("targetLangWord").innerHTML,
                newWordStatus: document.getElementById("newWordStatus").innerHTML
            });
            break;
    }
});
window.onload = function(){
    LoadData();       
    AttachClickFunctionToButtons();     
    SetButtonColour();
    IfFreeTranslationListDisplayMessage();
    DisplayTranslationsAndTitle();
}