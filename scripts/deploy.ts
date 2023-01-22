import { ethers, network } from "hardhat";
const LZ_ENDPOINTS = require("../constants/layerzeroEndpoints.json");

async function main() {
  const NFT = await ethers.getContractFactory("NFT");

  const lzEndpointAddress = LZ_ENDPOINTS[network.name];
  console.log(`[${network.name}] Endpoint Address: ${lzEndpointAddress}`);

  const nft = await NFT.deploy(lzEndpointAddress);
  await nft.deployed();

  console.log("NFT got deployed at ", nft.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
