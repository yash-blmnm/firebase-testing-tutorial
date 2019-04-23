const functions = require('firebase-functions');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

//Example for HTTP cloud function
exports.addMessage = functions.https.onRequest(async (req, res) => {
    const original = req.query.text;
    const snapshot = await admin.database.ref('/test-messages').push({original: original});
    res.redirect(303, snapshot.ref.toString());
});


//Example for background cloud Function
exports.makeUppercase = functions.database.ref('/test-messages/{pushId}').onCreate(async (snapshot, context) => {
    const original = snapshot.child(original);
    if (original.exists()){
        console.log('Uppercasing', context.params.pushId, original.val());
        const uppercase = original.val().toUpperCase();
        return snapshot.update({uppercase});
    }else {
        console.log("The original value is not a valid property");
        return false;
    }
});