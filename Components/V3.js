const fs = require('fs');

// Read the OldData JSON file
const oldData = JSON.parse(fs.readFileSync('OldData.json', 'utf8'));

// Read the NewData JSON file
const newData = JSON.parse(fs.readFileSync('NewData.json', 'utf8'));

// Iterate over the objects in the NewData file
for (const newObject of newData) {
    // Check if the object exists in the OldData file
    const oldObject = oldData.find(obj => obj.pair === newObject.pair);
    if (oldObject) {
        // The object exists in both files. Check if the size has changed.
        if (oldObject.size !== newObject.size) {
            console.log(`Size has changed for pair ${newObject.pair}. Old size: ${oldObject.size}, new size: ${newObject.size}`);
        }
    } else {
        // The object does not exist in the OldData file.
        console.log(`Object with pair ${newObject.pair} does not exist in OldData.json`);
    }
}

// Iterate over the objects in the OldData file
for (const oldObject of oldData) {
    // Check if the object exists in the NewData file
    const newObject = newData.find(obj => obj.pair === oldObject.pair);
    if (!newObject) {
        // The object does not exist in the NewData file.
        console.log(`Object with pair ${oldObject.pair} does not exist in NewData.json`);
    }
}
