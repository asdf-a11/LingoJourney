let numberOfKnownWords = undefined;
let numberOfLearningWords = undefined;
let percentageKnownWords = undefined;

function DrawGraph(canvasIdName, value, minValue, maxValue, checkPointList){
  const canvas = document.getElementById(canvasIdName);
  const perantElement = document.getElementById("graphContainer");
  canvas.width = perantElement.offsetWidth * 0.95;
  canvas.height = perantElement.offsetHeight * 0.08;
  let width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;
  //Overrides width to make sure graph is not to compact
  //Might lose higher values
  width = Math.max(4096/2,width);
  //console.log(width, height);
  let ctx = canvas.getContext("2d");
  const valueToPixel = width / (maxValue - minValue);
  //Draw graphs background
  ctx.fillStyle = "rgb(129,133,137)";
  ctx.fillRect(0,0, width,height);
  //Draw bar
  ctx.fillStyle = "rgb(255,102,0)";
  ctx.fillRect(0,0, valueToPixel * (value-minValue),height);
  //Draw checkpoints
  for(let v of checkPointList){
    ctx.moveTo(valueToPixel * v, 0);
    ctx.lineTo(valueToPixel * v, height);
    ctx.stroke();
    ctx.fillStyle = "#000000";
    ctx.font = "20px Times New Roman";
    ctx.fillText(v.toString(), valueToPixel * v ,height - 20);
  }
}
function UpdateAllGraphs(){
  console.log("known, learning words->",numberOfKnownWords, numberOfLearningWords);
  DrawGraph("knownWordsGraph", numberOfKnownWords, 0, 10000, [100,500,1000,2000,3000,4000]);
  DrawGraph("learningWordsGraph", numberOfLearningWords, 0, 20000, [500,1000,2000,4000,6000]);
}
function WriteStatsToPage(){
  document.getElementById("learningWordsNumber").textContent = numberOfLearningWords.toString();
  document.getElementById("knownWordsNumber").textContent = numberOfKnownWords.toString();
  document.getElementById("percentageKnownWords").textContent = (percentageKnownWords*100).toString();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  numberOfKnownWords = message.numberOfKnownWords;
  numberOfLearningWords = message.numberOfLearningWords;
  percentageKnownWords = message.percentageKnownWords;
  WriteStatsToPage();
  UpdateAllGraphs();
});
//If the window is resized then redraw the graphs
window.addEventListener('resize', function() {
  UpdateAllGraphs();
});


