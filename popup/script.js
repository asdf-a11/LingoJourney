//imgPath is relative to assets/Flags and
//translation paths a relitive to LanguageData


//const BASIC_TRANSLATION_FILES = [
//    "RUtoEN_free.txt"
//];
const MAX_NUMBER_OF_FILES = 3;
var prevFileNames = undefined;
var hasLoadedFile = false;

let db; // To hold the IndexedDB instance
const DB_NAME = 'MyExtensionFilesDB';
const STORE_NAME = "paidTranslationFiles";
const DB_VERSION = 1;

let selectedLanguage = undefined;
let isFreeTranslationList = undefined;

const languageList = [
    {name: "russian", imgPath: "russianFlag.png", freeTranslationPath: "RUtoEN_free.txt", paidTranslationPath:null}
];

function SelectALanguage(languageData){
    console.log("Selected a language ", languageData);
    selectedLanguage = languageData;   
    let filePath;
    if(languageData.paidTranslationPath == null){
        //Is using free translation file set bool
        filePath = languageData.freeTranslationPath;
    }
    else{
        filePath = languageData.paidTranslationPath;
    }
    console.log("Loading file ", filePath);
    SendMessageToBackground({
        type: "LoadTranslationData",
        freeTranslationFileName: languageData.freeTranslationPath,
        paidTranslationPath: languageData.paidTranslationPath
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
/*
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
*/
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
            statusMessage.textContent = `File '${file.name}' saved to IndexedDB successfully!`;
            console.log(`File '${file.name}' stored in IndexedDB.`);
        };

        putRequest.onerror = (event) => {
            statusMessage.textContent = `Error saving file: ${event.target.error.message}`;
            console.error('Error saving file to IndexedDB:', event.target.error);
        };

        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });

    } catch (error) {
        statusMessage.textContent = `Operation failed: ${error.message}`;
        console.error('IndexedDB operation error:', error);
    }
    //});
}
async function LoadFromDataBase(){
    statusMessage.textContent = 'Loading file from IndexedDB...';
    try {
        if (!db) await OpenDataBase(); // Ensure DB is open

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        // Assuming you want to load the last saved file, or by a specific name
        // For simplicity, let's try to get the file with the same name as was last selected.
        // In a real app, you'd list available files or have a fixed key.
        const fileNameToLoad = fileInput.files[0] ? fileInput.files[0].name : 'your_default_file_name_if_any';

        if (!fileNameToLoad || fileNameToLoad === 'your_default_file_name_if_any') {
            statusMessage.textContent = 'Select a file or specify a name to load.';
            return;
        }

        const getRequest = store.get(fileNameToLoad); // Get by name

        getRequest.onsuccess = (event) => {
            const record = event.target.result;
            if (record) {
                const loadedFileBlob = record.data; // This is the Blob you saved
                statusMessage.textContent = `File '${record.name}' loaded from IndexedDB! Type: ${record.type}, Size: ${(loadedFileBlob.size / (1024 * 1024)).toFixed(2)} MB`;
                console.log('Loaded Blob:', loadedFileBlob);

                // --- IMPORTANT: How to use the loaded Blob ---
                // 1. If it's an image, you can create an Object URL:
                // const imageUrl = URL.createObjectURL(loadedFileBlob);
                // const img = document.createElement('img');
                // img.src = imageUrl;
                // document.body.appendChild(img);
                // img.onload = () => URL.revokeObjectURL(imageUrl); // Clean up

                // 2. If it's a text file, you can read it:
                // const reader = new FileReader();
                // reader.onload = (e) => console.log('Loaded text content (first 100 chars):', e.target.result.substring(0, 100));
                // reader.readAsText(loadedFileBlob);

                // 3. If it's binary data (e.g., for processing):
                // const reader = new FileReader();
                // reader.onload = (e) => {
                //    const arrayBuffer = e.target.result;
                //    console.log('Loaded ArrayBuffer:', arrayBuffer);
                //    // Now you can process arrayBuffer with your logic
                // };
                // reader.readAsArrayBuffer(loadedFileBlob);

            } else {
                statusMessage.textContent = `File '${fileNameToLoad}' not found in IndexedDB.`;
            }
        };

        getRequest.onerror = (event) => {
            statusMessage.textContent = `Error loading file: ${event.target.error.message}`;
            console.error('Error loading file from IndexedDB:', event.target.error);
        };

        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });

    } catch (error) {
        statusMessage.textContent = `Operation failed: ${error.message}`;
        console.error('IndexedDB load operation error:', error);
    }
}

function OnSettingsButtonClicked(){
    //HideAllMenues();
    //document.getElementById("SettingsMenu").hidden = false;
    //document.getElementById("SettingsButtonDiv").hidden = true;
    ChangeMenu(menuList.SettingsMenu.id);
}
function OnExitSettingsClicked(){
    /*
    HideAllMenues();
    if(hasLoadedFile === true){
        document.getElementById("OperationsMenu").hidden = false;
    }
    else{
        document.getElementById("SelectTranslationFile").hidden = false;  
    }
    document.getElementById("SettingsButtonDiv").hidden = false;
    */
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
/*
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
*/
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
    document.getElementById("ExitSettingsButton").onclick = OnExitSettingsClicked;
    document.getElementById("DowloadKnownWordsButton").onclick = OnDowloadKnownWords;
    document.getElementById("StatsButton").onclick = OnStatButtonPress;
    document.getElementById("UploadPaidTranslations").onclick = OnUploadNewTranslations;
});