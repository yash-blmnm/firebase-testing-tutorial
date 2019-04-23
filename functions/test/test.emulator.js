// You can run these unit tests by running "npm test" inside the uppercase/functions directory.

// Chai is a commonly used library for creating unit test suites. It is easily extended with plugins.
const chai = require('chai');
const assert = chai.assert;

// Sinon is a library used for mocking or verifying function calls in JavaScript.
const sinon = require('sinon');

// Require firebase-admin so we can stub out some of its methods.
const admin = require('firebase-admin');
// Require and initialize firebase-functions-test. Since we are not passing in any parameters, it will
// be initialized in an "offline mode", which means we have to stub out all the methods that interact
// with Firebase services.
const test = require('firebase-functions-test')();

/** Using firebase realtime database emulator in order to testing using local database */
const firebase = require('@firebase/testing');

/** Initializing the app using local database emulator */
function adminApp() {
  const databaseName = "database-emulator-example";
  // Use this to create an app authenticated as an admin to set up state for tests.
  // Returns an initialized admin firebase app corresponding to the database name specified in options. 
  // This app bypasses security rules when reading and writing to the database.
  return firebase.initializeAdminApp({ databaseName }).database();
}

describe('Cloud Functions', () => {
    let myFunctions;

    before(() => {
        // Now we can require index.js and save the exports inside a namespace called myFunctions.
        myFunctions = require('../index');
    });

    after(() => {
        // Do other cleanup tasks.
        test.cleanup();
    });

    describe('makeUpperCase - method two', () => {
        let databaseRef;
        before(async () => {
            databaseRef = adminApp();
            //Stub initial data into local database emulator
            await databaseRef.ref('test-messages').set({
                "msgid1" : {
                    "original" : "hello"
                }
            });
        });
        after(async () => {
            //reset the local database values
            await adminApp().ref().set(null);
        });
        it('should read input and write it to /uppercase', async () => {
            const testData = await databaseRef.ref("test-messages/msgid1").once('value');
            const wrapped = test.wrap(myFunctions.makeUppercase);
            // Using @firebase/testing methods for assertion
            firebase.assertSucceeds(wrapped(testData, {params: {pushId: "msgid1"}}));
            const resData = await databaseRef.ref("test-messages/msgid1/uppercase").once('value');
            // Insacting the local database for updated value and asserting it equal to required value
            return assert.equal(resData.val(), "HELLO");
        })
        // Test case where uppercase opertion does not happen
        it('should read input return false if null or empty input value', async () => {
            await adminApp().ref('test-messages/msgid1').update({original : null});
            const testData = await adminApp().ref("test-messages/msgid1/original").once('value');
            const wrapped = test.wrap(myFunctions.makeUppercase);
            return assert.equal(await wrapped(testData), false);
        })
    });

    describe('addMessage', () => {
        let oldDatabase
        before(async () => {
        const database = await adminApp();
        // Save the old database method so it can be restored after the test.
        oldDatabase = admin.database
        //set database property of admin to the database returned from emulator
        Object.defineProperty(admin, 'database', { get: () => database });
        });
        after(async () => {
        // Restoring admin.database() to the original method.
        admin.database = oldDatabase;
        //reset the local database values
        await adminApp().ref().set(null);
        });
        it('should return a 303 redirect', (done) => {
        // A fake request object, with req.query.text set to 'input'
        const req = { query: {text: 'input'} };
        const databaseURL = 'http://localhost:9000';
        // A fake response object, with a stubbed redirect function which does some assertions
        const res = {
            redirect: (code, url) => {
            // Assert code is 303
            assert.equal(code, 303);
            // If the database push is successful, then the URL sent back will have the following format:
            const expectedRef = new RegExp(databaseURL + '/test-messages/');
            assert.isTrue(expectedRef.test(url));
            done();
            }
        };

        // Invoke addMessage with our fake request and response objects. This will cause the
        // assertions in the response object to be evaluated.
        myFunctions.addMessage(req, res);
        });
    });
})
