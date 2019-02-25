const ganache = require('ganache-core');

const ganacheConfig = () => {
    return {
        network_id: "5777",
        provider: ganache.provider({
            accounts: [10, 100, 10000, 1000000, 1, 0].map(function (v) {
                return {balance: "" + v + "000000000000000000"};
            }),
            mnemonic: "mywish",
            time: new Date("2017-10-10T15:00:00Z"),
            debug: false
            // ,logger: console
        })
    };
};


module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // to customize your Truffle configuration!
    networks: {
        ganache: ganacheConfig(),
        ropsten: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "*",
            from: "0x00FA471505197bf0D2B840d131600bd76b1bf19d"
        }
    },
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    },
    network: 'ganache',
    mocha: {
        bail: true,
        fullTrace: true,
    }
};
