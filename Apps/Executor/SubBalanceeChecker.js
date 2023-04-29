


const calculateCapital = async () => {
    try {

        //Calculate the actual balances and the correct balances :

        // traders Collection format :
        //sub_name: 'sub_1'
        //trader_uid: 'traderUID'
        //weight: '0.1'

        //retrieve the weights
        const accounts = await db.collection("traders").find({}).toArray();

        // Calculate the total actual balance :
        //totalBalance = masterBalance + subOneBalance + subTwoBalance...

        // TODO!! Find master balance :
        // TODO!! retrieve master api keys in Users Collection
        // TODO!! use method Get Single Coin Balance for master account
        // TODO!! const masterBalance =
        // TODO!! add master account to accounts array:
        accounts.push({
            sub_name: "master",
            weight: 0,
            balance: masterBalance,
            desiredBalance: 0,
        });
        //Calculate the total capital for the sub accounts :
        let totalAccountsBalance = 0;
        for (const account of accounts) {

            // Retrieve the sub accounts balances :
            // TODO!! retrieve each sub accounts api keys in SubAccounts Collection using sub_name
            // TODO!! use method Get Single Coin Balance for each sub accounts
            // TODO!! const accountBalance = 
            account.balance = accountBalance;

            totalAccountsBalance += accountBalance;
        }
        c;
        // Retrieve the weight of each trader and calculate the correct capital for each account
        for (const account of accounts) {
            const weight = account.weight;
            account.desiredBalance = totalAccountsBalance * weight;

            // Calculate the difference between current and desired balances
            account.difference = account.balance - account.desiredBalance;
        }

        // Make the adjustments :
        // Check if any account has a difference greater than 5%
        let adjustmentNeeded = false;
        for (const account of accounts) {
            const percentageDifference = Math.abs(account.difference / account.balance) * 100;

            if (percentageDifference > 5) {
                adjustmentNeeded = true;
                break;
            }
        }

        if (adjustmentNeeded) {
            // Make the adjustments:
            for (let i = 0; i < accounts.length; i++) {
                const accountA = accounts[i];

                for (let j = 0; j < accounts.length; j++) {
                    if (i === j) {
                        continue;
                    }

                    const accountB = accounts[j];

                    if (accountA.difference > 0 && accountB.difference < 0) {
                        const transferAmount = Math.min(accountA.difference, Math.abs(accountB.difference));

                        // TODO!! Transfer the difference from accountA to accountB
                        // TODO!! Implement the logic for transferring the funds between the accounts using the API

                        // Update the account balances and differences
                        accountA.balance -= transferAmount;
                        accountB.balance += transferAmount;

                        accountA.difference -= transferAmount;
                        accountB.difference += transferAmount;
                    }
                }
            }
        }

    } catch (error) {
        console.error("Error", error);
    } finally {
        await client.close();
    }
};


calculateCapital();