import { Observable } from "rxjs";
import { Subject } from "rxjs";

var baseImageArray: any[] = [];
var arraySubject = new Subject();
arraySubject.subscribe(image => {
  var tools: any = document.querySelector(".tools-container");
  tools.style.display = "block";
  var buttonPanel: any = document.querySelector(".button-panel");
  buttonPanel.classList.remove("buttons-disabled");
  buttonPanel.classList.add("hoverable-buttons");
});
var base_canvas: any = document.getElementById("baseCanvas"),
  base_context = base_canvas.getContext("2d"),
  baseRect = base_canvas.getBoundingClientRect();
//let fileLabel: any = document.getElementById("");
let fileInput: any = document.getElementById("file-input");
fileInput.onchange = function(e: Event) {
  readURL(this);
};
window.addEventListener("resize", reloadImage);

/** Draws the base image to the canvas when the user selects an image from their computer using the file input*/
function readURL(input: any) {
  if (input.files && input.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e: any) {
      var base_image = new Image();
      baseImageArray[0] = base_image;
      arraySubject.next(base_image);
      base_image.onload = function() {
        base_canvas.width = base_image.width;
        base_canvas.height = base_image.height;
        var baseRect = base_canvas.getBoundingClientRect();
        let dimens = getResizedDimensions(baseRect.width, baseRect.height);
        base_canvas.width = dimens.width;
        base_canvas.height = dimens.height;
        base_image.width = dimens.width;
        base_image.height = dimens.height;
        base_context = base_canvas.getContext("2d");
        base_context.drawImage(base_image, 0, 0);
        var canvases: NodeList = document.querySelectorAll(".overlay-canvas");
        canvases.forEach((canvas: HTMLCanvasElement) => {
          canvas.width = base_canvas.width;
          canvas.height = base_canvas.height;
        });
        baseRect = base_canvas.getBoundingClientRect();
      };
      base_image.src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

/** Gets the dimensions of the browser window */
function getResizedDimensions(rectWidth: number, rectHeight: number) {
  var windowWidth: number = window.outerWidth;
  var windowHeight: number = window.outerHeight;
  var returnWidth = 0,
    returnHeight = 0;
  if (
    rectWidth - rectWidth * 0.05 < windowWidth &&
    windowWidth < rectWidth * 1.05
  ) {
    returnHeight = (rectWidth * windowHeight) / windowWidth;
    returnWidth = rectWidth;
  } else {
    returnWidth = (windowWidth * rectHeight) / windowHeight;
    returnHeight = rectHeight;
  }
  return {
    width: returnWidth,
    height: returnHeight
  };
}

/** Reloads the image on the canvas. Called whenever the window resizes */
function reloadImage() {
  console.log("reload")
  if (baseImageArray.length > 0) {
    base_canvas.width = baseImageArray[0].width;
    base_canvas.height = baseImageArray[0].height;
    var baseRect = base_canvas.getBoundingClientRect();
    let dimens = getResizedDimensions(baseRect.width, baseRect.height);
    base_canvas.width = dimens.width;
    base_canvas.height = dimens.height;
    baseImageArray[0].width = dimens.width;
    baseImageArray[0].height = dimens.height;
    base_context = base_canvas.getContext("2d");
    base_context.drawImage(baseImageArray[0], 0, 0);
    var canvases: NodeList = document.querySelectorAll(".overlay-canvas");
    canvases.forEach((canvas: HTMLCanvasElement) => {
      canvas.width = base_canvas.width;
      canvas.height = base_canvas.height;
    });
    baseRect = base_canvas.getBoundingClientRect();
  }
}
