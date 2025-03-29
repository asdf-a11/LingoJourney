function ScrollToElement(elementIdString){
    const element = document.getElementById(elementIdString);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        console.error("Element with id "+elementIdString+" not found.");
    }
}
function AssignActions(){
    document.getElementById("WhatProblemIsBeingSolved_button").onclick = function(){ScrollToElement("WhatProblemIsBeingSolved")};
    document.getElementById("HowIsTheProblemSolved_button").onclick = function(){ScrollToElement("HowIsTheProblemSolved")};
    document.getElementById("SpecificFetures_button").onclick = function(){ScrollToElement("SpecificFetures")};
}

window.onload = function(){
    AssignActions();
}
