const BASIC_TRANSLATION_FILES = [
    "EnglishRussianTranslations_Incomplete.json"
];
const MAX_NUMBER_OF_FILES = 5;
var prevFileNames = undefined;
var hasLoadedFile = false;

const MENU_ID_LIST = [
    "SelectTranslationFile",
    "OperationsMenu",
    "SettingsMenu"
];

function SendMessageToBackground(message, func) {
    function ResponseFunction(response) {
        func(response);        
    }
    let a = undefined;
    if(func !== undefined){
        a = ResponseFunction;
    }
    chrome.runtime.sendMessage(message, a);
}
function DownloadStringAsFile(filename, content) {
    // Create a Blob from the string
    const blob = new Blob([content], { type: 'text/plain' });    
    // Create a temporary anchor element
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    // Trigger the download
    document.body.appendChild(a);
    a.click();    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}
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
function HideAllMenues(){
    for(let i of MENU_ID_LIST){
        document.getElementById(i).hidden = true;
    }
}
function VeiwOperationMenu(){
    HideAllMenues();
    document.getElementById("OperationsMenu").hidden = false;
}
function VeiwSelectTranslationFile(){
    HideAllMenues();
    document.getElementById("SelectTranslationFile").hidden = false;    
}
function OnSettingsButtonClicked(){
    HideAllMenues();
    document.getElementById("SettingsMenu").hidden = false;
    document.getElementById("SettingsButtonDiv").hidden = true;
}
function OnExitSettingsClicked(){
    HideAllMenues();
    if(hasLoadedFile === true){
        document.getElementById("OperationsMenu").hidden = false;
    }
    else{
        document.getElementById("SelectTranslationFile").hidden = false;  
    }
    document.getElementById("SettingsButtonDiv").hidden = false;
}
function OnDowloadKnownWords(){
    SendMessageToBackground({
        type: "GetKnownWordList"
    }, function(response){
        let string = response.knownWordList.join(", ");
        DownloadStringAsFile("Lingo Journey - known word list.txt", string);
    });
}
function OnSelectedTranslationFile(){
    let fileName = document.getElementById("fileName_input").value;
    if(prevFileNames.indexOf(fileName) == -1){
        prevFileNames.unshift(fileName);
    }
    chrome.storage.sync.set({
        prevFileNames: prevFileNames
    }, function() {  });
    SendMessageToBackground({
        type: "LoadTranslationData",
        fileName: fileName
    }, function(request){
        document.getElementById("LoadSucc").hidden = request.status;
        if(request.status == false){
            VeiwSelectTranslationFile();
        }
        else{
            VeiwOperationMenu();
        }
    });    
    hasLoadedFile = true;
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
    document.getElementById("SettingsButton").onclick = OnSettingsButtonClicked;
    document.getElementById("ExitSettingsButton").onclick = OnExitSettingsClicked;
    document.getElementById("DowloadKnownWordsButton").onclick = OnDowloadKnownWords;
}