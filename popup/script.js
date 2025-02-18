const BASIC_TRANSLATION_FILES = [
    "EnglishRussianTranslations_Incomplete.json"
];
const MAX_NUMBER_OF_FILES = 5;

function SendMessageToBackground(message, func) {
    function ResponseFunction(response) {
        console.log('Response from background:', response);
        func(response);        
    }
    let a = undefined;
    if(func !== undefined){
        a = ResponseFunction;
    }
    chrome.runtime.sendMessage(message, a);
}   
var prevFileNames = undefined;
function LoadPrevoiseFileNames(){
    chrome.storage.sync.get({
        prevFileNames: []
    }, function(result) {        
        prevFileNames = result.prevFileNames;
        let e = document.getElementById("fileNameList");
        prevFileNames.length = Math.min(prevFileNames.length,MAX_NUMBER_OF_FILES);
        for(let i = 0; i < prevFileNames.length; i++){
            let b = document.createElement("option");
            b.value = prevFileNames[i];
            e.appendChild(b);
        }  
        for(let i = 0; i < BASIC_TRANSLATION_FILES.length; i++){
            if(prevFileNames.indexOf(BASIC_TRANSLATION_FILES[i]) == -1){
                let b = document.createElement("option");
                b.value = BASIC_TRANSLATION_FILES[i];
                e.appendChild(b);
            }
        } 
    });
}    
function VeiwOperationMenu(){
    document.getElementById("SelectTranslationFile").hidden = true;
    document.getElementById("OperationsMenu").hidden = false;
}
function VeiwSelectTranslationFile(){
    document.getElementById("SelectTranslationFile").hidden = false;
    document.getElementById("OperationsMenu").hidden = true;
}
function OnSelectedTranslationFile(){
    let fileName = document.getElementById("fileName_input").value;
    if(prevFileNames.indexOf(fileName) == -1){
        prevFileNames.unshift(fileName);
    }
    chrome.storage.sync.set({
        prevFileNames: prevFileNames
    }, function() {
        console.log("Svaed prevfileNames, ", prevFileNames);
    });
    console.log("file Name, ", fileName);
    SendMessageToBackground({
        type: "LoadTranslationData",
        fileName: fileName
    }, function(request){
        //console.log("Recived response", request);
        //console.log(document);
        //console.log(document.getElementById("LoadSucc"));
        document.getElementById("LoadSucc").hidden = request.status;
        if(request.status == false){
            VeiwSelectTranslationFile();
            //document.getElementById("LoadSucc").style.visibility = "visable";
        }
        else{
            VeiwOperationMenu();
            //document.getElementById("LoadSucc").style.visibility = "hidden";
        }
    });    
}
function OnWordifyWholePage(){
    SendMessageToBackground({type: "StartUpdatePage"});
}
function OnWordifyYoutube(){
    SendMessageToBackground({type: "StartYoutubeRoutine"});
}
window.onload = function(){
    LoadPrevoiseFileNames();
    document.getElementById("pickedFileName_button").onclick = OnSelectedTranslationFile;
    document.getElementById("WordifyWholePage_button").onclick = OnWordifyWholePage;
    document.getElementById("WordifyYoutube_button").onclick = OnWordifyYoutube;
}
/*
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Invoking thing");
    switch(request.type){
        case "LoadingTranslationDataSucc":

            break;
        default:
            console.error("Invalid message sent to popup window (", request.type, ")");
    }
    return false;
});*/