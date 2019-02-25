const TestToken = artifacts.require("./TestToken.sol");
const FreezableMintableToken = artifacts.require("FreezableMintableToken");
const AirDrop = artifacts.require("./AirDrop.sol");

module.exports = function (deployer) {
    return deployer.deploy(FreezableMintableToken)
        .then(token => {
            return deployer.deploy(AirDrop, "0x00FA471505197bf0D2B840d131600bd76b1bf19d", token.address);
        })
};
