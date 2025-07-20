export const languageList = [
    {name: "russian", imgPath: "russianFlag.png", freeTranslationPath: "RUtoEN_free.txt", paidTranslationPath:null}
];

function DisplaySelectLanguageMenu(){  
    //Display languages buttons to user to click on and select a language
    const imageRelPath = "../assets/Flags/";
    //Clear language display div
    let languageListDiv = document.getElementById("languageListDiv");
    languageListDiv.innerHTML = "";
    //Display languages to the screen
    for(let languageData of languageList){
        let imgPath = languageData.imgPath;
        let imgElement = document.createElement("img");
        imgElement.src = imageRelPath + imgPath;
        imgElement.className = "languageImage";
        languageListDiv.appendChild(imgElement);
    }  
}

export const menuList = {
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
export function ChangeMenu(newMenuId){
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