      var base_canvas = document.getElementById("baseCanvas"),
          base_context = base_canvas.getContext("2d"),
          baseRect = base_canvas.getBoundingClientRect();
      var current_overlay_id = null,
          current_overlay_canvas = base_canvas,
          current_overlay_context = base_context,
          current_cursor_layout_id = null,
          current_cursor_layout_canvas = null,
          current_cursor_layout_context = null,
          isOverlayChanged = false;
      base_canvas.addEventListener("focus", preventFocus);
      var activeTabIndex = 0,
          manipulationNumber = 0;
      var emojiCanvasCounter = 1,
          captionCanvasCounter = 1,
          emojiCanvasLeftOffset = 0,
          emojiCanvasTopOffset = 0;
      var overlayIDArray = [],
          emojiArray = [],
          captionArray = [],
          drawArray = [];

      var isEmojiRotating = true;
      var isResizingEmoji = false;
      var emojiCurrentlyRotating = null;
      var emojiCurrentlyResizing = null;

      var clickX = new Array(),
          clickY = new Array(),
          clickDrag = new Array(),
          cursorX = null,
          cursorY = null,
          clickColor = new Array(),
          clickSize = new Array(),
          eraseX = new Array(),
          eraseY = new Array(),
          eraseWidth = new Array(),
          isDrawing = false,
          currentDrawRGBValues = null,
          currentClickSize = null,
          currentTool = "Marker";

      document
          .getElementById("downloadButton")
          .addEventListener("click", downloadCanvas);

      /**
       * Downloads the canvas to the users machine
       */
      function downloadCanvas() {
          // <-- Don't work in Firefox
          var canvases = $("#parent-container").find("canvas");
          if (canvases.length === 1) {
              removeOverlayingEmojiCanvases();
              removeOverlayingCaptionCanvases();
              var dataURL = base_canvas.toDataURL("image/png");
              var link = document.createElement("a");
              link.download = Date.now() + ".png";
              link.href = base_canvas
                  .toDataURL("image/png")
                  .replace("image/png", "image/octet-stream");
              link.click();
          } else {
              alert("You should merge the canvas before downloading!");
          }
      }

      /**
       * Handler the merges all of the canvas onto the base canvas. Also displays a modal.
       */
      function handleMergeClick() {
          $('.merge-modal').remove();
          if (
              $("#parent-container").find("canvas").length > 1
          ) {
              var div = document.querySelector('body');
              var newElement = document.createElement('div');
              newElement.setAttribute('id', 'browser-overlay');
              newElement.innerHTML = '';
              div.appendChild(newElement);
              $('body').append(`<div id="mergeModal" class="merge-modal"><div class="merge-modal-content">
          <div class="merge-modal-header">
            <span class="modal-close">&times;</span>
            <h2>Do you want to merge this canvas?</h2>
          </div>
          <div class="merge-modal-body">
            <p>This action cannot be undone.</p>
          </div>
          <div class="merge-modal-footer">
            <button id="confirmMergeModalButton" class="merge-modal-button">Yes</button>
            <button id="cancelMergeModalButton" class="merge-modal-button">Cancel</button>
          </div>
        </div></div>`)
              $('.modal-close').on("mousedown", function (e) {
                  $('#mergeModal').remove();
                  $('#browser-overlay').remove();
              });
              $('#cancelMergeModalButton').on("click", function (e) {
                  $('#mergeModal').remove();
                  $('#browser-overlay').remove();
              })
              $('#confirmMergeModalButton').on("click", function (e) {
                  mergeLayers();
                  if (activeTabIndex == 1) {
                    attachDrawHandlers();
                }
                  $('#mergeModal').remove();
                  $('#browser-overlay').remove();
              })
          }
      }

      /**
       * Called by the merge button handler to merge all canvases onto the base canvas
       */
      function mergeLayers() {
          var baseRect = base_canvas.getBoundingClientRect();
          var baseCtx = base_canvas.getContext("2d");
          [...document.querySelectorAll("canvas")].forEach(canvas => {
              var topRect = canvas.getBoundingClientRect();
              baseCtx.drawImage(
                  canvas,
                  topRect.left - baseRect.left,
                  topRect.top - baseRect.top
              );
          });
          removeOverlayingEmojiCanvases();
          removeOverlayingCaptionCanvases();
          $(".overlay-container").remove();
          $("caption-overlay").remove();
          clickX = new Array();
          clickY = new Array();
          clickDrag = new Array();
          clickColor = new Array();
          clickSize = new Array();
          eraseX = new Array();
          eraseY = new Array();
          eraseWidth = new Array();
          isDrawing = false;
      }

      /**
       * Undos an action. Think of all of the canvases as a stack of canvases. Essentially it pops a canvas off of the stack.
       * For example, in the drawing action, each time a user draws a stroke a new canvas is added. Pressing undo will remove the newly
       * created canvas therefore removing the brush stroke.
       */
      function undoLayer() {
          var canvases = [...document.querySelectorAll("canvas")];
          if (canvases.length > 0) {
              var lastCanvas = canvases.pop();
              if (lastCanvas.id !== "baseCanvas") {
                  $(`#${lastCanvas.parentElement.id}`).remove()
              }
          }
      }

      /**
       * Used to determine whether an overlaying canvas is, at least partially, covering the base canvas. Used with emojis and captions
       * @param {*} baseRect DOM rect object representing the base canvas
       * @param {*} topRect DOM rect object representing the overlaying canvas
       */
      function isCanvasOverlapping(baseRect, topRect) {
          return (
              baseRect.left <= topRect.right &&
              baseRect.top <= topRect.bottom &&
              baseRect.right >= topRect.left &&
              baseRect.bottom >= topRect.top
          );
      }

      /**
       * Handles when the emoji tab is clicked on the bottom toolbar
       */
      $("#emojis").on("click", function (e) {
          var captions = document.querySelectorAll(".caption-canvas");
          if (captions && captions.length > 0) {
              drawCaptionsToCanvas();
          }
          //$("#baseCanvas").off();
          removeAllHandlers();
          if (current_overlay_canvas) $(`#${current_overlay_canvas.id}`).off();
          $("li#draw").removeClass("active");
          $("li#caption").removeClass("active");
          $("li#emojis").addClass("active");

          $(`#undoButton`).removeClass(`disabled`);
          $(".caption-overlay.snapchat").remove();
          $("#emoji-container").fadeIn(200);
          if (activeTabIndex === 1) {
              $("#draw-container").fadeOut(300, function () {
                  this.remove();
              });
              $("#tool-tab-content").append($("#emoji-container-template").html());
          } else if (activeTabIndex === 2) {
              $("#caption-container").fadeOut(300, function () {
                  this.remove();
              });
              $("#tool-tab-content").append($("#emoji-container-template").html());
          }
          var emojiList = document.getElementsByClassName("hex-emoji");
          for (var i = 0; i < emojiList.length; i++) {
              emojiList[i].addEventListener("click", handleEmojiListClick);
          }
          activeTabIndex = 0;
          removeOverlayingCaptionCanvases();
          removeCanvasPointerEvents();
      });

      var templateHTML = $("#emoji-container-template").html();

      $("#tool-tab-content").append(templateHTML);

      var emojiList = document.getElementsByClassName("hex-emoji");
      for (var i = 0; i < emojiList.length; i++) {
          emojiList[i].addEventListener("click", handleEmojiListClick);
      }

      /**
       * Handles when an emoji is clicked. Adds an overlaying canvas representing an emoji to the DOM and adds handlers
       * @param {*} e Click event
       */
      function handleEmojiListClick(e) {
          if (emojiCanvasCounter <= 35) {
              $("#parent-container")
                  .append(`<div id="emoji-canvas-container${emojiCanvasCounter}" class="stretch-x emoji-canvas-container">
                <canvas id="emojiCanvas${emojiCanvasCounter}" class="emoji-canvas"></canvas>
                <span class="delete-emoji">
                <img src="./src/icons/red-cancel-48.png"/></span>

                <span class="rotate-emoji">
                <img src="./src/icons/blue-rotate-48.png"/></span>

                <span class="resize-emoji">
                <img src="./src/icons/actions-expand-512.png"/></span>
            <div class="stretch-y">
              <span class="hidden-emoji" id="target-emoji${emojiCanvasCounter}">${
            e.target.textContent
          }</span>
            </div>
          </div>`);

              var emoji_canvas = document.getElementById(
                  "emojiCanvas" + emojiCanvasCounter
              );
              var emoji_context = emoji_canvas.getContext("2d");

              var eCanvasContainer = $(
                  "#emoji-canvas-container" + emojiCanvasCounter
              );

              eCanvasContainer.css({
                  "z-index": (manipulationNumber + 1) * 10 + emojiCanvasCounter * 10 + 2
              });

              var fontSize = 175;
              var targetEmoji = $(`#target-emoji${emojiCanvasCounter}`);
              targetEmoji.css({
                  "font-size": fontSize + "px"
              });
              emoji_canvas.width = eCanvasContainer.width();
              emoji_canvas.height = eCanvasContainer.height();
              emoji_context.font = `${fontSize}px Arial`;
              emoji_context.fillText(e.target.textContent, 0, fontSize);

              emojiArray.push({
                  id: "emoji-canvas-container" + emojiCanvasCounter,
                  emoji_code: e.target.textContent,
                  angle: 0,
                  font: fontSize,
                  width: emoji_canvas.width,
                  height: emoji_canvas.height
              });

              eCanvasContainer.hover(
                  function () {
                      $(".delete-emoji").addClass("active");
                      $(".rotate-emoji").addClass("active");
                      $(".resize-emoji").addClass("active");
                  },
                  function () {
                      $(".delete-emoji").removeClass("active");
                      $(".rotate-emoji").removeClass("active");
                      $(".resize-emoji").removeClass("active");
                  }
              );
              eCanvasContainer.draggable({
                  containment: "#parent-container"
              });

              $(
                  `#emoji-canvas-container${emojiCanvasCounter} .delete-emoji`
              ).mousedown(function (e) {
                  var ui = $("#" + this.parentElement.id);
                  ui.off();
                  ui.remove();
              });

              $(
                  "#emoji-canvas-container" + emojiCanvasCounter + " .resize-emoji"
              ).mousedown(function (e) {
                  emojiCurrentlyResizing = this.parentElement.id;
                  isResizingEmoji = true;
                  var ui = $("#" + this.parentElement.id);
                  var hiddenEmoji = ui.find("span.hidden-emoji");
                  var emojiCanvas = ui.find("canvas");
                  var resizingIndex = getEmojiIndexByID(this.parentElement.id);
                  if (emojiCurrentlyResizing && resizingIndex !== -1) {
                      startResizingEmoji(
                          e,
                          $("#" + this.parentElement.id),
                          hiddenEmoji,
                          emojiCanvas,
                          resizingIndex
                      );
                  }
              });

              $(
                  `#emoji-canvas-container${emojiCanvasCounter} .rotate-emoji`
              ).mousedown(function (e) {
                  emojiCurrentlyRotating = this.parentElement.id;
                  isEmojiRotating = true;
                  startRotatingEmoji(e, $("#" + emojiCurrentlyRotating));
              });

              emojiCanvasCounter += 1; // Increment the counter
              emojiCanvasLeftOffset += 32; // Increase the offset to stagger newly created emojis
              isOverlayChanged = true;
          } else {
              alert("Too many emojis present!!! Can't create any more.");
          }
      }

      /**
       * Called when emoji is being resized
       * @param {*} e Click event
       * @param {*} ui jQuery object
       * @param {*} hiddenEmoji Underlaying emoji
       * @param {*} emojiCanvas Canvas
       * @param {*} resizingIndex index of the emoji being resized
       */
      function startResizingEmoji(
          e,
          ui,
          hiddenEmoji,
          emojiCanvas,
          resizingIndex
      ) {
          hiddenEmoji.width(e.clientX - ui.offset().left);
          hiddenEmoji.height(e.clientX - ui.offset().left);
          ui.draggable("disable");
          ui.addClass("active");
      }

      /**
       * Called when emoji has stopped resizing
       * @param {*} e Click event
       * @param {*} ui jQuery object
       * @param {*} hiddenEmoji Underlaying emoji
       * @param {*} emojiCanvas Canvas
       * @param {*} resizingIndex index of the emoji being resized
       */
      function stopResizingEmoji(
          e,
          ui,
          hiddenEmoji,
          emojiCanvas,
          resizingIndex
      ) {
          isResizingEmoji = false;
          emojiCurrentlyResizing = null;
          window.removeEventListener("mousemove", startResizingEmoji, false);
          window.removeEventListener("mouseup", stopResizingEmoji, false);
          var containerID = ui.get(0).id;
          var czIndex = ui.css("z-index");
          var canvasID = ui.find("canvas")[0].id;
          var ezIndex = $(`#${canvasID}`).css("z-index");
          var hiddenEmojiID = ui.find(`span.hidden-emoji`)[0].id;
          var emojiIndex = getEmojiIndexByID(containerID);
          var emojiCode = emojiArray[emojiIndex].emoji_code;
          var fontSize = e.clientX - ui.offset().left;
          ui.remove();
          $("#parent-container")
              .append(`<div id="${containerID}" class="stretch-x emoji-canvas-container">
                <canvas id="${canvasID}" class="emoji-canvas"></canvas>
                <span class="delete-emoji">
                <img src="./src/icons/red-cancel-48.png"/></span>

                <span class="rotate-emoji">
                <img src="./src/icons/blue-rotate-48.png"/></span>

                <span class="resize-emoji">
                <img src="./src/icons/actions-expand-512.png"/></span>
            <div class="stretch-y">
              <span class="hidden-emoji" id="${hiddenEmojiID}">${emojiCode}</span>
            </div>
          </div>`);

          var emojiCanvas = document.getElementById(canvasID);
          var emojiContext = emojiCanvas.getContext("2d");

          var eContainer = $(`#${containerID}`);

          eContainer.css({
              "z-index": czIndex
          });

          var targetEmoji = $(`#${hiddenEmojiID}`);
          targetEmoji.css({
              "font-size": fontSize + "px"
          });
          emojiCanvas.width = eContainer.width();
          emojiCanvas.height = eContainer.height();
          emojiContext.font = `${fontSize}px Arial`;
          emojiContext.fillText(emojiArray[emojiIndex].emoji_code, 0, fontSize);
          emojiArray[emojiIndex].width = emojiCanvas.width;
          emojiArray[emojiIndex].height = emojiCanvas.height;
          emojiArray[emojiIndex].font = fontSize;

          eContainer.hover(
              function () {
                  $(".delete-emoji").addClass("active");
                  $(".rotate-emoji").addClass("active");
                  $(".resize-emoji").addClass("active");
              },
              function () {
                  $(".delete-emoji").removeClass("active");
                  $(".rotate-emoji").removeClass("active");
                  $(".resize-emoji").removeClass("active");
              }
          );
          eContainer.draggable({
              containment: "#parent-container"
          });

          $(`#${containerID} .delete-emoji`).mousedown(function (e) {
              var ui = $("#" + containerID);
              ui.off();
              ui.remove();
          });

          $(`#${containerID} .resize-emoji `).mousedown(function (e) {
              emojiCurrentlyResizing = containerID;
              isResizingEmoji = true;
              var ui = $("#" + containerID);
              var hiddenEmoji = ui.find("span.hidden-emoji");
              var emojiCanvas = ui.find("canvas");
              var resizingIndex = emojiIndex;
              if (emojiCurrentlyResizing && resizingIndex !== -1) {
                  startResizingEmoji(e, ui, hiddenEmoji, emojiCanvas, resizingIndex);
              }
          });

          $(`#${containerID} .rotate-emoji `).mousedown(function (e) {
              emojiCurrentlyRotating = containerID;
              isEmojiRotating = true;
              startRotatingEmoji(e, eContainer);
          });
      }

      /**
       * Window event called when the mouse moves while emoji is being resized
       */
      $(window).mousemove(function (e) {
          if (isResizingEmoji && emojiCurrentlyResizing) {
              startResizingEmoji(
                  e,
                  $("#" + emojiCurrentlyResizing),
                  $("#" + emojiCurrentlyResizing).find("span.hidden-emoji"),
                  $("#" + emojiCurrentlyResizing).find("canvas"),
                  getEmojiIndexByID(emojiCurrentlyResizing)
              );
          }
          if (isEmojiRotating === true && emojiCurrentlyRotating) {
              rotateEmoji(
                  e,
                  $("#" + emojiCurrentlyRotating),
                  getEmojiIndexByID(emojiCurrentlyRotating)
              );
          }
      });

      /**
       * Window event called when the mouse up event occurs while emoji is being resized
       */
      $(window).mouseup(function (e) {
          if (isResizingEmoji && emojiCurrentlyResizing) {
              stopResizingEmoji(
                  e,
                  $("#" + emojiCurrentlyResizing),
                  $("#" + emojiCurrentlyResizing).find("span.hidden-emoji"),
                  $("#" + emojiCurrentlyResizing).find("canvas"),
                  getEmojiIndexByID(emojiCurrentlyResizing)
              );
          }
          if (isEmojiRotating === true && emojiCurrentlyRotating) {
              stopRotatingEmoji(
                  e,
                  $("#" + emojiCurrentlyRotating),
                  getEmojiIndexByID(emojiCurrentlyRotating)
              );
              isEmojiRotating = false;
              emojiCurrentlyRotating = null;
          }
      });

      var R2D,
          rotateActive,
          angle,
          center,
          init,
          rotate,
          rotation,
          start,
          startAngle,
          stop;

      rotateActive = false;

      angle = 0;

      rotation = 0;

      startAngle = 0;

      center = {
          x: 0,
          y: 0
      };

      var currentCanvas = null,
          currentContext = null;

      R2D = 180 / Math.PI;

      /**
       * Called when an emoji is being rotated
       * @param {*} e DOM event
       * @param {*} eCanvasContainer emoji canvas container containing the element being rotated
       */
      function startRotatingEmoji(e, eCanvasContainer) {
          var height, left, top, width, x, y, _ref;
          e.preventDefault();
          eCanvasContainer.draggable("disable");
          (_ref = eCanvasContainer[0].getBoundingClientRect()),
          (top = _ref.top),
          (left = _ref.left),
          (height = _ref.height),
          (width = _ref.width);
          center = {
              x: left + width / 2,
              y: top + height / 2
          };
          x = e.clientX - center.x;
          y = e.clientY - center.y;
          startAngle = R2D * Math.atan2(y, x);
          currentCanvas = eCanvasContainer
              .get(0)
              .getElementsByClassName("emoji-canvas")[0];
          currentContext = currentCanvas.getContext("2d");
          return (rotateActive = true);
      }

      /**
       * Called as emoji is being rotated
       * @param {*} e DOM event
       * @param {*} eCanvasContainer emoji canvas container containing the element being rotated
       * @param {*} emojiIndex The index of the emoji being rotated. Used to keep track so that only a specific emoji is rotated and not all of them.
       */
      function rotateEmoji(e, eCanvasContainer, emojiIndex) {
          var d, x, y;
          e.preventDefault();
          x = e.clientX - center.x;
          y = e.clientY - center.y;
          d = R2D * Math.atan2(y, x);
          rotation = d - startAngle;
          if (rotateActive) {
              requestAnimationFrame(function () {
                  currentContext.clearRect(
                      0,
                      0,
                      currentContext.canvas.width,
                      currentContext.canvas.height
                  );

                  currentContext.translate(
                      currentContext.canvas.width / 2,
                      currentContext.canvas.width / 2
                  );
                  currentContext.rotate((rotation * 0.1 * Math.PI) / 180);
                  currentContext.translate(
                      -(currentContext.canvas.width / 2),
                      -(currentContext.canvas.width / 2)
                  );
                  currentContext.font = `${emojiArray[emojiIndex].font}px Arial`;
                  currentContext.fillText(
                      emojiArray[emojiIndex].emoji_code,
                      0,
                      emojiArray[emojiIndex].font
                  );
              });
          }
      }

      /**
       * Called when an emoji has stopped rotating. Handlers need to be removed and re-added
       * @param {*} e DOM event
       * @param {*} eCanvasContainer emoji canvas container containing the element being rotated
       * @param {*} emojiIndex The index of the emoji being rotated. Used to keep track so that only a specific emoji is rotated and not all of them.
       */
      function stopRotatingEmoji(e, eCanvasContainer, emojiIndex) {
          e.preventDefault();
          emojiArray[emojiIndex].angle += rotation;
          eCanvasContainer.draggable("enable");
          rotateActive = false;
          isEmojiRotating = false;
          emojiCurrentlyRotating = "";
          $(`#${eCanvasContainer.get(0).id} .delete-emoji`).mousedown(function (
              e
          ) {
              var ui = $("#" + this.parentElement.id);
              ui.off();
              ui.remove();
          });

          $(`#${eCanvasContainer.get(0).id} .resize-emoji `).mousedown(function (
              e
          ) {
              emojiCurrentlyResizing = this.parentElement.id;
              isResizingEmoji = true;
              var ui = $("#" + emojiCurrentlyResizing);
              var hiddenEmoji = ui.find("span.hidden-emoji");
              var emojiCanvas = ui.find("canvas");
              var resizingIndex = emojiIndex;
              if (emojiCurrentlyResizing && resizingIndex !== -1) {
                  startResizingEmoji(e, ui, hiddenEmoji, emojiCanvas, resizingIndex);
              }
          });

          $(`#${eCanvasContainer.get(0).id} .rotate-emoji `).mousedown(function (
              e
          ) {
              emojiCurrentlyRotating = eCanvasContainer.get(0).id;
              isEmojiRotating = true;
              startRotatingEmoji(e, eCanvasContainer);
          });
          return rotateActive;
      }

      /**
       * Gets the index of an emoji by its ID in the DOM 
       * @param {*} ID ID of DOM element containing emoji
       */
      function getEmojiIndexByID(ID) {
          for (var i = 0; i < emojiArray.length; i++) {
              if (emojiArray[i].id === ID) return i;
          }
          return -1;
      }

      /**
       * Draws all emoji canvases to one overlaying canvas
       */
      function drawEmojisToCanvas() {
          if (activeTabIndex === 0) {
              addOverlay(base_canvas, "emoji");
              var baseRect = base_canvas.getBoundingClientRect();
              var overlayRect = current_overlay_canvas.getBoundingClientRect();
              var emojiCanvases = [
                  ...document.querySelectorAll(".emoji-canvas")
              ].forEach(emoji => {
                  var topRect = emoji.getBoundingClientRect();
                  current_overlay_context.drawImage(
                      emoji,
                      topRect.left - overlayRect.left,
                      topRect.top - overlayRect.top
                  );
              });
          }
      }

      /**
       * prevents an element from receiving the focus event
       * @param {*} event DOM event
       */
      function preventFocus(event) {
          event.preventDefault();
          if (event.relatedTarget) {
              // Revert focus back to previous blurring element
              event.relatedTarget.focus();
          } else {
              // No previous focus target, blur instead
              event.currentTarget.blur();
          }
      }

      var colorPickerDisplay = null;

      /**
       * Handles when the draw tab is clicked on the bottom toolbar. Adds templates and handlers.
       */
      $("#draw").on("click", function (e) {
          removeAllHandlers()

          $("li#emojis").removeClass("active");
          $("li#caption").removeClass("active");
          $("li#draw").addClass("active");
          $(".caption-overlay.snapchat").remove();
          window.scrollTo({
              top: 0,
              left: 0,
              behavior: 'smooth'
          });

          $("#draw-container").fadeIn(200);
          if (activeTabIndex === 0) {
              var emojis = document.querySelectorAll(".emoji-canvas");
              if (emojis && emojis.length > 0) {
                  drawEmojisToCanvas();
              }
              $("#emoji-container").fadeOut(300, function () {
                  this.remove();
                  $("#tool-tab-content").append($("#draw-container-template").html());
                  if (currentDrawRGBValues) {
                      document.getElementById("redDrawColorSelector").value =
                          currentDrawRGBValues.red;
                      document.getElementById("greenDrawColorSelector").value =
                          currentDrawRGBValues.green;
                      document.getElementById("blueDrawColorSelector").value =
                          currentDrawRGBValues.blue;
                      colorPickerDisplay = document.getElementById("colorDrawDisplay");
                      colorPickerDisplay.style.background = `rgba(${
                currentDrawRGBValues.red
              }, ${currentDrawRGBValues.green}, ${
                currentDrawRGBValues.blue
              }, 1)`;
                  }
                  if (currentClickSize) {
                      document.getElementById(
                          "strokeWidthSelector"
                      ).value = currentClickSize;
                  }
                  initiateDrawColorPicker();
                  initializeBrush();
                  initiateDrawTools();
              });
          } else if (activeTabIndex === 2) {
              var captions = document.querySelectorAll(".caption-canvas");
              if (captions && captions.length > 0) {
                  drawCaptionsToCanvas();
              }
              $("#caption-container").fadeOut(300, function () {
                  this.remove();
                  $("#tool-tab-content").append($("#draw-container-template").html());
                  if (currentDrawRGBValues) {
                      document.getElementById("redDrawColorSelector").value =
                          currentDrawRGBValues.red;
                      document.getElementById("greenDrawColorSelector").value =
                          currentDrawRGBValues.green;
                      document.getElementById("blueDrawColorSelector").value =
                          currentDrawRGBValues.blue;
                      colorPickerDisplay = document.getElementById("colorDrawDisplay");
                      colorPickerDisplay.style.background = `rgba(${
                currentDrawRGBValues.red
              }, ${currentDrawRGBValues.green}, ${
                currentDrawRGBValues.blue
              }, 1)`;
                  }
                  if (currentClickSize) {
                      document.getElementById(
                          "strokeWidthSelector"
                      ).value = currentClickSize;
                  }
                  initiateDrawColorPicker();
                  initializeBrush();
                  initiateDrawTools();
              });
          }
          clickX = new Array();
          clickY = new Array();
          clickDrag = new Array();
          clickColor = new Array();
          clickSize = new Array();
          eraseX = new Array();
          eraseY = new Array();
          eraseWidth = new Array();
          isDrawing = false;
          if (current_overlay_canvas) {
              $(`#${current_overlay_canvas.id}`).off();
          }
          setTimeout(() => { //<--- sets a timeout to wait for draw controls to fully render
              attachDrawHandlers();
          }, 2200);

          removeOverlayingEmojiCanvases();
          removeOverlayingCaptionCanvases();
          addCanvasPointerEvents();
          activeTabIndex = 1;
      });

      var foo = false;

      /**
       * Attaches draw handlers to drawing area
       */
      function attachDrawHandlers() {
          if (current_overlay_canvas) {
              $(`#${current_overlay_canvas.id}`).off();
          }
          addOverlay(base_canvas, "draw");
          $(`#${current_overlay_canvas.id}`).on("mouseleave", function (e) {
              var canvases = [...document.querySelectorAll(".overlay-container")]
              var lastCanvas = canvases.pop();
              $(`#${lastCanvas.id}`).remove();
              foo = true;
              if (canvases.length > 0) {
                  $(`#${canvases[canvases.length-1].id}`).on("mouseenter", function (e) {
                      if (foo) {
                          attachDrawHandlers();
                          foo = false;
                      }
                  });
              } else {
                  $(`#${base_canvas.id}`).on("mouseenter", function (e) {
                      if (foo) {
                          attachDrawHandlers();
                          foo = false;
                      }
                  });
              }
          });
          $(`#${current_overlay_canvas.id}`).on("mousedown", drawHandler);
          $(`#${current_overlay_canvas.id}`).on("mousemove", function (e) {
              redraw(current_overlay_context);
              drawCursor(
                  base_canvas,
                  current_overlay_canvas,
                  current_overlay_context,
                  e,
                  currentClickSize
              );
          });
      }

      /**
       * Called when a brush stroke first occurs
       * @param {*} e DOM event
       */
      var drawHandler = function (e) {
          var rect = this.getBoundingClientRect();
          var mouseX = e.pageX - rect.left;
          var mouseY = e.pageY - rect.top;

          isDrawing = true;
          if (currentTool !== document.getElementById("dropperButton").value) {
              isOverlayChanged = true;
          }
          addClick(e.pageX - rect.left, e.pageY - rect.top);
          redraw(current_overlay_context);
          $(`#${current_overlay_canvas.id}`).on("mousemove", drawMoveHandler);
          $(`#${current_overlay_canvas.id}`).on("mouseup", function (e) {
              redraw(current_overlay_context);
              isOverlayChanged = false;
              $(`#${current_overlay_canvas.id}`).off(); // Remove event handlers from old overlay
              attachDrawHandlers();
              isDrawing = false;
          });
          $(`#${current_overlay_canvas.id}`).on("mouseleave", function (e) {
              redraw(current_overlay_context);
              isOverlayChanged = false;
              $(`#${current_overlay_canvas.id}`).off(); // Remove event handlers from old overlay
              attachDrawHandlers();
              isDrawing = false;
          });
      };

      /**
       * Called when the mouse is moving while a brush stroke is occuring
       * @param {*} e DOM event
       */
      var drawMoveHandler = function (e) {
          var rect = this.getBoundingClientRect();
          addClick(e.pageX - rect.left, e.pageY - rect.top, true);
          redraw(current_overlay_context);
          drawCursor(
              base_canvas,
              current_overlay_canvas,
              current_overlay_context,
              e,
              currentClickSize
          );
      };

      /**
       * Adds mouse click to either the array of erased paths, array of brush stroke paths, or if dropper selected gets the color at that point
       * @param {*} x X location of click event on the draw area
       * @param {*} y Y location of click event on the draw area
       * @param {*} dragging  boolean representing if the mouse is being dragged
       */
      function addClick(x, y, dragging) {
          if (currentTool === document.getElementById("eraserButton").value) {
              eraseCanvas(
                  base_context,
                  current_overlay_context,
                  x,
                  y,
                  currentClickSize
              );
              eraseX.push(x);
              eraseY.push(y);
              eraseWidth.push(currentClickSize);
          } else if (
              currentTool === document.getElementById("dropperButton").value
          ) {
              getColorAtPoint(x, y, base_context);
          } else {
              clickX.push(x);
              clickY.push(y);
              clickDrag.push(dragging);
              clickSize.push(currentClickSize);
              clickColor.push(
                  `rgba(${currentDrawRGBValues.red}, ${currentDrawRGBValues.green}, ${
              currentDrawRGBValues.blue
            }, 1)`
              );
          }
      }

      /**
       * redraws the canvas
       * @param {*} ctx Context of canvas being redrawn
       */
      function redraw(ctx) {
          if (ctx) {
              ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
              ctx.lineJoin = "round";

              for (var i = 0; i < clickX.length; i++) {
                  ctx.beginPath();
                  if (clickDrag[i] && i) {
                      ctx.moveTo(clickX[i - 1], clickY[i - 1]);
                  } else {
                      ctx.moveTo(clickX[i] - 1, clickY[i]);
                  }
                  ctx.lineTo(clickX[i], clickY[i]);
                  ctx.closePath();
                  ctx.strokeStyle = clickColor[i];
                  ctx.lineWidth = clickSize[i] || "5";
                  ctx.stroke();
              }
              for (var i = 0; i < eraseX.length; i++) {
                  eraseCanvas(
                      base_context,
                      current_overlay_context,
                      eraseX[i],
                      eraseY[i],
                      eraseWidth[i]
                  );
              }
          }
      }

      /**
       * "Erases" given points on the overlaying canvas. It does this by directly drawing the pixels from the bottom canvas to the top canvas
       * @param {*} bottomCtx Context of the bottom canvas
       * @param {*} topCtx Context of the top canvas
       * @param {*} x X coordinate of mouse on drawing area
       * @param {*} y Y coordinate of mouse on drawing area
       * @param {*} strokeWidth Width of the brush stroke as specified on the bottom toolbar
       */
      function eraseCanvas(bottomCtx, topCtx, x, y, strokeWidth) {
          var bottomPixels = bottomCtx.getImageData(
              x,
              y,
              strokeWidth,
              strokeWidth
          );

          // Directly draw bottomPixels from bottomCtx into topCtx, at the
          // x,y coordinates, with 0,0 offset, between dimensions of
          // strokeWidth x strokeWidth
          topCtx.putImageData(bottomPixels, x, y, 0, 0, strokeWidth, strokeWidth);
      }

      /**
       * Draws the cursor that hovers over the draw area when in draw tab. Cursor is a circle in draw and color dopper mode, square in eraser mode
       * @param {*} baseCanv Base canvas element
       * @param {*} overlayCanv Overlaying canvas element
       * @param {*} overlayCtx Overlaying canvas context
       * @param {*} event DOM event
       * @param {*} strokeWidth Width of the brush stroke as specified on the bottom toolbar
       */
      function drawCursor(
          baseCanv,
          overlayCanv,
          overlayCtx,
          event,
          strokeWidth
      ) {
          if (baseCanv && overlayCanv && overlayCtx && event && strokeWidth) {
              var rect = base_canvas.getBoundingClientRect();
              cursorX = event.clientX - rect.left;
              cursorY = event.clientY - rect.top;
              if (
                  document.getElementById("eraserButton") &&
                  currentTool === document.getElementById("eraserButton").value
              ) {
                  overlayCtx.fillStyle = "#FF6A6A";
                  overlayCtx.fillRect(cursorX, cursorY, strokeWidth, strokeWidth);
              } else if (
                  document.getElementById("dropperButton") &&
                  currentTool === document.getElementById("dropperButton").value
              ) {
                  overlayCtx.beginPath();
                  overlayCtx.arc(cursorX, cursorY, 10 * 0.5, 0, 2 * Math.PI, true);
                  overlayCtx.lineWidth = 2;
                  overlayCtx.strokeStyle = "rgba(255, 106, 106, 0.85)";
                  overlayCtx.stroke();
              } else {
                  overlayCtx.beginPath();
                  overlayCtx.arc(
                      cursorX,
                      cursorY,
                      strokeWidth * 0.5,
                      0,
                      2 * Math.PI,
                      true
                  );
                  overlayCtx.fillStyle = "#FF6A6A";
                  overlayCtx.fill();
              }
          }
      }

      /**
       * Used by the dropper tool to get the color at a point
       * @param {*} posX represents x position of the click event
       * @param {*} posY represents y position of the click event
       * @param {*} ctx ctx of base canvas
       */
      function getColorAtPoint(posX, posY, ctx) {
          var x = event.layerX;
          var y = event.layerY;
          var pixel = ctx.getImageData(x, y, 1, 1);
          var data = pixel.data;
          var red = data[0],
              green = data[1],
              blue = data[2],
              alpha = data[3] / 255;
          document.getElementById("redDrawColorSelector").value = red;
          document.getElementById("greenDrawColorSelector").value = green;
          document.getElementById("blueDrawColorSelector").value = blue;
          var rgba = `rgba(${red}, ${green}, ${blue}, 1)`;
          document.getElementById("colorDrawDisplay").style.background = rgba;
          currentDrawRGBValues = {
              red: red,
              green: green,
              blue: blue,
              alpha: "1"
          };
      }

      /**
       * Adds the handlers to the color picker in the draw tab
       */
      function initiateDrawColorPicker() {
          var colorPickerInputArray = document.querySelectorAll(
              "input.color-input"
          );
          var red = document.getElementById("redDrawColorSelector").value;
          var green = document.getElementById("greenDrawColorSelector").value;
          var blue = document.getElementById("blueDrawColorSelector").value;
          colorPickerDisplay = document.getElementById("colorDrawDisplay");
          if (colorPickerDisplay && red && green && blue) {
              colorPickerDisplay.style.background = `rgba(${red}, ${green}, ${blue}, 1)`;
          }
          if (colorPickerInputArray && colorPickerInputArray.length > 0) {
              for (var i = 0; i < colorPickerInputArray.length; i++) {
                  colorPickerInputArray[i].addEventListener("input", function () {
                      red = document.getElementById("redDrawColorSelector").value;
                      green = document.getElementById("greenDrawColorSelector").value;
                      blue = document.getElementById("blueDrawColorSelector").value;
                      colorPickerDisplay = document.getElementById("colorDrawDisplay");
                      if (colorPickerDisplay && red && green && blue) {
                          colorPickerDisplay.style.background = `rgba(${red}, ${green}, ${blue}, 1)`;
                          currentDrawRGBValues = {
                              red: red,
                              green: green,
                              blue: blue,
                              alpha: "1"
                          };
                      }
                  });
              }
          }
          currentDrawRGBValues = {
              red: red,
              green: green,
              blue: blue
          };
      }

      /**
       * Adds handler to the stroke width slider in the draw tab
       */
      function initializeBrush() {
          var brushPickerInputArray = document.querySelectorAll(
              "input.brush-input"
          );
          currentClickSize = document.getElementById("strokeWidthSelector").value;
          if (brushPickerInputArray && brushPickerInputArray.length > 0) {
              for (var j = 0; j < brushPickerInputArray.length; j++) {
                  brushPickerInputArray[j].addEventListener("input", function () {
                      currentClickSize = document.getElementById("strokeWidthSelector")
                          .value;
                  });
              }
          }
      }

      /**
       * Adds handler to the tool tabs. For example, how the mouse reacts when the eraser tool is selected vs the draw tool and dropper tool
       */
      function initiateDrawTools() {
          $("#markerButton").button("toggle");
          currentTool = document.getElementById("markerButton").value;
          var drawInputArray = document.querySelectorAll("#draw-tools .btn");
          for (var i = 0; i < drawInputArray.length; i++) {
              if (drawInputArray && drawInputArray.length > 0) {
                  drawInputArray[i].addEventListener("click", function () {
                      currentTool = document.getElementById(this.children[0].id).value;
                      switch (currentTool) {
                          case document.getElementById("eraserButton").value:
                              var colorPickerInputArray = document.querySelectorAll(
                                  "input.color-input"
                              );
                              for (var i = 0; i < colorPickerInputArray.length; i++) {
                                  colorPickerInputArray[i].disabled = true;
                              }
                              break;
                          case document.getElementById("dropperButton").value:
                              var colorPickerInputArray = document.querySelectorAll(
                                  "input.color-input"
                              );
                              for (var i = 0; i < colorPickerInputArray.length; i++) {
                                  colorPickerInputArray[i].disabled = true;
                              }
                              break;
                          default:
                              var colorPickerInputArray = document.querySelectorAll(
                                  "input.color-input"
                              );
                              for (var i = 0; i < colorPickerInputArray.length; i++) {
                                  colorPickerInputArray[i].disabled = false;
                              }
                      }
                  });
              }
          }
      }

      var currentColorRGBValues = null;
      var colorPickerDisplay = null;

      /**
       * Handles when the caption tab is selected in the bottom toolbar
       */
      $("#caption").on("click", function (e) {
          removeAllHandlers();

          $("li#emojis").removeClass("active");
          $("li#draw").removeClass("active");
          $("li#caption").addClass("active");

          $("#caption-container").fadeIn(200);
          if (activeTabIndex === 0) {
              var emojis = document.querySelectorAll(".emoji-canvas");
              if (emojis && emojis.length > 0) {
                  drawEmojisToCanvas();
              }
              $("#emoji-container").fadeOut(300, function () {
                  this.remove();
                  $("#tool-tab-content").append(
                      $("#caption-container-template").html()
                  );
                  initiateCaptionColorPicker();
                  document
                      .getElementById("addCaptionButton")
                      .addEventListener("click", function (e) {
                          handleCaptionClick(
                              e,
                              "Enter Something",
                              true,
                              captionArray.length + 1
                          );
                      });
              });
          } else if (activeTabIndex === 1) {
              $("#draw-container").fadeOut(300, function () {
                  this.remove();
                  $("#tool-tab-content").append(
                      $("#caption-container-template").html()
                  );
                  initiateCaptionColorPicker();
                  document
                      .getElementById("addCaptionButton")
                      .addEventListener("click", function (e) {
                          handleCaptionClick(
                              e,
                              "Enter Something",
                              true,
                              captionArray.length + 1
                          );
                      });
              });
          }
          removeOverlayingEmojiCanvases();
          removeCanvasPointerEvents();
          current_overlay_canvas
              ?
              $(`#${current_overlay_canvas.id}`).off() :
              null; // Remove event handlers from overlay
          activeTabIndex = 2;
      });

      /**
       * Handles when the caption button is clicked. Creates an editable label in the draw area representing the caption.
       * @param {*} e DOM click event
       * @param {*} captionText The text in the caption
       * @param {*} shouldIncrementCaptionCount whether the caption counter should be incremented (if element first created) or not (if caption is just destroyed and re-added for example in a drag event)
       * @param {*} counter Keeps track of the number of captions in the draw area
       * @param {*} size size of the font in the caption
       * @param {*} caption represents the caption element itself
       * @param {*} xPosition x position of the caption
       * @param {*} yPosition y position of the caption
       */
      function handleCaptionClick(
          e,
          captionText,
          shouldIncrementCaptionCount,
          counter = null,
          size = null,
          caption = "",
          xPosition = 0,
          yPosition = 0
      ) {
          captionCanvasCounter = counter ? counter : captionCanvasCounter;
          if (captionCanvasCounter <= 35) {
              $("#parent-container")
                  .append(`<div id="caption-canvas-container${captionCanvasCounter}" class="stretch-x caption-canvas-container">
                <canvas id="captionCanvas${captionCanvasCounter}" class="caption-canvas"></canvas>
                <span class="delete-caption">
                <img src="./src/icons/red-cancel-48.png"/></span>

                <span class="increase-caption-size">
                <img src="./src/icons/purple-add-new-48.png"/></span>

                <span class="decrease-caption-size">
                <img src="./src/icons/purple-reduce-48.png"/></span>
            <div class="stretch-y editable-caption">
              <span class="hidden-caption" id="target-caption${captionCanvasCounter}">${captionText}</span>
            </div>
          </div>`);

              var caption_canvas = document.getElementById(
                  "captionCanvas" + captionCanvasCounter
              );
              var caption_context = caption_canvas.getContext("2d");
              var cCanvasContainer = $(
                  "#caption-canvas-container" + captionCanvasCounter
              );

              cCanvasContainer.css({
                  "z-index": (manipulationNumber + 1) * 10 + captionCanvasCounter * 10 + 4,
                  top: xPosition,
                  left: yPosition
              });


              cCanvasContainer.hover(function (e) {
                  cCanvasContainer.addClass("shakeable")
              }, function (e) {
                  cCanvasContainer.removeClass("shakeable")
              });

              var fontSize = size ? size : 32;
              var targetCaption = $(`#target-caption${captionCanvasCounter}`);
              targetCaption.css({
                  "font-family": "Verdana",
                  "font-size": fontSize + "px"
              });
              caption_canvas.width = cCanvasContainer.width();
              caption_canvas.height = cCanvasContainer.height();

              var captionIndex = getCaptionIndexByID(cCanvasContainer.get(0).id);
              if (captionIndex === -1) {
                  captionArray.push({
                      id: "caption-canvas-container" + captionCanvasCounter,
                      caption: "",
                      font: fontSize,
                      width: caption_canvas.width,
                      height: caption_canvas.height,
                      xPosition: xPosition,
                      yPosition: yPosition,
                      color: "rgb(255,255,255)"
                  });
              } else {
                  captionArray[captionIndex].font = fontSize;
                  captionArray[captionIndex].width = caption_canvas.width;
                  captionArray[captionIndex].height = caption_canvas.height;
              }

              targetCaption.addClass("nonactive-caption");

              cCanvasContainer.hover(
                  function () {
                      $(".delete-caption").addClass("active");
                      $(".increase-caption-size").addClass("active");
                      $(".decrease-caption-size").addClass("active");
                      $("div.editable-caption").css({
                          "border-style": "none"
                      });
                  },
                  function () {
                      $(".delete-caption").removeClass("active");
                      $(".increase-caption-size").removeClass("active");
                      $(".decrease-caption-size").removeClass("active");
                      $("div.editable-caption").css({
                          "border-style": "dashed",
                          "border-color": "rgb(0, 0, 0, 0.4)",
                          "border-width": "1px"
                      });
                  }
              );
              /**
               * On double click make the caption editable and make any text already in the caption disappear from view while captiojn is in focus
               */
              cCanvasContainer.on("dblclick", function () {
                  targetCaption.attr("contentEditable", true);
                  targetCaption.focus();
                  targetCaption.text("");
                  targetCaption.get(0).style.color = "rgba(0, 0, 0, 0.4)";
                  cCanvasContainer.draggable("disable");
                  cCanvasContainer.removeClass("shakeable")
                  captionArray[
                      getCaptionIndexByID(cCanvasContainer.get(0).id)
                  ].caption = "";
                  targetCaption.bind("DOMCharacterDataModified", clearText);
                  targetCaption.bind("keydown", setText);
              });

              /**
               * On focus out either add the caption the user entered or if empty, the default caption
               */
              targetCaption.focusout(e, function () {
                  var caption = $(`#${this.id}`);
                  var container = $("#" + this.parentElement.parentElement.id);
                  container.draggable("enable");
                  container.removeClass("shakeable")
                  var canvas = container.find("canvas").get(0);
                  var ctx = canvas.getContext("2d");
                  if (!caption.text()) {
                      caption.text("Enter Something");
                      caption.get(0).style.color = "rgba(0, 0, 0, 0.4)";
                      captionArray[getCaptionIndexByID(container.get(0).id)].caption =
                          "";
                      ctx.clearRect(0, 0, canvas.width, canvas.height);
                  } else {
                      var captionIndex = getCaptionIndexByID(container.get(0).id);
                      var text = caption.text();
                      if (captionIndex !== -1) {
                          captionArray[captionIndex].caption = text;
                      }
                      container.remove();
                      var xPos =
                          container.offset().left - $("#parent-container").offset().left;
                      var yPos =
                          container.offset().top - $("#parent-container").offset().top;
                      handleCaptionClick(
                          e,
                          text,
                          false,
                          captionIndex + 1,
                          captionArray[captionIndex].font,
                          "",
                          xPos,
                          yPos
                      );
                      container = $("#" + container.get(0).id);
                      canvas = container.find("canvas").get(0);
                      var ctx = canvas.getContext("2d");
                      document.getElementById(
                          `target-caption${captionIndex + 1}`
                      ).style.color = `rgba(0, 0, 0, 0)`;
                      var rect = canvas.getBoundingClientRect();

                      fontSize = fitTextOnCanvas(
                          ctx,
                          canvas,
                          text,
                          "Verdana",
                          captionArray[captionIndex].font,
                          `rgb(${currentColorRGBValues.red},${
                  currentColorRGBValues.green
                },${currentColorRGBValues.blue})`
                      );
                      captionArray[captionIndex].font = fontSize;
                      captionArray[captionIndex].caption = text;
                      captionArray[captionIndex].color = `rgb(${
                currentColorRGBValues.red
              },${currentColorRGBValues.green},${currentColorRGBValues.blue})`;
                  }
              });

              /**
               * Make caption draggable
               */
              cCanvasContainer.draggable({
                  containment: "#parent-container"
              });


              /**
               * Handles when the delete button of a caption is pressed
               */
              $(
                  `#caption-canvas-container${captionCanvasCounter} .delete-caption`
              ).mousedown(function (e) {
                  var ui = $("#" + this.parentElement.id);
                  ui.off();
                  ui.remove();
              });


              /**
               * Handles when the increase size button of a caption is pressed
               */
              $(
                  `#caption-canvas-container${captionCanvasCounter} .increase-caption-size`
              ).mousedown(function (e) {
                  var ui = $("#" + this.parentElement.id);
                  var hiddenCaption = ui.find("span.hidden-caption");
                  var captionCanvas = ui.find("canvas");
                  var resizingIndex = getCaptionIndexByID(this.parentElement.id);
                  if (resizingIndex !== -1) {
                      increaseCaptionSize(
                          e,
                          $("#" + this.parentElement.id),
                          hiddenCaption,
                          captionCanvas,
                          resizingIndex
                      );

                      captionCanvas = document.getElementById(captionCanvas.get(0).id);
                      hiddenCaption = $(`#${hiddenCaption.get(0).id}`);

                      if (captionArray[resizingIndex].caption) {
                          fontSize = fitTextOnCanvas(
                              captionCanvas.getContext("2d"),
                              captionCanvas,
                              hiddenCaption.text(),
                              "Verdana",
                              captionArray[resizingIndex].font,
                              captionArray[resizingIndex].color
                          );
                      }
                  }
              });

              /**
               * Handles when the increase size button of a caption is pressed
               */
              $(
                  `#caption-canvas-container${captionCanvasCounter} .decrease-caption-size`
              ).mousedown(function (e) {
                  var ui = $("#" + this.parentElement.id);
                  var hiddenCaption = ui.find("span.hidden-caption");
                  var captionCanvas = ui.find("canvas");
                  var resizingIndex = getCaptionIndexByID(this.parentElement.id);
                  if (resizingIndex !== -1) {
                      decreaseCaptionSize(
                          e,
                          $("#" + this.parentElement.id),
                          hiddenCaption,
                          captionCanvas,
                          resizingIndex
                      );

                      captionCanvas = document.getElementById(captionCanvas.get(0).id);
                      hiddenCaption = $(`#${hiddenCaption.get(0).id}`);

                      if (captionArray[resizingIndex].caption) {
                          fontSize = fitTextOnCanvas(
                              captionCanvas.getContext("2d"),
                              captionCanvas,
                              hiddenCaption.text(),
                              "Verdana",
                              captionArray[resizingIndex].font,
                              captionArray[resizingIndex].color
                          );
                      }
                  }
              });

              captionCanvasCounter = shouldIncrementCaptionCount ?
                  captionCanvasCounter + 1 :
                  captionCanvasCounter; // Increment the counter
              isOverlayChanged = true;
          } else {
              alert("Too many captions present!!! Can't create any more.");
          }
      }

      /**
       * Clears the text in a caption
       * @param {*} e DOM event
       */
      function clearText(e) {
          var canvas = $(`#${e.target.parentElement.parentElement.id}`)
              .find("canvas")
              .get(0);
          canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
          $("#" + e.target.id).unbind("DOMCharacterDataModified", clearText);
      }

      /**
       * Sets the text in a caption
       * @param {*} event DOM event
       */
      function setText(event) {
          var keycode = event.keyCode;
          if (keycode === 13) {
              $("#" + event.target.id).unbind("keydown", setText);
              document.getElementById(event.target.id).blur();
          }
      }

      /**
       * Increases the size of the text in a caption
       * @param {*} e DOM event
       * @param {*} ui jQuery object representing the caption container
       * @param {*} hiddenCaption represents the invisible caption in the caption element. This is the trick that really causes the caption container to shrink and expand as caption text size changes.
       * @param {*} captionCanvas represents the canvas area that the caption is drawn too
       * @param {*} resizingIndex the index of the caption
       */
      function increaseCaptionSize(
          e,
          ui,
          hiddenCaption,
          captionCanvas,
          resizingIndex
      ) {
          var xPos = ui.offset().left - $("#parent-container").offset().left;
          var yPos = ui.offset().top - $("#parent-container").offset().top;
          var captionID = ui.get(0).id;
          ui.remove();
          var newFontSize = captionArray[resizingIndex].font + 4;
          handleCaptionClick(
              e,
              hiddenCaption.text(),
              false,
              getCaptionIndexByID(captionID) + 1,
              newFontSize,
              "",
              xPos,
              yPos
          );
          if (captionArray[getCaptionIndexByID(captionID)].caption) {
              var caption = $(
                  `#target-caption${getCaptionIndexByID(captionID) + 1}`
              );
              caption.css({
                  color: "rgba(0, 0, 0, 0)"
              });
          } else {
              var caption = $(
                  `#target-caption${getCaptionIndexByID(captionID) + 1}`
              );
              caption.css({
                  color: "rgba(0, 0, 0, 0.4)"
              });
          }
      }

      /**
       * Decreases the size of the text in a caption
       * @param {*} e DOM event
       * @param {*} ui jQuery object representing the caption container
       * @param {*} hiddenCaption represents the invisible caption in the caption element. This is the trick that really causes the caption container to shrink and expand as caption text size changes.
       * @param {*} captionCanvas represents the canvas area that the caption is drawn too
       * @param {*} resizingIndex the index of the caption
       */
      function decreaseCaptionSize(
          e,
          ui,
          hiddenCaption,
          captionCanvas,
          resizingIndex
      ) {
          var xPos = ui.offset().left - $("#parent-container").offset().left;
          var yPos = ui.offset().top - $("#parent-container").offset().top;
          var captionID = ui.get(0).id;
          ui.remove();
          var newFontSize =
              captionArray[resizingIndex].font >= 24 ?
              captionArray[resizingIndex].font - 4 :
              captionArray[resizingIndex].font;
          handleCaptionClick(
              e,
              hiddenCaption.text(),
              false,
              getCaptionIndexByID(captionID) + 1,
              newFontSize,
              "",
              xPos,
              yPos
          );

          if (captionArray[getCaptionIndexByID(captionID)].caption) {
              var caption = $(
                  `#target-caption${getCaptionIndexByID(captionID) + 1}`
              );
              caption.css({
                  color: "rgba(0, 0, 0, 0)"
              });
          } else {
              var caption = $(
                  `#target-caption${getCaptionIndexByID(captionID) + 1}`
              );
              caption.css({
                  color: "rgba(0, 0, 0, 0.4)"
              });
          }
      }

      /**
       * Adds the handlers to the color picker in the caption tab
       */
      function initiateCaptionColorPicker() {
          var colorPickerInputArray = document.querySelectorAll(
              "input.color-input"
          );
          var red = document.getElementById("redCaptionColorSelector").value;
          var green = document.getElementById("greenCaptionColorSelector").value;
          var blue = document.getElementById("blueCaptionColorSelector").value;
          colorPickerDisplay = document.getElementById("colorCaptionDisplay");
          if (colorPickerDisplay && red && green && blue) {
              colorPickerDisplay.style.background = `rgba(${red}, ${green}, ${blue}, 1)`;
          }
          if (colorPickerInputArray && colorPickerInputArray.length > 0) {
              for (var i = 0; i < colorPickerInputArray.length; i++) {
                  colorPickerInputArray[i].addEventListener("input", function () {
                      red = document.getElementById("redCaptionColorSelector").value;
                      green = document.getElementById("greenCaptionColorSelector")
                          .value;
                      blue = document.getElementById("blueCaptionColorSelector").value;
                      colorPickerDisplay = document.getElementById(
                          "colorCaptionDisplay"
                      );
                      if (colorPickerDisplay && red && green && blue) {
                          colorPickerDisplay.style.background = `rgba(${red}, ${green}, ${blue}, 1)`;
                          currentColorRGBValues = {
                              red: red,
                              green: green,
                              blue: blue,
                              alpha: "1"
                          };
                      }
                  });
              }
          }
          currentColorRGBValues = {
              red: red,
              green: green,
              blue: blue
          };
      }

      /**
       * gets the index of the caption. Used so that captions can be indexed and for example, one caption can be edited at a time.
       * @param {*} ID ID of the DOM element representing the caption
       */
      function getCaptionIndexByID(ID) {
          for (var i = 0; i < captionArray.length; i++) {
              if (captionArray[i].id === ID) return i;
          }
          return -1;
      }

      /**
       * Draws captions to an underlying canvas
       */
      function drawCaptionsToCanvas() {
          if (activeTabIndex === 2) {
              addOverlay(base_canvas, "caption");
              var baseRect = base_canvas.getBoundingClientRect();
              var overlayRect = current_overlay_canvas.getBoundingClientRect();
              var captionCanvases = [
                  ...document.querySelectorAll(".caption-canvas")
              ].forEach(caption => {
                  var topRect = caption.getBoundingClientRect();
                  current_overlay_context.drawImage(
                      caption,
                      topRect.left - overlayRect.left,
                      topRect.top - overlayRect.top
                  );
              });
          }
      }

      /**
       * Fits the text inside the caption canvas
       * @param {*} context context of caption canvas
       * @param {*} canvas caption canvas
       * @param {*} text text to be drawn
       * @param {*} fontface font of text to be drawn
       * @param {*} yPosition y position 
       * @param {*} fillStyle fill style
       */
      function fitTextOnCanvas(
          context,
          canvas,
          text,
          fontface,
          yPosition,
          fillStyle = "rgb(255,255,255)"
      ) {
          // start with a large font size
          var fontsize = yPosition;
          context.font = fontsize - 2 + "px " + fontface;

          // draw the text
          context.shadowColor = "black";
          context.textAlign = "center";
          context.shadowBlur = 5;
          context.lineWidth = 3;
          context.strokeText(text, canvas.width / 2, fontsize);
          context.shadowBlur = 0;
          context.fillStyle = fillStyle;
          context.fillText(text, canvas.width / 2, fontsize);

          return fontsize;
      }

      /**
       * This adds an overlay to the draw area. This is crucial to the stack-like structure that allows the draw area to be manipulated in layers.
       * Every time an overlay is added the manipulation number is incremented and based on thisd manipulation number canvased can be indexed and 
       * z-indexes can be added to the CSS, among other things.
       * @param {*} baseUnderlayCanvas underlying image canvas
       * @param {*} overlayType type of overlay, 
       */
      function addOverlay(baseUnderlayCanvas, overlayType) {
          if (current_overlay_id) {
              $(`#${current_overlay_id}`).off();
          }
          $("#parent-container").append(
              `<div id="overlay-canvas-container${manipulationNumber +
            1}" class="overlay-container">
                    <canvas id="overlayCanvas${manipulationNumber +
                      1}" class="overlay-canvas" style="border:1px solid #000000;" tabindex="-1"></canvas>
                    </div>`
          );
          var overlayContainer = $(
              `#overlay-canvas-container${manipulationNumber + 1}`
          );
          overlayContainer.css({
              "z-index": (manipulationNumber + 1) * 10 + 1
          });
          current_overlay_id = `overlay-canvas-container${manipulationNumber +
          1}`;
          (current_overlay_canvas = document.getElementById(
              `overlayCanvas${manipulationNumber + 1}`
          )),
          (current_overlay_context = current_overlay_canvas.getContext("2d"));
          current_overlay_canvas.width = baseUnderlayCanvas.width;
          current_overlay_canvas.height = baseUnderlayCanvas.height;
          current_overlay_canvas.addEventListener("focus", preventFocus);
          //current_overlay_canvas.addEventListener('mousemove', getCursorPosition, false);

          overlayIDArray.push({
              ID: `overlay-canvas-container${++manipulationNumber}`,
              type: overlayType
          });
          clickX = new Array();
          clickY = new Array();
          clickDrag = new Array();
          clickColor = new Array();
          clickSize = new Array();
          eraseX = new Array();
          eraseY = new Array();
          eraseWidth = new Array();
          isOverlayChanged = false;
      }

      /**
       * Remove pointer events from all canvases effectively disabling them
       */
      function removeCanvasPointerEvents() {
          $("canvas").each(function (i, obj) {
              $(`#${obj.id}`).css({
                  "pointer-events": "none"
              });
          });
      }

      /**
       * Add pointer events to all canvases effectively enabling them
       */
      function addCanvasPointerEvents() {
          $("canvas").each(function (i, obj) {
              $(`#${obj.id}`).css({
                  "pointer-events": "auto"
              });
          });
      }

      /**
       * Remove handlers from all canvases
       */
      function removeAllHandlers() {
          $("canvas").each(function (i, obj) {
              $(`#${obj.id}`).off();
              $(`#${obj.parentElement.id}`).off();
          });
      }

      /**
       * removes the very last canvas overlay from stack
       */
      function removeLastOverlay() {
          var overlayID = overlayIDArray.pop();
          if (overlayID) {
              $(`#${overlayID}`).remove();
          }
      }

      /**
       * Removes all overlaying emoji canvas containers
       */
      function removeOverlayingEmojiCanvases() {
          $(".emoji-canvas-container").each(function () {
              $(this).remove();
          });
          emojiArray = [];
          emojiCanvasCounter = 1;
      }

      /**
       * removes all overlaying caption canvas containers
       */
      function removeOverlayingCaptionCanvases() {
          $(".caption-canvas-container").each(function () {
              $(this).remove();
          });
          captionArray = [];
          captionCanvasCounter = 1;
      }

      /**
       * Remove captions from caption array
       */
      function removeCaptionsFromArray() {
          for (let obj in overlayIDArray) {
              if (overlayIDArray[obj].type === "caption") {
                  overlayIDArray.splice(obj, 1);
              }
          }
      }