import fs from "fs";
import { ethers, network } from "hardhat";
import LZ_ENDPOINTS from "../../constants/layerzeroEndpoints.json";

const path = "./scripts/crosschain/artifacts";
async function main() {
  const NFT = await ethers.getContractFactory("NFT");

  if (!fs.existsSync(path)) {
    // if artifacts folder not exist create it
    fs.mkdirSync(path);
  }

  // we need to deploy nfts to two different chain, eth goerli and fuji

  return;
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
