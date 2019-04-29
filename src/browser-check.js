console.log('You are using ' + bowser.name +
    ' v' + bowser.version +
    ' on ' + bowser.osname)

    /**
     * Display a modal and block any action for unsupported browsers
     */
if (!(bowser.name.match(/Edge/) || bowser.name.match(/Firefox/) || bowser.name.match(/Chrome/) || bowser.name.match(/Safari/))) {
    var div = document.querySelector('body');
    var newElement = document.createElement('div');
    newElement.setAttribute('id', 'browser-overlay');
    newElement.innerHTML = '';
    div.appendChild(newElement);
    $('body').append("<div id='browser-warning-modal' class='warning-modal'><div class='warning-modal-content'><div class='warning-modal-header'><span class='close'>&times;</span>" +
            "<h2>Unsupported Browser!</h2></div><div class='warning-modal-body'><p>You should use the latest version of Chrome, Firefox, Safari or Microsoft Edge</p>" +
            "</div></div></div>");
}