// airdrop contract address
const airDropAddress = "0x259e2377D2Bf94B30c2E6D4660B1Ec5712f18207";
// token address
const tokenAddress = "0x9cFdd4B350033e067186002FBfF0A64Ed96efdBD";
// management address
const fromAddress = "0x00FA471505197bf0D2B840d131600bd76b1bf19d";


const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
const AirDrop = require('build/contracts/AirDrop.json');
const ERC20 = require('build/contracts/ERC20.json');
const airDrop = web3.eth.contract(AirDrop.abi).at(airDropAddress);
const token = web3.eth.contract(ERC20.abi).at(tokenAddress);

