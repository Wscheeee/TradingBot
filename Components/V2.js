const oldData = require('./OldData.json');
const newData = require('./NewData.json');

const oldDataMap = new Map();
for (const oldDatum of oldData) {
    oldDataMap.set(oldDatum.pair, oldDatum);
}

for (const newDatum of newData) {
    const oldDatum = oldDataMap.get(newDatum.pair);
    if (oldDatum) {
        // The object still exists in both the old and new data
        if (oldDatum.size !== newDatum.size) {
            // The size has changed
            console.log(`Size of ${newDatum.pair} has changed from ${oldDatum.size} to ${newDatum.size}`);
        }
    } else {
        // The object does not exist in the old data, it is new
        console.log(`New object: ${newDatum.pair}`);
    }
}

for (const [pair, oldDatum] of oldDataMap) {
    console.log(`Object ${pair} no longer exists`);
}
console.log(oldDataMap)
