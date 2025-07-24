//Index db instance to store all paid translation files
let db; 
const DB_NAME = 'MyExtensionFilesDB';
const STORE_NAME = "paidTranslationFiles";
const DB_VERSION = 1;

let selectedLanguage = undefined;
let isFreeTranslationList = undefined;

const languageList = [
    //name:(from language to language) imgPath: (path to flag image to display in popup) free...:(Path rel to LanguageData to find file) 
    //paid...: name of paid file in indexdb database
    {name: "RUtoEN", imgPath: "russianFlag.png", freeTranslationPath: "RUtoEN_free.txt", paidTranslationFileName: "RUtoEN_paid.txt"}
];

function SelectALanguage(languageData){
    console.log("Selected a language ", languageData);
    //Stores it in global varaible for future reference
    selectedLanguage = languageData;   
    SendMessageToBackground({
        type: "LoadTranslationData",
        freeTranslationFilePath: languageData.freeTranslationPath,
        paidTranslationFileName: languageData.paidTranslationFileName
    }, function(request){
        //If failed to load then dont hide error message
        document.getElementById("LoadSucc").hidden = request.status;
        //If using free translation list set global flag
        isFreeTranslationList = request.isFreeTranslationList;
        //
        if(request.status == false){
            console.error("Somethind went wrong when trying to load translation file");
        }
        else{
            ChangeMenu(menuList.OperationMenu.id);
        }
    });     
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
function DisplayOptionMenu(){
    document.getElementById("isUsingFreeTranslations").hidden = !isFreeTranslationList;
}
function DisplayUploadTranslationFile(){

}
const menuList = {
    SelectLanguage: {id:"SelectLanguage",displayFunc:DisplaySelectLanguageMenu},
    OperationMenu: {id:"OperationsMenu",displayFunc:DisplayOptionMenu}, 
    SettingsMenu: {id:"SettingsMenu",displayFunc:null},
    PrevMenu: {id:"PrevMenu",displayFunc:null}, // uses prevMenu to go back to menu before prior
    UploadTranslationFile: {id:"UploadTranslationFile", displayFunc:DisplayUploadTranslationFile}
};
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
    //Handles if exit button is pressed on first menu i.e no prev menu to exit to
    if(prevMenuId == undefined && newMenuId === menuList.PrevMenu.id){
        console.log("PrevMenuId undefined therefore cant exit");
        return;
    }
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
//Opens the index db database that is used for storing paid translation files
function OpenDataBase(){
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Create an object store to hold our files. KeyPath could be 'name' or 'id'
                db.createObjectStore(STORE_NAME, { keyPath: 'name' });
            }
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database has be opened");
            //saveFileButton.disabled = true;
            resolve(db);
        };
        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.error);
            reject(event.target.error);
        };
    });
}
async function SaveIntoDataBase(){
    //saveFileBtn.addEventListener('click', async () => {
    if (!fileInput.files || fileInput.files.length === 0) {
        statusMessage.textContent = 'Please select a file first!';
        return;
    }
    const file = fileInput.files[0];
    let statusMessage = document.getElementById("statusMessage");
    statusMessage.textContent = `Saving ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`;
    try {
        if (!db) await OpenDataBase(); // Ensure DB is open
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        // Store the file directly as a Blob
        const putRequest = store.put({ name: file.name, type: file.type, data: file }); // Store Blob directly
        putRequest.onsuccess = () => {
            statusMessage.textContent = `File '${file.name}' has been added to Lingo Journey!`;
            console.log(`File '${file.name}' stored in IndexedDB.`);
        };
        putRequest.onerror = (event) => {
            statusMessage.textContent = `Error adding file: ${event.target.error.message}`;
            console.error('Error adding file to IndexedDB:', event.target.error);
        };
        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });
    } catch (error) {
        statusMessage.textContent = `Operation failed: ${error.message}`;
        console.error('IndexedDB operation error:', error);
    }
}
function OnSettingsButtonClicked(){
    ChangeMenu(menuList.SettingsMenu.id);
}
function OnExitButtonClicked(){
    ChangeMenu(menuList.PrevMenu.id);
}
//Dowloads the list of all known words to users dowload folder
function OnDowloadKnownWords(){
    SendMessageToBackground({
        type: "GetKnownWordList"
    }, function(response){
        let string = response.knownWordList.join(", ");
        DownloadStringAsFile("Lingo Journey - known word list.txt", string);
    });
}
function OnUploadNewTranslations(){
    ChangeMenu(menuList.UploadTranslationFile.id);
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
function UploadTranslationMenuInit(){
    let fileInput = document.getElementById("fileInput");
    let saveFileButton = document.getElementById("addFileButton");
    fileInput.addEventListener('change', (event) => {        
        let statusMessage = document.getElementById("statusMessage");
        if (event.target.files.length > 0) {
            saveFileButton.disabled = false;
            statusMessage.textContent = `Selected: ${event.target.files[0].name}`;
        } else {
            saveFileButton.disabled = true;
            statusMessage.textContent = 'No file selected.';
        }
    });
    saveFileButton.addEventListener('click', SaveIntoDataBase);
    // Initialize the database on startup
    OpenDataBase().catch(e => console.error("Failed to open DB on startup", e));
}
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOing something");
    ChangeMenu(menuList.SelectLanguage.id);
    UploadTranslationMenuInit();
    document.getElementById("WordifyWholePage_button").onclick = OnWordifyWholePage;
    document.getElementById("WordifyYoutube_button").onclick = OnWordifyYoutube;
    document.getElementById("SettingsButton").onclick = OnSettingsButtonClicked;
    document.getElementById("ExitButton").onclick = OnExitButtonClicked;
    document.getElementById("DowloadKnownWordsButton").onclick = OnDowloadKnownWords;
    document.getElementById("StatsButton").onclick = OnStatButtonPress;
    document.getElementById("UploadPaidTranslations").onclick = OnUploadNewTranslations;
});