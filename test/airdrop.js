const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

const AirDrop = artifacts.require("AirDrop");
const TestToken = artifacts.require("TestToken");
const csv = require('csv');
const fs = require("fs");
const stringify = require('csv-stringify');
const transform = require('stream-transform');

const checkAll = async (fs, token) => {
    const map = {};
    const parser = csv.parse({
        headers: true,
        from: 2,
        trim: true
    });
    await new Promise((resolve, reject) => {
        parser.on('finish', resolve)
            .on('error', reject);
        fs.pipe(parser)
            .on('data', (record) => {
                const address = record[0];
                const value = record[1];
                console.log('check balance', address, ' must be:', value);

                /***
                if (map[address]) {
                    console.log("Reject!");
                    parser.end();
                    return reject(new Error("duplicate detected: " + address + ", first line: " + map[address] + ", duplicate at line: " + parser.count));
                }
                map[address] = parser.count;
                ***/

                parser.pause();
                token.balanceOf(address)
                    .then(balance => {
                        console.log('got balance', address, balance);
                        /***
                        if (Number(balance) !== 0) {
                            console.log("Reject!");
                            parser.end();
                            return reject(new Error("balance is not 0 for address " + address + ", it is " + balance));
                        }
                       / ***/
                        parser.resume();
                    });

            });
    })
};

const createMapAndSend = async(fs, airdrop) => {
    const parser = csv.parse({
        headers: true,
        from: 2,
        trim: true
    });
    let toSend = {};
    let count = 0;
    const consumer = (record) => {
        const address = record[0];
        const value = record[1];
        console.log("address:", address, ', value:', value);

        toSend[address] = value;
        count ++;
        console.log("collect " + count);
    };

    await new Promise((resolve, reject) => {
       // parser.on('finish', resolve)
       //     .on('error', reject);
        fs.pipe(parser)
            .on('data', consumer)
            .on('end', () => sendAll(toSend, airdrop)
                .then(tx => {console.log("tx received", tx)}
            ).then(resolve))
            .on('error', reject);
    })
};

const sendAll = async (map, airDrop) => {
    const addresses = [];
    const values = [];
    Object.keys(map)
        .forEach(k => {
            addresses.push(k);
            let value = web3.toWei(map[k]);
            values.push(value);
        });
    const tx = await airDrop.transfer(addresses, values);
    return tx.receipt.transactionHash;
};


const getSent = async (fs) => {
    const parser = csv.parse({
        headers: false,
        from: 1,
        trim: true
    });


    const sent = {};

    const consumer = (record) => {
        const address = record[0];
        const hash = record[1];

        sent[address] = hash;
    };

    await new Promise((resolve, reject) => {
        // parser.on('finish', resolve)
        //     .on('error', reject);
        fs.pipe(parser)
            .on('data', consumer)
            .on('end', resolve)
            .on('error', reject);
    });

    return sent;
};

const bulkSender = async(fs, sent, airdrop) => {
    const parser = csv.parse({
        headers: true,
        from: 2,
        trim: true
    });

    const BULK = 3;
    let toSend = {};
    let count = 0;

    const consumer = (record) => {
        const address = record[0];
        const value = record[1];
        console.log("address:", address, ', value:', value);

        if (count < BULK) {
            // check already sent
            if (sent[address]) {
                console.info("skip:", address, ", hash:", sent[address]);
                return;
            }

            toSend[address] = value;
            count ++;
            console.log("collect " + count);
        }
        else if (count === BULK) {
            console.log("pause and send all");
            parser.pause();
            sendAll(toSend, airdrop)
                .then(tx => {
                    console.log("tx received", tx);
                    count = 0;
                    toSend = {};
                    parser.resume();
                })
                .catch(error => {
                    throw error;
                });
        }
        else {
            console.error("count > BULK, pause does not work");
            throw new Error("error!");
        }

    };

    await new Promise((resolve, reject) => {
        // parser.on('finish', resolve)
        //     .on('error', reject);
        fs.pipe(parser)
            .on('data', consumer)
            .on('end', () => sendAll(toSend, airdrop).then(resolve))
            .on('error', reject);
    })

};


contract("AirDrop", function (accounts) {
    const OWNER = accounts[0];
    const stream = fs.createReadStream('test/test.csv');
    const parser = csv.parse({headers: true});

    const createToken = async() => {
        const token = await TestToken.new();
        // await token.mint(OWNER, web3.toWei(100000));
        return token;
    };

    const createAirDrop = async() => {
        const token = await createToken();
        const airdrop = await AirDrop.new(OWNER, token.address);
        await token.mint(airdrop.address, web3.toWei(100000));
        return airdrop;
    };

    it("walk through", async () => {
        await new Promise(resolve => {
            stream
                .on('end', resolve)
                .pipe(parser, {end: true})
                .pipe(transform((record, callback) => {
                    callback(null, record.join(' ') + '\n');
                }))
                .pipe(process.stdout);
        });
    });


    it("create map, send to all and check balance", async () => {
        const contract = await createAirDrop();
        const tokenAddr = await contract.token();
        const token = await TestToken.at(tokenAddr);
        const stream = fs.createReadStream('test/test.csv');
        console.log('Send generated stream');
        await createMapAndSend(stream, contract);
        console.log('Check balance');
        const streamForCheck = fs.createReadStream('test/test.csv');
        await checkAll(streamForCheck, token);
    })
});
