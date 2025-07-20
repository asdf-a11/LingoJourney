//imgPath is relative to assets/Flags and
//translation paths a relitive to LanguageData


//const BASIC_TRANSLATION_FILES = [
//    "RUtoEN_free.txt"
//];
const MAX_NUMBER_OF_FILES = 3;
var prevFileNames = undefined;
var hasLoadedFile = false;

const languageList = [
    {name: "russian", imgPath: "russianFlag.png", freeTranslationPath: "RUtoEN_free.txt", paidTranslationPath:null}
];

function SelectALanguage(languageData){
    console.log("Selected a language ", languageData);
}
function DisplaySelectLanguageMenu(){  
    //Display languages buttons to user to click on and select a language
    const imageRelPath = "../assets/Flags/";
    //Clear language display div
    let languageListDiv = document.getElementById("languageListDiv");
    languageListDiv.innerHTML = "";
    //Display languages to the screen
    for(let languageData of languageList){
        let buttonElement = document.createElement("button");
        let imgPath = imageRelPath + languageData.imgPath;
        let imgElement = document.createElement("img");
        imgElement.src = imgPath;
        imgElement.className = "languageImage";
        buttonElement.appendChild(imgElement);
        buttonElement.onclick = function(){SelectALanguage(languageData);}
        languageListDiv.appendChild(buttonElement);
    }  
}

const menuList = {
    SelectLanguage: {id:"SelectLanguage",displayFunc:DisplaySelectLanguageMenu},
    OperationMenu: {id:"OperationsMenu",displayFunc:null}, 
    SettingsMenu: {id:"SettingsMenu",displayFunc:null},
    PrevMenu: {id:"PrevMenu",displayFunc:null} // uses prevMenu to go back to menu before prior
}
let currentMenuId = undefined;
let prevMenuId = undefined;

function HideAllMenues(){
    for(let key in menuList){
        let m = menuList[key];
        if(m.id == "PrevMenu"){continue;}
        document.getElementById(m.id).hidden = true;
    }
}
function GetMenuDataById(idString){
    for(let key in menuList){
        let m = menuList[key];
        if(m.id === idString){
            return m;
        }
    }
    console.error("Failed to find menu with id -> ", idString);
    return undefined;
}
function ChangeMenu(newMenuId){
    console.log("Changing menues from ", currentMenuId, " to ", newMenuId);
    HideAllMenues();
    //Check if backtrack menues
    if(newMenuId === menuList.PrevMenu.id){
        currentMenuId = prevMenuId;
        prevMenuId = null;
    }
    else{
        prevMenuId = currentMenuId;
        currentMenuId = newMenuId;
    }    
    let menuData = GetMenuDataById(currentMenuId);
    //Make the menu visable
    document.getElementById(menuData.id).hidden = false;
    //If there is a display function for the menu call it
    if(menuData.displayFunc != null){
        menuData.displayFunc();
    }
}

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
        console.log("Setting prevoise file names, ", )
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
function OnStatButtonPress(){
    SendMessageToBackground({type: "OpenStatsPage"});
}
//window.onload = function(){}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOing something");
    ChangeMenu(menuList.SelectLanguage.id);
    //LoadPrevoiseFileNames();
    //document.getElementById("pickedFileName_button").onclick = OnSelectedTranslationFile;
    document.getElementById("WordifyWholePage_button").onclick = OnWordifyWholePage;
    document.getElementById("WordifyYoutube_button").onclick = OnWordifyYoutube;
    document.getElementById("SettingsButton").onclick = OnSettingsButtonClicked;
    document.getElementById("ExitSettingsButton").onclick = OnExitSettingsClicked;
    document.getElementById("DowloadKnownWordsButton").onclick = OnDowloadKnownWords;
    document.getElementById("StatsButton").onclick = OnStatButtonPress;
});