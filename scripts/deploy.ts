import { readFile, writeFile } from "node:fs/promises";
import { access, constants, mkdir } from "node:fs";

import { ethers, network } from "hardhat";
const LZ_ENDPOINTS = require("../constants/layerzeroEndpoints.json");

const isFileExist = (path: string) => {
  return new Promise((resolve, reject) => {
    access(path, constants.F_OK, (err) => {
      if (err) return resolve(false);
      resolve(true);
    });
  });
};

async function main() {
  const NFT = await ethers.getContractFactory("NFT");

  const lzEndpointAddress = LZ_ENDPOINTS[network.name];
  console.log(`[${network.name}] Endpoint Address: ${lzEndpointAddress}`);

  const nft = await NFT.deploy(lzEndpointAddress);
  await nft.deployed();

  console.log("NFT got deployed at ", nft.address);

  const path = "./scripts/crosschain/artifacts";

  if (!(await isFileExist(`${path}`))) {
    await new Promise((resolve, reject) => {
      mkdir(path, { recursive: true }, (err) => {
        if (err) return reject("erro while creating dir");
        resolve("created");
      });
    });
  }

  if (!(await isFileExist(`${path}/deploy.json`))) {
    await writeFile(`${path}/deploy.json`, "{}");
  }

  const prevDetails = await readFile(
    "./scripts/crosschain/artifacts/deploy.json",
    {
      encoding: "utf8",
    }
  );

  const prevDetailsJson: { [network: string]: string } = await JSON.parse(
    prevDetails
  );
  let newDeployData = { ...prevDetailsJson, [network.name]: nft.address };
  await writeFile(`${path}/deploy.json`, JSON.stringify(newDeployData));
  console.log("Deploy file updated successfully!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
