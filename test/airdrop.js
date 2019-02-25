const chai = require("chai");
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
chai.should();

const AirDrop = artifacts.require("AirDrop");
const TestToken = artifacts.require("TestToken");
const FreezableMintableToken = artifacts.require("FreezableMintableToken");
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

    const consumer = async (record) => {
        const address = record[0];
        const value = record[1];
        parser.pause();
        console.log('check balance', address, ' must be:', value);
        const balance = await token.balanceOf(address);
        console.log('got balance',balance);
        parser.resume();
    };

    await new Promise((resolve, reject) => {
        fs.pipe(parser)
            .on('data', consumer)
            .on('end', resolve)
            .on('error', reject);
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

const calculateTokens = async (fs) => {
    const parser = csv.parse({
        headers: false,
        from: 2,
        trim: true
    });


    let thisSum = 0;
    let count = 0;

    const consumer = (record) => {
        const value = record[1];
        count ++;
        thisSum += Number(value);
    };

    await new Promise((resolve, reject) => {
        fs.pipe(parser)
            .on('data', consumer)
            .on('end', resolve)
            .on('error', reject);
    })
    return thisSum;
}


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


contract("AirDrop", function (accounts) {
    const OWNER = accounts[0];
    const stream = fs.createReadStream('test/test.csv');
    const parser = csv.parse({headers: true});

    const createToken = async() => {
        const token = await TestToken.new();
        // await token.mint(OWNER, web3.toWei(100000));
        return token;
    };

    const createFreezableToken = async() => {
        const freezableToken = await FreezableMintableToken.new();
        await freezableToken.mint(OWNER, web3.toWei(100000));
        return freezableToken;
    }

    const createAirDrop = async(tokenContract, tokenAmount) => {
        const token = await createToken();
        const airdrop = await AirDrop.new(OWNER, token.address);
        await token.mint(airdrop.address, web3.toWei(tokenAmount));
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
        console.log('Total sum of tokens');
        const streamForSum = fs.createReadStream('test/test.csv');
        const tokenAmount = await calculateTokens(streamForSum);
        console.log(tokenAmount);

        const token = await createToken();
        const contract = await createAirDrop(token, tokenAmount);
        const stream = fs.createReadStream('test/test.csv');

        console.log('Send generated stream');
        await createMapAndSend(stream, contract);
        console.log('Check balance');
        const streamForCheck = fs.createReadStream('test/test.csv');
        await checkAll(streamForCheck, token);
    })

    it("transfer token and freeze", async () => {
        console.log('Total sum of tokens');
        const streamForSum = fs.createReadStream('test/test.csv');
        const tokenAmount = await calculateTokens(streamForSum);
        console.log(tokenAmount);

        const freezableToken = await createFreezableToken();

        const contract = await createAirDrop(freezableToken, tokenAmount);
        const stream = fs.createReadStream('test/test.csv');


        console.log('Send generated stream');
        await createMapAndSend(stream, contract);
        console.log('Check balance');
        const streamForCheck = fs.createReadStream('test/test.csv');
        await checkAll(streamForCheck, freezableToken);

    })
});
