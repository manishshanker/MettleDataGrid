//require https://cdn.firebase.com/v0/firebase.js
window.FB = {};

(function () {
    "use strict";

    FB.WebSocketService = function (options) {

        var myDataRef;

        function sendUpdateChild(parent, data) {
            var i, l, parents = parent.split(".");
            var node = myDataRef;
            for (i = 0, l = parents.length; i < l; i++) {
                node = node.child(parents[i]);
            }
            node.update(data);
        }

        function sendUpdate(data) {
            myDataRef.update(data);
        }

        function doConnect() {
            myDataRef = new Firebase('https://ms-project-data.firebaseio.com/');

            myDataRef.once('value', function (snapshot) {
                options.onLoaded(snapshot);
            });

            myDataRef.on('child_changed', function (newSnapshot, oldSnapshot) {
                var message = newSnapshot.val();
                options.onTick(message);
            });
        }

        return {
            connect: doConnect,
            publish: sendUpdate,
            publishChild: sendUpdateChild
        };
    };

}());