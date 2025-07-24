var targetLangWord = null;
var translationParagraph = null;
var translationShort = null;
var oldWordStatus = null;
var newWordStatus = null;
var isUsingFreeTranslationList = null;
var isExactWord = null;
var approximationWord = null;
var wordFreq = null;
//range from 0-1
let volumeLevel = 1;


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
function HandleIsNotExactWordMessage(){
    if(isExactWord === false){
        //Show the not exact message
        document.getElementById("NotExactTranslation").hidden = false;
        //Display word that is being approximated too
        document.getElementById("ApproxAs").textContent = approximationWord;
    }
}
function DisplayWordFreq(){
    //Frequcncy of the most common word as it is the coefficenct for zipfs law.
    const вFreq = 0.0365258519;
    const bucketNumber = 100;
    //The bucket position of a word with estimated position of minWordPosition is 0
    const minWordPosition = 10000;
    //Using Zipfs law to estimate the position using the frequcny of the word
    let estimatedPosition = 1.0/wordFreq * вFreq;
    const dpNumber = 2;
    let bucketPosition = Math.round((bucketNumber - Math.max(0.0,estimatedPosition / minWordPosition * bucketNumber)) * Math.pow(10, dpNumber)) /  Math.pow(10, dpNumber);

    document.getElementById("wordFreq").textContent = bucketPosition.toString();
}
function SoundWord(){
    if("speechSynthesis" in window){
        var msg = new SpeechSynthesisUtterance();
        var voices = window.speechSynthesis.getVoices();
        msg.voice = voices[0]; 
        msg.volume = volumeLevel; // From 0 to 1
        msg.rate = 1; // From 0.1 to 10
        msg.pitch = 2; // From 0 to 2
        msg.text = targetLangWord;
        msg.lang = "ru";
        speechSynthesis.speak(msg);
    }
    else{
        document.getElementById("noSpeechSynth").hidden = false;
    }
}
function DisplayCurrentVolumeLevel(){
    document.getElementById("volumeLevel").textContent = Math.round(volumeLevel*10).toString();
}
function AttachMethodsToVolumeButtons(){
    const stepSize = 1/10;
    document.getElementById("volumeDownButton").onclick = function(){
        volumeLevel -= stepSize;
        if(volumeLevel < 0){ volumeLevel = 0; }
        DisplayCurrentVolumeLevel();
    };
    document.getElementById("volumeUpButton").onclick = function(){
        volumeLevel += stepSize;
        if(volumeLevel > 1){ volumeLevel = 1; }
        DisplayCurrentVolumeLevel();
    }
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
        isExactWord = message.isExactWord;
        approximationWord = message.approximationWord;
        wordFreq = message.freq;
        volumeLevel = message.volumeLevel;
        console.log(message);
        //Unknown words auto set to learning
        newWordStatus = oldWordStatus;
        if(newWordStatus == "unknown"){
            newWordStatus = "learning";
        }
        //
        DisplayCurrentVolumeLevel(); 
        AttachMethodsToVolumeButtons();
        AttachClickFunctionToButtons();     
        SetButtonColour();
        ShowMessageIfFreeTranslationList();
        DisplayTranslationsAndTitle();
        DisplayWordFreq();
        HandleIsNotExactWordMessage();
        SoundWord();
    });
}
window.onbeforeunload = function(){
    chrome.runtime.sendMessage({
        type: "SendingClosingTranslationWindowInfo",
        targetLangWord: targetLangWord,
        oldWordStatus: oldWordStatus,
        newWordStatus: newWordStatus,
        volumeLevel: volumeLevel
    });
}